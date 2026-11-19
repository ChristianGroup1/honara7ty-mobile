import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_TTL_SECONDS = 3600;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function r2Config() {
  return {
    accountId: requireEnv('R2_ACCOUNT_ID'),
    bucket: Deno.env.get('R2_BUCKET')?.trim() || 'voice-recordings',
    client: new AwsClient({
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      service: 's3',
      region: 'auto',
    }),
  };
}

function objectUrl(accountId: string, bucket: string, key: string) {
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${
    key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')
  }`;
}

function isOwnedKey(userId: string, key: string) {
  return key === userId || key.startsWith(`${userId}/`);
}

function decodeBase64(data: string): Uint8Array {
  const cleaned = data.includes(',') ? data.split(',').pop()! : data;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonKey = requireEnv('SUPABASE_ANON_KEY');
    const authorization = request.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body: {
      action?: string;
      key?: string;
      contentType?: string;
      expiresIn?: number;
      data?: string;
    };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const action = (body.action || 'upload').toLowerCase();
    const contentType = body.contentType || 'audio/mp4';
    let key = (body.key || '').trim().replace(/^\/+/, '');

    // Primary path: Edge Function uploads bytes to R2 with server credentials.
    if (action === 'put') {
      if (!body.data) {
        return jsonResponse({ error: 'Missing data' }, 400);
      }
      if (!key) key = `${user.id}/${Date.now()}.m4a`;
      if (!isOwnedKey(user.id, key)) {
        return jsonResponse({ error: 'Invalid upload key' }, 403);
      }

      const bytes = decodeBase64(body.data);
      if (bytes.byteLength === 0) {
        return jsonResponse({ error: 'Empty audio payload' }, 400);
      }
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        return jsonResponse({ error: 'Audio too large' }, 413);
      }

      const { accountId, bucket, client } = r2Config();
      const target = objectUrl(accountId, bucket, key);
      const putResponse = await client.fetch(target, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: bytes,
      });

      if (!putResponse.ok) {
        const detail = await putResponse.text();
        console.error('R2 PUT failed', putResponse.status, detail);
        return jsonResponse(
          {
            error: 'R2 upload failed',
            status: putResponse.status,
            detail: detail.slice(0, 500),
            bucket,
            key,
          },
          502,
        );
      }

      return jsonResponse({
        ok: true,
        action: 'put',
        key,
        bucket,
        bytes: bytes.byteLength,
      });
    }

    // Signed URL path (download / optional client upload).
    if (!key) {
      if (action !== 'upload') {
        return jsonResponse({ error: 'Missing key' }, 400);
      }
      key = `${user.id}/${Date.now()}.m4a`;
    }
    if (!isOwnedKey(user.id, key)) {
      return jsonResponse({ error: 'Invalid key' }, 403);
    }

    const expiresIn = Math.min(
      Math.max(Number(body.expiresIn) || DEFAULT_TTL_SECONDS, 60),
      3600,
    );
    const method = action === 'download' ? 'GET' : 'PUT';
    const { accountId, bucket, client } = r2Config();
    const url = new URL(objectUrl(accountId, bucket, key));
    url.searchParams.set('X-Amz-Expires', String(expiresIn));
    const signed = await client.sign(new Request(url.toString(), { method }), {
      aws: { signQuery: true },
    });

    return jsonResponse({
      ok: true,
      action: method === 'GET' ? 'download' : 'upload',
      key,
      bucket,
      uploadUrl: method === 'PUT' ? signed.url : undefined,
      downloadUrl: method === 'GET' ? signed.url : undefined,
      contentType: method === 'PUT' ? contentType : undefined,
      expiresIn,
      maxBytes: MAX_UPLOAD_BYTES,
    });
  } catch (error) {
    console.error('voice-r2-sign failed', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Signing failed',
      },
      500,
    );
  }
});
