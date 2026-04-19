jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: ({ children }: any) => children,
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => () => null);

jest.mock('../components/shared/CustomInput', () => {
  const React = require('react');
  const { Text, TextInput, View } = require('react-native');

  return ({ fieldLabel, value, onChangeText, error }: any) => (
    <View>
      <Text>{fieldLabel}</Text>
      <TextInput
        testID={`input-${fieldLabel}`}
        value={value}
        onChangeText={onChangeText}
      />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
});

jest.mock('../lib/supbase', () => ({
  auth: {
    signInWithPassword: jest.fn(),
  },
}));

jest.mock('../lib/notificationPermissionFlow', () => ({
  hasSeenNotificationPermissionPrompt: jest.fn().mockResolvedValue(true),
}));

jest.mock('../lib/ensureDefaultDevotionTime', () => ({
  ensureDefaultDevotionTime: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import LoginScreen from '../components/login/LoginScreen';
import supabase from '../lib/supbase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const navigation = {
  goBack: jest.fn(),
  reset: jest.fn(),
  replace: jest.fn(),
};

let consoleWarnSpy: jest.SpyInstance;

beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  (GoogleSignin.signInSilently as jest.Mock).mockRejectedValue(
    new Error('not signed in'),
  );
});

test('login shows validation errors before calling supabase', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<LoginScreen navigation={navigation} />);
  });

  const submitButton = renderer!.root.findByProps({ testID: 'login-submit' });

  await ReactTestRenderer.act(async () => {
    submitButton.props.onPress();
  });

  expect(renderer!.root.findByProps({ children: 'يرجى إدخال البريد الإلكتروني' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'يرجى إدخال كلمة المرور' })).toBeTruthy();
  expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
});

test('login navigates to main tabs after successful login', async () => {
  (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
    data: {
      user: { id: 'user-1', user_metadata: { onboarding_completed: true } },
    },
    error: null,
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<LoginScreen navigation={navigation} />);
  });

  const emailInput = renderer!.root.findByProps({
    testID: 'input-البريد الإلكتروني',
  });
  const passwordInput = renderer!.root.findByProps({
    testID: 'input-كلمة المرور  ',
  });
  const submitButton = renderer!.root.findByProps({ testID: 'login-submit' });

  await ReactTestRenderer.act(async () => {
    emailInput.props.onChangeText('user@example.com');
    passwordInput.props.onChangeText('password123');
  });

  await ReactTestRenderer.act(async () => {
    submitButton.props.onPress();
  });

  expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'password123',
  });
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'MainTabs' }],
  });
});
