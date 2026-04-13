import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { resetAnalytics, trackEvent } from './analytics';
import { configureGoogleSignIn } from './googleSignInConfig';
import supabase from './supbase';
import { cancelDevotionReminder } from './notifications';

export async function logoutCurrentUser() {
  configureGoogleSignIn();

  trackEvent('user_logged_out');
  await cancelDevotionReminder();
  resetAnalytics();
  await supabase.auth.signOut();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Email/password users may not have an active Google session.
  }
}
