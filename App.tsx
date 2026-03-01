/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Linking, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  WelcomeScreen,
  SplashScreen,
  ProfileCompletion,
  LoginUi,
  ForgotPasswordUi,
  ResetPasswordUi,
} from './screens';
import SignupStep1 from './components/Signup'; // Import your signup step
import HomeScreen from './components/Home';
import supabase from './lib/supbase';

const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type RootStackParamList = {
  HomeScreen: { user?: any };
  Welcome: undefined;
  SignupStep1: undefined;
  ProfileCompletion: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { linkValid?: boolean };
};

/** Parse a URL fragment string (key=value&key2=value2) into a plain object. */
function parseFragment(fragment: string): Record<string, string> {
  const result: Record<string, string> = {};
  fragment.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      result[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(
        pair.slice(idx + 1),
      );
    }
  });
  return result;
}

/**
 * Detects a Supabase password-recovery deep link, establishes the session,
 * and returns whether the recovery URL was present and whether it was valid.
 *
 * Supports both auth flows:
 *   PKCE (default in v2):  honara7ty://reset-password?code=<auth_code>
 *   Implicit:              honara7ty://reset-password#access_token=...&type=recovery
 */
async function handleRecoveryUrl(
  url: string | null,
): Promise<{ isRecovery: boolean; isValid: boolean }> {
  if (!url) {
    return { isRecovery: false, isValid: false };
  }

  const isResetUrl = url.startsWith('honara7ty://reset-password');

  // ─── PKCE flow: ?code=... ───
  if (isResetUrl) {
    const questionIndex = url.indexOf('?');
    if (questionIndex !== -1) {
      const queryString = url.slice(questionIndex + 1).split('#')[0];
      const queryParams = parseFragment(queryString);
      if (queryParams.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          queryParams.code,
        );
        return { isRecovery: true, isValid: !error };
      }
    }
  }

  // ─── Implicit flow: #access_token=...&type=recovery ───
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return { isRecovery: false, isValid: false };
  }
  const params = parseFragment(url.slice(hashIndex + 1));
  if (
    params.type === 'recovery' &&
    params.access_token &&
    params.refresh_token
  ) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    return { isRecovery: true, isValid: !error };
  }
  return { isRecovery: false, isValid: false };
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ← هل logged in؟
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  // Stores whether the cold-start reset link was valid; default true so the
  // form is shown for any non-deep-link navigation into ResetPassword.
  const [recoveryLinkValid, setRecoveryLinkValid] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Check for a password-recovery deep link first (cold start)
      const initialUrl = await Linking.getInitialURL();
      const { isRecovery, isValid } = await handleRecoveryUrl(initialUrl);
      if (isRecovery) {
        setIsRecoveryMode(true);
        setRecoveryLinkValid(isValid);
        setTimeout(() => setShowSplash(false), 800);
        return;
      }

      // اشيك لو في session محفوظة
      const { data } = await supabase.auth.getSession();
      console.log('Session data:', data); // 🔍 شوف السيشن في اللوج
      if (data?.session) {
        setIsLoggedIn(true); // ✅ logged in → روح HomeScreen
      }

      // بعد 2 ثانية خفي الـ Splash
      setTimeout(() => setShowSplash(false), 2000);
    };

    checkSession();

    // Warm deep-link handler (app already open when link is clicked)
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const { isRecovery, isValid } = await handleRecoveryUrl(url);
      if (isRecovery && navigationRef.isReady()) {
        navigationRef.navigate('ResetPassword', { linkValid: isValid });
      }
    });

    return () => sub.remove();
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator
          initialRouteName={
            isRecoveryMode
              ? 'ResetPassword'
              : isLoggedIn
              ? 'HomeScreen'
              : 'Welcome'
          }
        >
          <Stack.Screen
            name="HomeScreen"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignupStep1"
            component={SignupStep1}
            options={{ headerShown: false }} // This line hides the white header
          />
          <Stack.Screen
            name="ProfileCompletion"
            component={ProfileCompletion}
            options={{ headerShown: false }} // This line hides the white header
          />
          <Stack.Screen
            name="Login"
            component={LoginUi}
            options={{ headerShown: false }} // This line hides the white header
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordUi}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordUi}
            options={{ headerShown: false }}
            initialParams={{ linkValid: recoveryLinkValid }}
          />
          {/* Add more screens here */}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
