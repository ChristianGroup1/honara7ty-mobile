import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer from 'react-test-renderer';
import { NightModeProvider, useNightMode } from '../lib/nightMode';

const NIGHT_MODE_KEY = 'app_night_mode_enabled';

const NightModeProbe = () => {
  const { isNightMode, setNightMode, colors } = useNightMode();

  return (
    <TouchableOpacity
      testID="toggle-night-mode"
      onPress={() => setNightMode(!isNightMode)}
    >
      <Text testID="night-mode-state">
        {isNightMode ? colors.background : colors.card}
      </Text>
    </TouchableOpacity>
  );
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('night mode toggles without using global style patches', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NightModeProvider>
        <NightModeProbe />
      </NightModeProvider>,
    );
  });

  const toggle = renderer!.root.findByProps({ testID: 'toggle-night-mode' });

  await ReactTestRenderer.act(async () => {
    toggle.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'night-mode-state' }).props.children,
  ).toBe('#0B1020');
  await expect(AsyncStorage.getItem(NIGHT_MODE_KEY)).resolves.toBe('1');

  await ReactTestRenderer.act(async () => {
    toggle.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'night-mode-state' }).props.children,
  ).toBe('#FFFFFF');
  await expect(AsyncStorage.getItem(NIGHT_MODE_KEY)).resolves.toBe('0');
});
