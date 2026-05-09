import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
  Route,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  WelcomeScreen,
  ProfileCompletion,
  LoginUi,
  ForgotPasswordUi,
  ResetPasswordUi,
  OnboardingScreen,
  NotificationPermissionScreen,
} from '../screens';
import SignupStep1 from '../components/signup/SignupScreen';
import MainTabNavigator from './MainTabNavigator';
import { navigationRef } from './navigationRef';
import { RootStackParamList } from './types';
import { trackClarityScreen } from '../lib/clarity';
import {
  registerSentryNavigationContainer,
  Sentry,
  trackSentryScreen,
} from '../lib/sentry';
import { trackFirebaseScreen } from '../lib/firebase';

const NAVY = '#0A1124';

const Stack = createStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isLoggedIn: boolean;
  isRecoveryMode: boolean;
  recoveryLinkValid: boolean;
  needsOnboarding: boolean;
}

function getInitialRouteName({
  isLoggedIn,
  isRecoveryMode,
  needsOnboarding,
}: Omit<RootNavigatorProps, 'recoveryLinkValid'>): keyof RootStackParamList {
  if (isRecoveryMode) {
    return 'ResetPassword';
  }

  if (isLoggedIn) {
    return needsOnboarding ? 'Onboarding' : 'MainTabs';
  }

  return 'Welcome';
}

function getActiveRoute(
  state?: NavigationState | PartialState<NavigationState>,
): Route<string> | undefined {
  if (!state || !state.routes?.length) {
    return undefined;
  }

  const index = state.index ?? 0;
  const route = state.routes[index];

  if (!route) {
    return undefined;
  }

  const childState = route.state as
    | NavigationState
    | PartialState<NavigationState>
    | undefined;

  if (childState) {
    const activeRoute = getActiveRoute(childState);
    // Ensure the returned route has a defined key
    if (activeRoute && activeRoute.key) {
      return activeRoute;
    }
    if (route && typeof route.key === 'string') {
      return route as Route<string>;
    }
    return undefined;
  }

  // Ensure the returned route has a defined key
  if (route && typeof route.key === 'string') {
    return route as Route<string>;
  }
  return undefined;
}

const RootNavigator = ({
  isLoggedIn,
  isRecoveryMode,
  recoveryLinkValid,
  needsOnboarding,
}: RootNavigatorProps) => {
  const routeNameRef = useRef<string | undefined>(undefined);
  const navigationReadyRef = useRef(false);

  const initialRouteName = getInitialRouteName({
    isLoggedIn,
    isRecoveryMode,
    needsOnboarding,
  });

  useEffect(() => {
    if (!navigationReadyRef.current || !navigationRef.isReady()) {
      return;
    }

    const currentRouteName = getActiveRoute(navigationRef.getRootState())?.name;

    if (currentRouteName === initialRouteName) {
      return;
    }

    if (isRecoveryMode) {
      navigationRef.reset({
        index: 0,
        routes: [
          { name: 'ResetPassword', params: { linkValid: recoveryLinkValid } },
        ],
      });
      return;
    }

    if (isLoggedIn) {
      navigationRef.reset({
        index: 0,
        routes: [
          {
            name: needsOnboarding ? 'Onboarding' : 'MainTabs',
          },
        ],
      });
      return;
    }

    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  }, [
    initialRouteName,
    isLoggedIn,
    isRecoveryMode,
    recoveryLinkValid,
    needsOnboarding,
  ]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        navigationReadyRef.current = true;
        registerSentryNavigationContainer(navigationRef);
        const currentRoute = getActiveRoute(navigationRef.getRootState());
        const currentRouteName = currentRoute?.name;

        if (!currentRouteName) {
          return;
        }

        routeNameRef.current = currentRouteName;
        trackClarityScreen(currentRouteName);
        trackSentryScreen(currentRouteName);
        trackFirebaseScreen(currentRouteName);
      }}
      onStateChange={() => {
        const currentRoute = getActiveRoute(navigationRef.getRootState());
        const currentRouteName = currentRoute?.name;

        if (!currentRouteName || currentRouteName === routeNameRef.current) {
          return;
        }

        routeNameRef.current = currentRouteName;
        trackClarityScreen(currentRouteName);
        trackSentryScreen(currentRouteName);
        trackFirebaseScreen(currentRouteName);
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        detachInactiveScreens
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: NAVY },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
        />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
        />
        <Stack.Screen
          name="SignupStep1"
          component={SignupStep1}
        />
        <Stack.Screen
          name="ProfileCompletion"
          component={ProfileCompletion}
        />
        <Stack.Screen
          name="Login"
          component={LoginUi}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordUi}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordUi}
          initialParams={{ linkValid: recoveryLinkValid }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
        />
        <Stack.Screen
          name="NotificationPermission"
          component={NotificationPermissionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
