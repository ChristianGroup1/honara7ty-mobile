jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: ({ children }: any) => children,
}));

jest.mock('react-native-text-input-interactive', () => () => null);

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => () => null);

jest.mock('../lib/supbase', () => ({
  auth: {
    signUp: jest.fn(),
  },
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SignupUI from '../components/signup/SignupScreen';

const navigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

let consoleWarnSpy: jest.SpyInstance;

beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});

test('signup screen renders without crashing', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<SignupUI navigation={navigation} />);
  });
});
