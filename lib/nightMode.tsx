import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { darkPalette, palette } from '../components/shared/designTokens';

const NIGHT_MODE_KEY = 'app_night_mode_enabled';

export type AppTheme = {
  isNightMode: boolean;
  colors: {
    background: string;
    card: string;
    cardMuted: string;
    header: string;
    text: string;
    mutedText: string;
    border: string;
    accent: string;
    tabInactive: string;
    shadow: string;
  };
};

const lightColors: AppTheme['colors'] = {
  background: palette.bg,
  card: palette.card,
  cardMuted: palette.cardMuted,
  header: palette.navy,
  text: palette.text,
  mutedText: palette.mutedText,
  border: palette.border,
  accent: palette.accent,
  tabInactive: 'rgba(255,255,255,0.45)',
  shadow: '#000000',
};

const darkColors: AppTheme['colors'] = {
  background: darkPalette.background,
  card: darkPalette.card,
  cardMuted: darkPalette.cardMuted,
  header: darkPalette.header,
  text: darkPalette.text,
  mutedText: darkPalette.mutedText,
  border: darkPalette.border,
  accent: darkPalette.accent,
  tabInactive: darkPalette.tabInactive,
  shadow: darkPalette.shadow,
};

type NightModeContextValue = AppTheme & {
  setNightMode: (enabled: boolean) => void;
  toggleNightMode: () => void;
};

const NightModeContext = createContext<NightModeContextValue>({
  isNightMode: false,
  colors: lightColors,
  setNightMode: () => undefined,
  toggleNightMode: () => undefined,
});

export const NightModeProvider = ({ children }: { children: ReactNode }) => {
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(NIGHT_MODE_KEY)
      .then(value => {
        if (isActive) {
          setIsNightMode(value === '1');
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  const setNightMode = useCallback((enabled: boolean) => {
    setIsNightMode(enabled);
    AsyncStorage.setItem(NIGHT_MODE_KEY, enabled ? '1' : '0').catch(
      () => undefined,
    );
  }, []);

  const toggleNightMode = useCallback(() => {
    setIsNightMode(current => {
      const next = !current;
      AsyncStorage.setItem(NIGHT_MODE_KEY, next ? '1' : '0').catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const value = useMemo<NightModeContextValue>(
    () => ({
      isNightMode,
      colors: isNightMode ? darkColors : lightColors,
      setNightMode,
      toggleNightMode,
    }),
    [isNightMode, setNightMode, toggleNightMode],
  );

  return (
    <NightModeContext.Provider value={value}>
      <View
        style={[
          styles.providerShell,
          isNightMode ? styles.providerShellNight : styles.providerShellDay,
        ]}
      >
        {children}
      </View>
    </NightModeContext.Provider>
  );
};

export const useNightMode = () => useContext(NightModeContext);

const styles = StyleSheet.create({
  providerShell: {
    flex: 1,
  },
  providerShellDay: {
    backgroundColor: lightColors.background,
  },
  providerShellNight: {
    backgroundColor: darkColors.background,
  },
});
