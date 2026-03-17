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
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  WelcomeScreen,
  SplashScreen,
  ProfileCompletion,
  LoginUi,
  ForgotPasswordUi,
  ResetPasswordUi,
  OnboardingScreen,
  PrayerNotesScreen,
  SpiritualReflectionScreen,
  DailyNotificationsScreen,
  BibleReaderScreen,
  BibleMemorizationScreen,
  BadgesScreen,
  TestimoniesScreen,
} from './screens';
import SignupStep1 from './components/Signup';
import HomeScreen from './components/Home';
import ProfileScreen from './components/ProfileScreen';
import MoreScreen from './components/MoreScreen';
import supabase from './lib/supbase';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const ACCENT_BLUE = '#2A7BBA';
const CARD_DARK = '#152040';

type RootStackParamList = {
  HomeScreen: { user?: any };
  Welcome: undefined;
  SignupStep1: undefined;
  ProfileCompletion: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { linkValid?: boolean };
  Onboarding: undefined;
  PrayerNotes: undefined;
  SpiritualReflection: undefined;
  DailyNotifications: undefined;
  BibleReader: undefined;
  BibleMemorization: undefined;
  Badges: undefined;
  Testimonies: undefined;
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
 *   Error (expired/used):  honara7ty://reset-password#error=access_denied&error_code=otp_expired&...
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

  // ─── Implicit flow: #access_token=...&type=recovery  OR  #error=... ───
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return { isRecovery: false, isValid: false };
  }
  const params = parseFragment(url.slice(hashIndex + 1));

  // Supabase error redirect (e.g. expired OTP):
  // honara7ty://reset-password#error=access_denied&error_code=otp_expired&...
  if (isResetUrl && params.error) {
    return { isRecovery: true, isValid: false };
  }

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

/** Main bottom tab navigator – shown after the user logs in */
const TAB_ICONS: Record<string, string> = {
  Home: 'home-variant-outline',
  Profile: 'account-circle-outline',
  Settings: 'cog-outline',
  More: 'dots-horizontal-circle-outline',
};

const TAB_BAR_STYLE = {
  backgroundColor: CARD_DARK,
  borderTopColor: 'rgba(255,255,255,0.08)',
  height: 62,
  paddingBottom: 8,
  paddingTop: 4,
};

const TAB_LABEL_STYLE = { fontSize: 11 };

function makeTabOptions(label: string, routeName: string) {
  return {
    tabBarLabel: label,
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <MaterialCommunityIcons
        name={TAB_ICONS[routeName] ?? 'circle-outline'}
        size={size}
        color={color}
      />
    ),
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: ACCENT_BLUE,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarLabelStyle: TAB_LABEL_STYLE,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={makeTabOptions('الرئيسية', 'Home')} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={makeTabOptions('الملف الشخصي', 'Profile')} />
      <Tab.Screen name="Settings" component={DailyNotificationsScreen} options={makeTabOptions('الإعدادات', 'Settings')} />
      <Tab.Screen name="More" component={MoreScreen} options={makeTabOptions('المزيد', 'More')} />
    </Tab.Navigator>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  // Stores whether the cold-start reset link was valid; default true so the
  // form is shown for any non-deep-link navigation into ResetPassword.
  const [recoveryLinkValid, setRecoveryLinkValid] = useState(true);
  // True when the user is logged in but hasn't completed onboarding yet
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
        const onboardingDone =
          data.session.user?.user_metadata?.onboarding_completed === true;
        if (onboardingDone) {
          setIsLoggedIn(true); // ✅ logged in → روح HomeScreen
        } else {
          setIsLoggedIn(true);
          setNeedsOnboarding(true); // ← first time → روح Onboarding
        }
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
              ? needsOnboarding
                ? 'Onboarding'
                : 'HomeScreen'
              : 'Welcome'
          }
        >
          {/* Main tabs (home, profile, settings, more) */}
          <Stack.Screen
            name="HomeScreen"
            component={MainTabs}
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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProfileCompletion"
            component={ProfileCompletion}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginUi}
            options={{ headerShown: false }}
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
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PrayerNotes"
            component={PrayerNotesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SpiritualReflection"
            component={SpiritualReflectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DailyNotifications"
            component={DailyNotificationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BibleReader"
            component={BibleReaderScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BibleMemorization"
            component={BibleMemorizationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Badges"
            component={BadgesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Testimonies"
            component={TestimoniesScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
