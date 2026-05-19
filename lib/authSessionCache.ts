import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import supabase from './supbase';

const AUTH_SESSION_CACHE_KEY = 'honara7ty.auth.session.v1';

export async function cacheAuthSession(session?: Session | null) {
  if (!session?.access_token || !session.refresh_token) {
    return;
  }

  await AsyncStorage.setItem(AUTH_SESSION_CACHE_KEY, JSON.stringify(session));
}

export async function clearCachedAuthSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_CACHE_KEY);
}

export async function restoreCachedAuthSession(): Promise<Session | null> {
  const rawSession = await AsyncStorage.getItem(AUTH_SESSION_CACHE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const cachedSession = JSON.parse(rawSession) as Session;
    if (!cachedSession.access_token || !cachedSession.refresh_token) {
      await clearCachedAuthSession();
      return null;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: cachedSession.access_token,
      refresh_token: cachedSession.refresh_token,
    });

    if (error || !data.session) {
      await clearCachedAuthSession();
      return null;
    }

    await cacheAuthSession(data.session);
    return data.session;
  } catch {
    await clearCachedAuthSession();
    return null;
  }
}
