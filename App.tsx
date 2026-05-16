/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './screens';
import RootNavigator from './navigation/RootNavigator';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useOfflineSync } from './hooks/useOfflineSync';
import notifee, { EventType } from '@notifee/react-native';
import { DEVOTION_PRESS_ACTION_ID } from './lib/notifications';
import { initializeSentry, Sentry } from './lib/sentry';
import { initializeClarity } from './lib/clarity';
import {
  initializeFirebase,
  registerFirebaseGlobalErrorHandler,
} from './lib/firebase';

function App() {
  useOfflineSync();

  useEffect(() => {
    // Defer heavy initializations until after initial rendering to prevent ANRs
    InteractionManager.runAfterInteractions(() => {
      initializeSentry();
      initializeClarity();
      initializeFirebase();
      registerFirebaseGlobalErrorHandler();
    });
  }, []);
  const {
    showSplash,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
    needsProfileCompletion,
  } = useAppBootstrap();

  return (
    <SafeAreaProvider>
      {showSplash ? (
        <SplashScreen />
      ) : (
        <RootNavigator
          isLoggedIn={isLoggedIn}
          isRecoveryMode={isRecoveryMode}
          recoveryLinkValid={recoveryLinkValid}
          needsOnboarding={needsOnboarding}
          needsProfileCompletion={needsProfileCompletion}
        />
      )}
    </SafeAreaProvider>
  );
}

/**
 * Call this once when app starts (foreground handler).
 * Use it to open your in-app modal/screen based on notification tap.
 */
export function registerNotifeeForegroundHandler(
  navigate: (route: string, params?: any) => void,
) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS) return;
    if (detail.pressAction?.id !== DEVOTION_PRESS_ACTION_ID) return;

    // open your modal/screen
    navigate('DevotionModal', {
      source: 'notification',
      data: detail.notification?.data,
    });
  });
}

/**
 * Background handler must be a top-level function and registered in entry file.
 */
export async function notifeeBackgroundEventHandler({ type, detail }: any) {
  if (type !== EventType.PRESS) return;
  if (detail.pressAction?.id !== DEVOTION_PRESS_ACTION_ID) return;

  // In background you usually can't directly navigate.
  // Common pattern: store a flag in storage, then when app launches read it and navigate.
  // Implement if needed.
}

notifee.onBackgroundEvent(notifeeBackgroundEventHandler);

export default Sentry.wrap(App);
