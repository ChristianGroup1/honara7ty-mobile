import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  WelcomeScreen,
  ProfileCompletion,
  LoginUi,
  ForgotPasswordUi,
  ResetPasswordUi,
  OnboardingScreen,
  PrayerNotesScreen,
  SpiritualReflectionScreen,
  DailyNotificationsScreen,
  BibleMemorizationScreen,
  BadgesScreen,
  DevotionGuideScreen,
  DevotionDetailScreen,
  DevotionCalendarScreen,
} from '../screens';
import SignupStep1 from '../components/signup/SignupScreen';
import MainTabNavigator from './MainTabNavigator';
import { navigationRef } from './navigationRef';
import { RootStackParamList } from './types';

const NAVY = '#0A1124';

const Stack = createStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isLoggedIn: boolean;
  isRecoveryMode: boolean;
  recoveryLinkValid: boolean;
  needsOnboarding: boolean;
}

const RootNavigator = ({
  isLoggedIn,
  isRecoveryMode,
  recoveryLinkValid,
  needsOnboarding,
}: RootNavigatorProps) => {
  return (
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
          name="DevotionGuide"
          component={DevotionGuideScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DevotionDetail"
          component={DevotionDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DevotionCalendar"
          component={DevotionCalendarScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
