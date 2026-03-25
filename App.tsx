/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './screens';
import RootNavigator from './navigation/RootNavigator';
import { useAppBootstrap } from './hooks/useAppBootstrap';

function App() {
  const {
    showSplash,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
  } = useAppBootstrap();

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator
        isLoggedIn={isLoggedIn}
        isRecoveryMode={isRecoveryMode}
        recoveryLinkValid={recoveryLinkValid}
        needsOnboarding={needsOnboarding}
      />
    </SafeAreaProvider>
  );
}

export default App;
