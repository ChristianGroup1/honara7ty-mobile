import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { handleRecoveryUrl } from '../lib/deepLinking';
import { navigationRef } from '../navigation/navigationRef';
import supabase from '../lib/supbase';
import { syncDevotionReminderSchedule } from '../lib/devotionReminder';
import { identifyUser, resetAnalytics } from '../lib/analytics';
import { BOOTSTRAP_TIMEOUT_MS, withTimeout } from '../lib/withTimeout';

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

    const checkSession = async () => {
      try {
        const initialUrl = await withTimeout<string | null>(
          Linking.getInitialURL(),
          BOOTSTRAP_TIMEOUT_MS,
          null,
          'Linking.getInitialURL',
        );
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
          { data: { session: null } },
          'supabase.auth.getSession',
        );

        applySessionState(data?.session ?? null);

        if (data?.session) {
          syncReminderScheduleSafely(data.session.user?.id);
          identifyUser(data.session.user.id, {
            email: data.session.user.email ?? null,
            onboarding_completed:
              data.session.user?.user_metadata?.onboarding_completed === true,
          });
        }
      } catch (error) {
        console.warn('Bootstrap session check failed', error);
        applySessionState(null);
      } finally {
        hideSplashAfter(1200);
      }
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      applySessionState(session);
      syncReminderScheduleSafely(session?.user?.id);

      if (session?.user?.id) {
        identifyUser(session.user.id, {
          email: session.user.email ?? null,
          onboarding_completed:
            session.user?.user_metadata?.onboarding_completed === true,
        });
      } else {
        resetAnalytics();
      }
    });

    checkSession();

    const sub = Linking.addEventListener('url', async ({ url }) => {
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
