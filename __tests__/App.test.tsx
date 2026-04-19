/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../hooks/useAppBootstrap', () => ({
  useAppBootstrap: jest.fn(),
}));

jest.mock('../hooks/useOfflineSync', () => ({
  useOfflineSync: jest.fn(() => ({ isOffline: false })),
}));

jest.mock('../navigation/RootNavigator', () => {
  const { Text } = require('react-native');
  return () => <Text>root navigator</Text>;
});

jest.mock('../screens', () => ({
  SplashScreen: () => {
    const { Text } = require('react-native');
    return <Text>splash screen</Text>;
  },
}));

const mockedUseAppBootstrap = require('../hooks/useAppBootstrap')
  .useAppBootstrap as jest.Mock;

import App from '../App';

test('renders splash while bootstrap is pending', async () => {
  mockedUseAppBootstrap.mockReturnValue({
    showSplash: true,
    isLoggedIn: false,
    isRecoveryMode: false,
    recoveryLinkValid: true,
    needsOnboarding: false,
  });

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('renders root navigator after bootstrap', async () => {
  mockedUseAppBootstrap.mockReturnValue({
    showSplash: false,
    isLoggedIn: true,
    isRecoveryMode: false,
    recoveryLinkValid: true,
    needsOnboarding: false,
  });

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
