import { Linking } from 'react-native';
import supabase from './supbase';

const AUTH_CALLBACK_URL = 'honara7ty://auth-callback';
let facebookAuthRequest: Promise<void> | null = null;

export async function startFacebookAuth() {
  if (facebookAuthRequest) {
    return facebookAuthRequest;
  }

  facebookAuthRequest = (async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: AUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('Missing Facebook authentication URL.');
    }

    await Linking.openURL(data.url);
  })();

  try {
    await facebookAuthRequest;
  } finally {
    facebookAuthRequest = null;
  }
}

export { AUTH_CALLBACK_URL };
