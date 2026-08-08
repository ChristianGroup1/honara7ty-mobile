import { GoogleSignin } from '@react-native-google-signin/google-signin';
import supabase from './supbase';
import { cancelDevotionReminder } from './notifications';
import { clearClarityUser } from './clarity';
import { clearSentryUser } from './sentry';
import { clearFirebaseUser } from './firebase';
import { clearCachedAuthSession } from './authSessionCache';

export async function deleteCurrentAccount() {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });

  if (error) {
    throw error;
  }

  await cancelDevotionReminder();
  clearClarityUser();
  clearSentryUser();
  clearFirebaseUser();
  await clearCachedAuthSession();
  await supabase.auth.signOut({ scope: 'local' });

  try {
    await GoogleSignin.signOut();
  } catch {
    // Email/password users may not have an active Google session.
  }
}
