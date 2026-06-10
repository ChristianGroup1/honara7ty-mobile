/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
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
import { navigationRef } from './navigation/navigationRef';
import { NightModeProvider } from './lib/nightMode';

function runWhenIdle(task: () => void) {
  const idleScheduler = (globalThis as any).requestIdleCallback;
  if (typeof idleScheduler === 'function') {
    const idleId = idleScheduler(task);
    return () => {
      const cancelIdleScheduler = (globalThis as any).cancelIdleCallback;
      if (typeof cancelIdleScheduler === 'function') {
        cancelIdleScheduler(idleId);
      }
    };
  }

  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
}

function App() {
  useOfflineSync();

  useEffect(() => {
    const cancelIdleTask = runWhenIdle(() => {
      initializeSentry();
      initializeClarity();
      initializeFirebase();
      registerFirebaseGlobalErrorHandler();
    });

    return cancelIdleTask;
  }, []);

  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS) {
        return;
      }
      if (detail.pressAction?.id !== DEVOTION_PRESS_ACTION_ID) {
        return;
      }

      if (navigationRef.isReady()) {
        (navigationRef.navigate as any)('MainTabs', { screen: 'Home' });
      }
    });
  }, []);

  const {
    showSplash,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
    needsProfileCompletion,
    pendingDevotionGroupInviteCode,
    clearPendingDevotionGroupInvite,
  } = useAppBootstrap();

  return (
    <SafeAreaProvider>
      <NightModeProvider>
        {showSplash ? (
          <SplashScreen />
        ) : (
          <RootNavigator
            isLoggedIn={isLoggedIn}
            isRecoveryMode={isRecoveryMode}
            recoveryLinkValid={recoveryLinkValid}
            needsOnboarding={needsOnboarding}
            needsProfileCompletion={needsProfileCompletion}
            pendingDevotionGroupInviteCode={pendingDevotionGroupInviteCode}
            onConsumeDevotionGroupInvite={clearPendingDevotionGroupInvite}
          />
        )}
      </NightModeProvider>
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
