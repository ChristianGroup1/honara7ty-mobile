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
    /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/,
  );

  if (!match?.[1]) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY format');
  }

  const base64 = match[1].replace(/\s/g, '');
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

async function sendFcmMessage(params: {
  accessToken: string;
  token: string;
  title: string;
  body: string;
  groupId: string;
}) {
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
            kind: 'devotion_group_reminder',
            group_id: params.groupId,
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

  if (!response.ok) {
    throw new Error(`FCM send failed: ${response.status}`);
  }
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

    const { groupId, message } = await request.json();
    if (!groupId || typeof groupId !== 'string') {
      return jsonResponse({ error: 'groupId is required' }, 400);
    }

    const reminderMessage =
      typeof message === 'string' && message.trim()
        ? message.trim()
        : 'فاكر خلوة النهارده؟ مستنيين نشوف قرأت في إيه.';

    const { data: leaderRow, error: leaderError } = await adminClient
      .from('devotion_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (
      leaderError ||
      !leaderRow ||
      !['owner', 'leader'].includes(leaderRow.role)
    ) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: members, error: membersError } = await adminClient
      .from('devotion_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', user.id);

    if (membersError) {
      throw membersError;
    }

    const memberIds = (members ?? []).map(member => member.user_id as string);
    if (!memberIds.length) {
      return jsonResponse({ sent: 0, skipped: 0 });
    }

    const { data: logs, error: logsError } = await adminClient
      .from('devotion_log')
      .select('user_id, completed')
      .eq('date', today)
      .in('user_id', memberIds);

    if (logsError) {
      throw logsError;
    }

    const completedUserIds = new Set(
      (logs ?? [])
        .filter(log => log.completed)
        .map(log => log.user_id as string),
    );
    const pendingUserIds = memberIds.filter(
      memberId => !completedUserIds.has(memberId),
    );

    if (!pendingUserIds.length) {
      return jsonResponse({ sent: 0, skipped: memberIds.length });
    }

    const { data: tokens, error: tokensError } = await adminClient
      .from('user_push_tokens')
      .select('user_id, token')
      .in('user_id', pendingUserIds);

    if (tokensError) {
      throw tokensError;
    }

    const accessToken = await getFcmAccessToken();
    let sent = 0;
    let failed = 0;
    const tokenUserIds = new Set(
      (tokens ?? []).map(tokenRow => tokenRow.user_id as string),
    );
    const missingTokens = pendingUserIds.filter(
      pendingUserId => !tokenUserIds.has(pendingUserId),
    ).length;

    for (const tokenRow of tokens ?? []) {
      try {
        await sendFcmMessage({
          accessToken,
          token: tokenRow.token as string,
          title: 'تذكير خلوة الجروب',
          body: reminderMessage,
          groupId,
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error('Failed to send FCM message', error);
      }
    }

    const reminderRows = pendingUserIds.map(recipientId => ({
      group_id: groupId,
      sender_id: user.id,
      recipient_id: recipientId,
      message: reminderMessage,
    }));

    await adminClient.from('devotion_group_reminders').insert(reminderRows);
    await adminClient
      .from('devotion_group_members')
      .update({ last_reminded_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .in('user_id', pendingUserIds);

    return jsonResponse({
      sent,
      failed,
      pending: pendingUserIds.length,
      missingTokens,
      skipped: memberIds.length - pendingUserIds.length,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
