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

export async function handleRecoveryUrl(
  url: string | null,
): Promise<{ isRecovery: boolean; isValid: boolean }> {
  if (!url) {
    return { isRecovery: false, isValid: false };
  }

  const isResetUrl = url.startsWith('honara7tyapp://reset-password');

  if (isResetUrl) {
    const questionIndex = url.indexOf('?');
    if (questionIndex !== -1) {
      const queryString = url.slice(questionIndex + 1).split('#')[0];
      const queryParams = parseFragment(queryString);
      if (queryParams.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          queryParams.code,
        );
        return { isRecovery: true, isValid: !error };
      }
    }
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return { isRecovery: false, isValid: false };
  }

  const params = parseFragment(url.slice(hashIndex + 1));

  if (isResetUrl && params.error) {
    return { isRecovery: true, isValid: false };
  }

  if (
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
