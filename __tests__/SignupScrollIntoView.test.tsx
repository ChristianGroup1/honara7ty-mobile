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

jest.mock('react-native-scroll-into-view', () => ({
  wrapScrollView: jest.fn(component => component),
  useScrollIntoView: () => jest.fn(),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { wrapScrollView } from 'react-native-scroll-into-view';
import SignupUI from '../components/Signup';

const navigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

test('signup wraps keyboard-aware scroll view for scroll-into-view', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<SignupUI navigation={navigation} />);
  });

  expect(wrapScrollView).toHaveBeenCalled();
});
