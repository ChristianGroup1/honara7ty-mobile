import supabase from './supbase';

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
