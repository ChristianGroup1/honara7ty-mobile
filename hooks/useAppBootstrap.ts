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
    // Tracks whether the initial checkSession has completed so we can
    // suppress the INITIAL_SESSION event from onAuthStateChange and avoid
    // duplicate state updates (which cause the double-render flash).
    let bootstrapComplete = false;

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

    const setUserIdentity = (session: any) => {
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
      } else {
        clearClarityUser();
        clearSentryUser();
        clearFirebaseUser();
      }
    };

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
            setUserIdentity(data.session);
          }
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
          hideSplashAfter(800);
          return;
        }

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          BOOTSTRAP_TIMEOUT_MS,
          { data: { session: null }, error: null },
          'supabase.auth.getSession',
        );

        applySessionState(data?.session ?? null);

        if (data?.session) {
          syncReminderScheduleSafely(data.session.user?.id);
          setUserIdentity(data.session);
        }
      } catch (error) {
        console.warn('Bootstrap session check failed', error);
        applySessionState(null);
        clearClarityUser();
        clearSentryUser();
        clearFirebaseUser();
      } finally {
        bootstrapComplete = true;
        hideSplashAfter(1200);
      }
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Skip the initial INITIAL_SESSION event – checkSession handles it.
      // This prevents duplicate applySessionState calls that cause the
      // double-render flash when the app boots.
      if (!bootstrapComplete) {
        return;
      }

      applySessionState(session);
      syncReminderScheduleSafely(session?.user?.id);
      setUserIdentity(session);
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
