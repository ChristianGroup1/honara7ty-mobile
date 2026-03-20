/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, StatusBar, useColorScheme } from 'react-native';
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
  MoreScreen,
  ProfileScreen,
  DevotionGuideScreen,
} from './screens';
import SignupStep1 from './components/Signup';
import HomeScreen from './components/Home';
import supabase from './lib/supbase';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

// ─── Navigators ───────────────────────────────────────────────────────────────
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type RootStackParamList = {
  MainTabs: undefined;
  Welcome: undefined;
  SignupStep1: undefined;
  ProfileCompletion: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { linkValid?: boolean };
  Onboarding: undefined;
  PrayerNotes: undefined;
  SpiritualReflection: undefined;
  BibleReader: undefined;
  BibleMemorization: undefined;
  Badges: undefined;
  Testimonies: undefined;
  DailyNotifications: undefined;
  DevotionGuide: undefined;
};

/**
 * Bottom tab navigator — the main logged-in shell.
 * Each tab gets access to the root stack's navigation so deep screens
 * (PrayerNotes, BibleReader, etc.) can still be pushed on the stack.
 */
function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="الرئيسية"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: {
          backgroundColor: NAVY,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'android' ? 8 : 4,
          paddingTop: 8,
          height: Platform.OS === 'android' ? 60 : 80,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, string> = {
            'الرئيسية': focused ? 'home' : 'home-outline',
            'الملف الشخصي': focused ? 'account' : 'account-outline',
            'الإعدادات': focused ? 'cog' : 'cog-outline',
            'المزيد': focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] ?? 'circle'}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="الرئيسية" component={HomeScreen} />
      <Tab.Screen name="الملف الشخصي" component={ProfileScreen} />
      <Tab.Screen name="الإعدادات" component={DailyNotificationsScreen} />
      <Tab.Screen name="المزيد" component={MoreScreen} />
    </Tab.Navigator>
  );
}

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

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ← هل logged in؟
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
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <Stack.Navigator
          initialRouteName={
            isRecoveryMode
              ? 'ResetPassword'
              : isLoggedIn
              ? needsOnboarding
                ? 'Onboarding'
                : 'MainTabs'
              : 'Welcome'
          }
        >
          {/* ── Main logged-in shell (bottom tabs) ── */}
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
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
          {/* ── Detail screens pushed from tabs ── */}
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
          <Stack.Screen
            name="DevotionGuide"
            component={DevotionGuideScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
