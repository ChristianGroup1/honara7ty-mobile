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

export function useAppBootstrap() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryLinkValid, setRecoveryLinkValid] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let splashTimeout: ReturnType<typeof setTimeout> | undefined;

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
      const onboardingDone =
        session?.user?.user_metadata?.onboarding_completed === true;

      if (!isMounted) {
        return;
      }

      setIsLoggedIn(Boolean(session));
      setNeedsOnboarding(Boolean(session) && !onboardingDone);
      setIsRecoveryMode(false);
      setRecoveryLinkValid(true);
    };

    const syncReminderScheduleSafely = (userId?: string | null) => {
      void syncDevotionReminderSchedule(userId).catch(error => {
        console.warn('Failed to sync devotion reminder schedule', error);
      });
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

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          BOOTSTRAP_TIMEOUT_MS,
          { data: { session: null }, error: null },
          'supabase.auth.getSession',
        );

        // If we have a session but it might be expired, try to refresh it
        if (data?.session && data.session.expires_at) {
          const expiresAt = data.session.expires_at * 1000;
          if (Date.now() > expiresAt - 60000) { // 1 minute buffer
            await supabase.auth.refreshSession();
          }
        }

        applySessionState(data?.session ?? null);

        if (data?.session) {
          syncReminderScheduleSafely(data.session.user?.id);
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
      // Ignore SIGNED_OUT events during initial bootstrap to prevent race conditions
      if (event === 'SIGNED_OUT' && !bootstrapFinished) {
        return;
      }

      applySessionState(session);
      syncReminderScheduleSafely(session?.user?.id);
      if (session?.user?.id) {
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
    };
  }, []);

  return {
    showSplash,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
  };
}
