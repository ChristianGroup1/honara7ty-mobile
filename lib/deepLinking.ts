import supabase from './supbase';

const oauthCallbackInFlight = new Map<string, Promise<boolean>>();
const oauthCallbackResultCache = new Map<string, boolean>();
const MAX_CACHED_OAUTH_CALLBACKS = 10;

function cacheOAuthCallbackResult(url: string, result: boolean) {
  oauthCallbackResultCache.delete(url);
  oauthCallbackResultCache.set(url, result);

  if (oauthCallbackResultCache.size <= MAX_CACHED_OAUTH_CALLBACKS) {
    return;
  }

  const oldestKey = oauthCallbackResultCache.keys().next().value;
  if (oldestKey) {
    oauthCallbackResultCache.delete(oldestKey);
  }
}

export function parseFragment(fragment: string): Record<string, string> {
  const result: Record<string, string> = {};

  fragment.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      result[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(
        pair.slice(idx + 1),
      );
    }
  });

  return result;
}

function parseQueryString(url: string): Record<string, string> {
  try {
    const parsedUrl = new URL(url);
    const result: Record<string, string> = {};
    for (const [key, value] of Array.from(parsedUrl.searchParams)) {
      result[key] = value;
    }

    return result;
  } catch {
    const questionIndex = url.indexOf('?');
    if (questionIndex === -1) {
      return {};
    }

    return parseFragment(url.slice(questionIndex + 1).split('#')[0]);
  }
}

function isResetPasswordUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl as any).protocol === 'honara7ty:' &&
      ((parsedUrl as any).hostname === 'reset-password' ||
        (parsedUrl as any).pathname === '/reset-password')
    );
  } catch {
    return url.startsWith('honara7ty://reset-password');
  }
}

function isAuthCallbackUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl as any).protocol === 'honara7ty:' &&
      ((parsedUrl as any).hostname === 'auth-callback' ||
        (parsedUrl as any).pathname === '/auth-callback')
    );
  } catch {
    return url.startsWith('honara7ty://auth-callback');
  }
}

export function getDevotionGroupInviteCodeFromUrl(
  url: string | null,
): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const isInviteUrl =
      ((parsedUrl as any).protocol === 'honara7ty:' &&
        ((parsedUrl as any).hostname === 'devotion-group-invite' ||
          (parsedUrl as any).pathname === '/devotion-group-invite')) ||
      (((parsedUrl as any).protocol === 'https:' ||
        (parsedUrl as any).protocol === 'http:') &&
        (parsedUrl as any).hostname === 'honara7ty.space' &&
        ((parsedUrl as any).pathname === '/devotion-group-invite' ||
          (parsedUrl as any).pathname === '/devotion-group-invite.html'));

    if (!isInviteUrl) {
      return null;
    }

    return parsedUrl.searchParams.get('code')?.replace(/\s+/g, '') || null;
  } catch {
    if (!url.startsWith('honara7ty://devotion-group-invite')) {
      return null;
    }

    return parseQueryString(url).code?.replace(/\s+/g, '') || null;
  }
}

export async function handleOAuthCallbackUrl(
  url: string | null,
): Promise<boolean> {
  if (!url || !isAuthCallbackUrl(url)) {
    return false;
  }

  const cachedResult = oauthCallbackResultCache.get(url);
  if (typeof cachedResult === 'boolean') {
    return cachedResult;
  }

  const inFlight = oauthCallbackInFlight.get(url);
  if (inFlight) {
    return inFlight;
  }

  const callbackPromise = (async () => {
    const queryParams = parseQueryString(url);
    const hashIndex = url.indexOf('#');
    const hashParams =
      hashIndex === -1 ? {} : parseFragment(url.slice(hashIndex + 1));
    const params = { ...queryParams, ...hashParams };

    if (!params.code) {
      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        const result = !error;
        cacheOAuthCallbackResult(url, result);
        return result;
      }

      cacheOAuthCallbackResult(url, false);
      return false;
    }

    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    const result = !error;
    cacheOAuthCallbackResult(url, result);
    return result;
  })();

  oauthCallbackInFlight.set(url, callbackPromise);

  try {
    return await callbackPromise;
  } finally {
    oauthCallbackInFlight.delete(url);
  }
}

export function __resetOAuthCallbackCacheForTests() {
  oauthCallbackInFlight.clear();
  oauthCallbackResultCache.clear();
}

export async function handleRecoveryUrl(
  url: string | null,
): Promise<{ isRecovery: boolean; isValid: boolean }> {
  if (!url) {
    return { isRecovery: false, isValid: false };
  }

  const isResetUrl = isResetPasswordUrl(url);
  const queryParams = parseQueryString(url);
  const hashIndex = url.indexOf('#');
  const hashParams = hashIndex === -1 ? {} : parseFragment(url.slice(hashIndex + 1));
  const params = { ...queryParams, ...hashParams };

  if (isResetUrl && params.error) {
    return { isRecovery: true, isValid: false };
  }

  if (isResetUrl && params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    return { isRecovery: true, isValid: !error };
  }

  if (
    isResetUrl &&
    params.type === 'recovery' &&
    params.access_token &&
    params.refresh_token
  ) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    return { isRecovery: true, isValid: !error };
  }

  return { isRecovery: false, isValid: false };
}
