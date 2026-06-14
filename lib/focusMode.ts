import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { FocusMode } = NativeModules;

export type FocusModePreference = 'disabled' | 'manual' | 'automatic';
const FOCUS_MODE_PREF_KEY = 'honara7ty_focus_mode_preference';

export const getFocusModePreference = async (): Promise<FocusModePreference> => {
  try {
    const value = await AsyncStorage.getItem(FOCUS_MODE_PREF_KEY);
    if (value === 'manual' || value === 'automatic') {
      return value;
    }
    return 'disabled';
  } catch (error) {
    return 'disabled';
  }
};

export const setFocusModePreference = async (pref: FocusModePreference): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOCUS_MODE_PREF_KEY, pref);
  } catch (error) {
    // Ignore error
  }
};

export const hasFocusModePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return FocusMode.hasPermission();
};

export const requestFocusModePermission = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  return FocusMode.requestPermission();
};

export const enableFocusMode = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return FocusMode.enableFocusMode();
};

export const disableFocusMode = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return FocusMode.disableFocusMode();
};

export const scheduleFocusMode = async (hour: number, minute: number): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return FocusMode.scheduleFocusMode(hour, minute);
};

export const cancelScheduledFocusMode = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return FocusMode.cancelScheduledFocusMode();
};

export const getFocusModeStatus = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  return FocusMode.getStatus();
};
