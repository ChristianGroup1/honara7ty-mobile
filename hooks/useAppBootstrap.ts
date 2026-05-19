import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { handleOAuthCallbackUrl, handleRecoveryUrl } from '../lib/deepLinking';
import { navigationRef } from '../navigation/navigationRef';
import supabase from '../lib/supbase';
import { syncDevotionReminderSchedule } from '../lib/devotionReminder';
import { BOOTSTRAP_TIMEOUT_MS, withTimeout } from '../lib/withTimeout';
import { clearClarityUser, setClarityUser } from '../lib/clarity';
import { clearSentryUser, setSentryUser } from '../lib/sentry';
import { clearFirebaseUser, setFirebaseUser } from '../lib/firebase';
import { registerPushToken, subscribePushTokenRefresh } from '../lib/pushTokens';
import { restoreSupabaseSessionFromGoogle } from '../lib/restoreGoogleSession';
import {
  cacheAuthSession,
  clearCachedAuthSession,
  restoreCachedAuthSession,
} from '../lib/authSessionCache';

export function useAppBootstrap() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryLinkValid, setRecoveryLinkValid] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let splashTimeout: ReturnType<typeof setTimeout> | undefined;
    let unsubscribePushTokenRefresh: (() => void) | undefined;

    const hideSplashAfter = (delayMs: number) => {
      if (splashTimeout) {
        clearTimeout(splashTimeout);
      }

      splashTimeout = setTimeout(() => {
        if (isMounted) {
          setShowSplash(false);
        }
      }, delayMs);
    };

    const applySessionState = (session: any) => {
      const profileDone =
        session?.user?.user_metadata?.profile_completed !== false;
      const onboardingDone =
        session?.user?.user_metadata?.onboarding_completed === true;

      if (!isMounted) {
        return;
      }

      setIsLoggedIn(Boolean(session));
      setNeedsProfileCompletion(Boolean(session) && !profileDone);
      setNeedsOnboarding(Boolean(session) && profileDone && !onboardingDone);
      setIsRecoveryMode(false);
      setRecoveryLinkValid(true);
    };

    const syncReminderScheduleSafely = (userId?: string | null) => {
      syncDevotionReminderSchedule(userId).catch(error => {
        console.warn('Failed to sync devotion reminder schedule', error);
      });
    };

    const syncPushTokenSafely = (userId?: string | null) => {
      unsubscribePushTokenRefresh?.();
      unsubscribePushTokenRefresh = undefined;

      if (!userId) {
        return;
      }

      registerPushToken(userId).then(result => {
        if (__DEV__ && !result.registered) {
          console.warn('Push token was not registered', result);
        }
      }).catch(error => {
        if (__DEV__) {
          console.warn('Failed to register push token', error);
        }
      });
      unsubscribePushTokenRefresh = subscribePushTokenRefresh(userId);
    };

    let bootstrapFinished = false;

    const checkSession = async () => {
      try {
        const initialUrl = await withTimeout<string | null>(
          Linking.getInitialURL(),
          BOOTSTRAP_TIMEOUT_MS,
          null,
          'Linking.getInitialURL',
        );
        const didHandleOAuthCallback = await withTimeout(
          handleOAuthCallbackUrl(initialUrl),
          BOOTSTRAP_TIMEOUT_MS,
          false,
          'handleOAuthCallbackUrl',
        );
        if (didHandleOAuthCallback) {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            BOOTSTRAP_TIMEOUT_MS,
            { data: { session: null }, error: null },
            'supabase.auth.getSession',
          );

          applySessionState(data?.session ?? null);

          if (data?.session) {
            syncReminderScheduleSafely(data.session.user?.id);
            syncPushTokenSafely(data.session.user?.id);
            setClarityUser(data.session.user.id);
            setSentryUser({
              id: data.session.user.id,
              email: data.session.user.email ?? null,
            });
            setFirebaseUser({
              id: data.session.user.id,
              email: data.session.user.email ?? null,
            });
          }
          bootstrapFinished = true;
          hideSplashAfter(800);
          return;
        }
        const { isRecovery, isValid } = await withTimeout(
          handleRecoveryUrl(initialUrl),
          BOOTSTRAP_TIMEOUT_MS,
          { isRecovery: false, isValid: false },
          'handleRecoveryUrl',
        );

        if (isRecovery) {
          if (isMounted) {
            setIsRecoveryMode(true);
            setRecoveryLinkValid(isValid);
          }
          bootstrapFinished = true;
          hideSplashAfter(800);
          return;
        }

        let { data } = await withTimeout(
          supabase.auth.getSession(),
          BOOTSTRAP_TIMEOUT_MS,
          { data: { session: null }, error: null },
          'supabase.auth.getSession',
        );

        // If we have a session but it might be expired, try to refresh it
        if (data?.session && data.session.expires_at) {
          const expiresAt = data.session.expires_at * 1000;
          if (Date.now() > expiresAt - 60000) { // 1 minute buffer
            const refreshed = await supabase.auth.refreshSession();
            if (refreshed.data?.session) {
              data = refreshed.data;
            }
          }
        }

        let session = data?.session ?? null;
        if (!session) {
          session = await withTimeout(
            restoreCachedAuthSession(),
            BOOTSTRAP_TIMEOUT_MS,
            null,
            'restoreCachedAuthSession',
          );
        }
        if (!session) {
          session = await withTimeout(
            restoreSupabaseSessionFromGoogle(),
            BOOTSTRAP_TIMEOUT_MS,
            null,
            'restoreSupabaseSessionFromGoogle',
          );
        }

        applySessionState(session);

        if (session) {
          cacheAuthSession(session).catch(() => {});
          syncReminderScheduleSafely(session.user?.id);
          syncPushTokenSafely(session.user?.id);
          setClarityUser(session.user.id);
          setSentryUser({
            id: session.user.id,
            email: session.user.email ?? null,
          });
          setFirebaseUser({
            id: session.user.id,
            email: session.user.email ?? null,
          });
        }
      } catch (error) {
        console.warn('Bootstrap session check failed', error);
        applySessionState(null);
        clearClarityUser();
        clearSentryUser();
        clearFirebaseUser();
      } finally {
        bootstrapFinished = true;
        hideSplashAfter(1200);
      }
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Bootstrap does the initial session resolution, including fallback
      // storage. A late INITIAL_SESSION(null) can otherwise reset navigation
      // back to Welcome after a valid cached session was restored.
      if (event === 'INITIAL_SESSION') {
        return;
      }

      // Ignore SIGNED_OUT events during initial bootstrap to prevent race conditions
      if (event === 'SIGNED_OUT' && !bootstrapFinished) {
        return;
      }

      if (!session && event !== 'SIGNED_OUT') {
        return;
      }

      applySessionState(session);
      syncReminderScheduleSafely(session?.user?.id);
      syncPushTokenSafely(session?.user?.id);
      if (session?.user?.id) {
        cacheAuthSession(session).catch(() => {});
        setClarityUser(session.user.id);
        setSentryUser({
          id: session.user.id,
          email: session.user.email ?? null,
        });
        setFirebaseUser({
          id: session.user.id,
          email: session.user.email ?? null,
        });
      } else if (bootstrapFinished) {
        clearCachedAuthSession().catch(() => {});
        clearClarityUser();
        clearSentryUser();
        clearFirebaseUser();
      }
    });

    checkSession();

    const sub = Linking.addEventListener('url', async ({ url }) => {
      const didHandleOAuthCallback = await handleOAuthCallbackUrl(url);
      if (didHandleOAuthCallback) {
        return;
      }

      const { isRecovery, isValid } = await handleRecoveryUrl(url);
      if (isRecovery && navigationRef.isReady()) {
        navigationRef.navigate('ResetPassword', { linkValid: isValid });
      }
    });

    return () => {
      isMounted = false;
      if (splashTimeout) {
        clearTimeout(splashTimeout);
      }
      sub.remove();
      authSubscription.unsubscribe();
      unsubscribePushTokenRefresh?.();
    };
  }, []);

  return {
    showSplash,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
    needsProfileCompletion,
  };
}
