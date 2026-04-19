import { Linking } from 'react-native';
import supabase from './supbase';

const AUTH_CALLBACK_URL = 'honara7ty://auth-callback';

export async function startFacebookAuth() {
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
}

export { AUTH_CALLBACK_URL };
