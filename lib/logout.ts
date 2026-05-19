import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from './googleSignInConfig';
import supabase from './supbase';
import { cancelDevotionReminder } from './notifications';
import { clearClarityUser } from './clarity';
import { clearSentryUser } from './sentry';
import { clearFirebaseUser } from './firebase';
import { unregisterCurrentPushToken } from './pushTokens';
import { clearCachedAuthSession } from './authSessionCache';

export async function logoutCurrentUser() {
  configureGoogleSignIn();

  await cancelDevotionReminder();
  clearClarityUser();
  clearSentryUser();
  clearFirebaseUser();
  try {
    await unregisterCurrentPushToken();
  } catch {
    // Token cleanup is best-effort; sign out must still complete.
  }
  await clearCachedAuthSession();
  await supabase.auth.signOut();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Email/password users may not have an active Google session.
  }
}
