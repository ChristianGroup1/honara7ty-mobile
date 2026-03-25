import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { handleRecoveryUrl } from '../lib/deepLinking';
import { navigationRef } from '../navigation/navigationRef';
import supabase from '../lib/supbase';

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

    const sub = Linking.addEventListener('url', async ({ url }) => {
      const { isRecovery, isValid } = await handleRecoveryUrl(url);
      if (isRecovery && navigationRef.isReady()) {
        navigationRef.navigate('ResetPassword', { linkValid: isValid });
      }
    });

    return () => sub.remove();
  }, []);

  return {
    showSplash,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
  };
}
