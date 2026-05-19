import {
  GoogleSignin,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from './googleSignInConfig';
import supabase from './supbase';

export async function restoreSupabaseSessionFromGoogle() {
  configureGoogleSignIn();

  const response = await GoogleSignin.signInSilently();
  if (isNoSavedCredentialFoundResponse(response) || !isSuccessResponse(response)) {
    return null;
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    return null;
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    if (__DEV__) {
      console.warn('[auth] failed to restore Supabase session from Google', error);
    }
    return null;
  }

  return data.session ?? null;
}
