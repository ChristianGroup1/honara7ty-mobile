import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from './googleSignInConfig';
import supabase from './supbase';
import { cancelDevotionReminder } from './notifications';
import { clearClarityUser } from './clarity';
import { clearSentryUser } from './sentry';
import { clearFirebaseUser } from './firebase';

export async function logoutCurrentUser() {
  configureGoogleSignIn();

  await cancelDevotionReminder();
  clearClarityUser();
  clearSentryUser();
  clearFirebaseUser();
  await supabase.auth.signOut();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Email/password users may not have an active Google session.
  }
}
