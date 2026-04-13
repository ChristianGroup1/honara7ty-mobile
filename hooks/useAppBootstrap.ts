import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { handleRecoveryUrl } from '../lib/deepLinking';
import { navigationRef } from '../navigation/navigationRef';
import supabase from '../lib/supbase';
import { syncDevotionReminderSchedule } from '../lib/devotionReminder';
import { identifyUser, resetAnalytics } from '../lib/analytics';

export function useAppBootstrap() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryLinkValid, setRecoveryLinkValid] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const initialUrl = await Linking.getInitialURL();
      const { isRecovery, isValid } = await handleRecoveryUrl(initialUrl);

      if (isRecovery) {
        setIsRecoveryMode(true);
        setRecoveryLinkValid(isValid);
        setTimeout(() => setShowSplash(false), 800);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        await syncDevotionReminderSchedule(data.session.user?.id);
        identifyUser(data.session.user.id, {
          email: data.session.user.email ?? null,
          onboarding_completed:
            data.session.user?.user_metadata?.onboarding_completed === true,
        });

        const onboardingDone =
          data.session.user?.user_metadata?.onboarding_completed === true;

        if (onboardingDone) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(true);
          setNeedsOnboarding(true);
        }
      }

      setTimeout(() => setShowSplash(false), 2000);
    };

    checkSession();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await syncDevotionReminderSchedule(session?.user?.id);

      if (session?.user?.id) {
        identifyUser(session.user.id, {
          email: session.user.email ?? null,
          onboarding_completed:
            session.user?.user_metadata?.onboarding_completed === true,
        });
      } else {
        resetAnalytics();
      }

      const onboardingDone =
        session?.user?.user_metadata?.onboarding_completed === true;

      setIsLoggedIn(Boolean(session));
      setNeedsOnboarding(Boolean(session) && !onboardingDone);
      setIsRecoveryMode(false);
      setRecoveryLinkValid(true);
    });

    const sub = Linking.addEventListener('url', async ({ url }) => {
      const { isRecovery, isValid } = await handleRecoveryUrl(url);
      if (isRecovery && navigationRef.isReady()) {
        navigationRef.navigate('ResetPassword', { linkValid: isValid });
      }
    });

    return () => {
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
