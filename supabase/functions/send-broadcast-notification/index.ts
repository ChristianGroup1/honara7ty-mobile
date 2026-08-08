import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64UrlEncode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function stringToBase64Url(value: string) {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function pemToArrayBuffer(pem: string) {
  let normalizedPem = pem.trim();

  if (
    (normalizedPem.startsWith('"') && normalizedPem.endsWith('"')) ||
    (normalizedPem.startsWith("'") && normalizedPem.endsWith("'"))
  ) {
    normalizedPem = normalizedPem.slice(1, -1);
  }

  if (normalizedPem.startsWith('{')) {
    const parsed = JSON.parse(normalizedPem);
    normalizedPem = parsed.private_key;
  }

  normalizedPem = normalizedPem.replace(/\\n/g, '\n').trim();

  const match = normalizedPem.match(
    /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/,
  );

  if (!match?.[0]) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY format');
  }

  const base64 = match[0]
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getFcmAccessToken() {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Firebase service account secrets');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsignedJwt = `${stringToBase64Url(JSON.stringify(header))}.${stringToBase64Url(
    JSON.stringify(claim),
  )}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt),
  );
  const jwt = `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch FCM access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

// FCM error codes that indicate a permanently invalid/stale token
const STALE_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
  'UNREGISTERED',
  'INVALID_ARGUMENT',
]);

// Returns: { success: boolean; stale: boolean; errorDetail?: string }
async function sendFcmMessage(params: {
  accessToken: string;
  token: string;
  title: string;
  body: string;
}): Promise<{ success: boolean; stale: boolean; errorDetail?: string }> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  if (!projectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID');
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: params.token,
          notification: {
            title: params.title,
            body: params.body,
          },
          data: {
            kind: 'admin_broadcast',
          },
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'devotion_reminder',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        },
      }),
    },
  );

  if (response.ok) {
    return { success: true, stale: false };
  }

  // Parse the error to detect stale tokens
  let errorDetail = `HTTP ${response.status}`;
  let stale = false;
  try {
    const errorBody = await response.json();
    const status = errorBody?.error?.status ?? '';
    const details = errorBody?.error?.details ?? [];
    const errorCode =
      details.find(
        (d: Record<string, unknown>) => d['@type']?.toString().includes('ErrorInfo'),
      )?.reason ?? status;

    errorDetail = errorCode || errorBody?.error?.message || errorDetail;
    stale =
      status === 'INVALID_ARGUMENT' ||
      status === 'UNREGISTERED' ||
      STALE_ERROR_CODES.has(errorCode);
  } catch {
    // ignore JSON parse errors
  }

  return { success: false, stale, errorDetail };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase environment' }, 500);
    }

    // Verify caller is an admin
    const authHeader = request.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Confirm admin_users membership
    const { data: adminRow, error: adminError } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      return jsonResponse({ error: 'Forbidden – admin only' }, 403);
    }

    // Parse the body
    const { title, body } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return jsonResponse({ error: 'title is required' }, 400);
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return jsonResponse({ error: 'body is required' }, 400);
    }

    // ── Count total users (to compute no_token_users) ──────────────────────
    // We use auth.users count via admin client RPC or just count profiles
    const { count: totalUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // ── Get all push tokens ───────────────────────────────────────────────
    const { data: tokens, error: tokensError } = await adminClient
      .from('user_push_tokens')
      .select('user_id, token');

    if (tokensError) {
      throw tokensError;
    }

    const tokenList = tokens ?? [];
    const totalTokens = tokenList.length;

    if (totalTokens === 0) {
      await adminClient.from('notification_broadcasts').insert({
        admin_id: user.id,
        title: title.trim(),
        body: body.trim(),
        total_tokens: 0,
        sent: 0,
        failed: 0,
        stale_removed: 0,
        no_token_users: totalUsers ?? 0,
      });
      return jsonResponse({
        sent: 0,
        failed: 0,
        total: 0,
        stale_removed: 0,
        no_token_users: totalUsers ?? 0,
      });
    }

    const accessToken = await getFcmAccessToken();
    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    // Track per-user results: { user_id, status }
    const recipientResults: { user_id: string; status: 'sent' | 'failed' | 'stale' }[] = [];

    // Send in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < tokenList.length; i += BATCH_SIZE) {
      const batch = tokenList.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async tokenRow => {
          const result = await sendFcmMessage({
            accessToken,
            token: tokenRow.token as string,
            title: title.trim(),
            body: body.trim(),
          });

          const userId = tokenRow.user_id as string;

          if (result.success) {
            sent += 1;
            return { user_id: userId, status: 'sent' as const };
          } else {
            failed += 1;
            if (result.stale) {
              staleTokens.push(tokenRow.token as string);
              console.error(
                `FCM stale token ${(tokenRow.token as string).slice(0, 12)}... — ${result.errorDetail}`,
              );
              return { user_id: userId, status: 'stale' as const };
            }
            console.error(
              `FCM failed for token ${(tokenRow.token as string).slice(0, 12)}... — ${result.errorDetail}`,
            );
            return { user_id: userId, status: 'failed' as const };
          }
        }),
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          recipientResults.push(r.value);
        }
      }
    }

    // ── Delete stale tokens ───────────────────────────────────────────────
    if (staleTokens.length > 0) {
      const { error: deleteError } = await adminClient
        .from('user_push_tokens')
        .delete()
        .in('token', staleTokens);

      if (deleteError) {
        console.error('Failed to delete stale tokens:', deleteError);
      }
    }

    // ── Log the broadcast ─────────────────────────────────────────────────
    const noTokenUsers = Math.max(0, (totalUsers ?? 0) - totalTokens);
    const realFailed = failed - staleTokens.length;

    const { data: broadcastRow } = await adminClient
      .from('notification_broadcasts')
      .insert({
        admin_id: user.id,
        title: title.trim(),
        body: body.trim(),
        total_tokens: totalTokens,
        sent,
        failed: realFailed,
        stale_removed: staleTokens.length,
        no_token_users: noTokenUsers,
      })
      .select('id')
      .single();

    // ── Insert per-user recipient records ────────────────────────────────
    if (broadcastRow?.id && recipientResults.length > 0) {
      const rows = recipientResults.map(r => ({
        broadcast_id: broadcastRow.id,
        user_id: r.user_id,
        status: r.status,
      }));

      // Insert in chunks of 500 to stay within request limits
      const INSERT_CHUNK = 500;
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        await adminClient
          .from('notification_broadcast_recipients')
          .insert(rows.slice(i, i + INSERT_CHUNK));
      }
    }

    return jsonResponse({
      broadcast_id: broadcastRow?.id ?? null,
      sent,
      failed: realFailed,
      total: totalTokens,
      stale_removed: staleTokens.length,
      no_token_users: noTokenUsers,
      total_users: totalUsers ?? 0,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
