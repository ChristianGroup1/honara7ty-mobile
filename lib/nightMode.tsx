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
import { processColor, StyleSheet, View } from 'react-native';

const NIGHT_MODE_KEY = 'app_night_mode_enabled';

declare global {
  var __honaraNightModeStylePatchInstalled: boolean | undefined;
}

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
  background: '#F2F4F8',
  card: '#FFFFFF',
  cardMuted: '#F8FAFD',
  header: '#0A1124',
  text: '#0A1124',
  mutedText: '#667085',
  border: '#E3E8F1',
  accent: '#78A1BD',
  tabInactive: 'rgba(255,255,255,0.45)',
  shadow: '#000000',
};

const darkColors: AppTheme['colors'] = {
  background: '#0B1020',
  card: '#151E31',
  cardMuted: '#1D2940',
  header: '#111A2E',
  text: '#F7FAFC',
  mutedText: '#C0C8D6',
  border: '#34425F',
  accent: '#78A1BD',
  tabInactive: 'rgba(220,226,238,0.62)',
  shadow: '#000000',
};

let globalNightModeEnabled = false;

const normalizeHex = (value: string) => value.trim().toUpperCase();

const isDarkInk = (value: string) =>
  ['#0A1124', '#1F2A3A', '#222', '#222222', '#333', '#333333'].includes(
    normalizeHex(value),
  );

const isMutedText = (value: string) =>
  [
    '#555',
    '#555555',
    '#666',
    '#666666',
    '#667085',
    '#777',
    '#777777',
    '#7A8594',
    '#7B8390',
    '#7B8491',
    '#7C8087',
    '#888',
    '#888888',
    '#8A8F98',
    '#8C95A1',
    '#999',
    '#999999',
    '#A0A0A0',
    '#5C6676',
    '#445064',
  ].includes(normalizeHex(value));

const isLightSurface = (value: string) =>
  ['#FFF', '#FFFFFF'].includes(normalizeHex(value));

const isLightBackground = (value: string) =>
  ['#F2F4F8', '#EEF3F8', '#F6F7F9', '#F8F8F8'].includes(normalizeHex(value));

const isMutedSurface = (value: string) =>
  [
    '#F8FAFD',
    '#F4F6FA',
    '#F6F8FC',
    '#F6F9FC',
    '#FAFBFD',
    '#FBFCFE',
    '#F8F9FB',
    '#EFF3F8',
    '#EEF2F8',
    '#F2F6FF',
    '#F2F5F9',
    '#EDF0F5',
    '#E7EAF0',
    '#E8E8E8',
    '#F0F0F0',
    '#F1F3F6',
  ].includes(normalizeHex(value));

const isWarmSurface = (value: string) =>
  [
    '#FFF2CD',
    '#FFF4D6',
    '#FFF4EA',
    '#FFF6E5',
    '#FFF6E7',
    '#FFF7DF',
    '#FFF7E2',
    '#FFF8E5',
    '#F7F1DF',
    '#F6EBCD',
  ].includes(normalizeHex(value));

const isAccent = (value: string) =>
  ['#78A1BD', '#B08F45', '#C9A84C'].includes(normalizeHex(value));

const isAccentAlpha = (value: string) =>
  /^RGBA\(18,\s*30,\s*52,\s*0\.\d+\)$/i.test(value.trim()) ||
  /^RGBA\(176,\s*143,\s*69,\s*0\.\d+\)$/i.test(value.trim()) ||
  /^RGBA\(201,\s*168,\s*76,\s*0\.\d+\)$/i.test(value.trim());

const transformColor = (property: string, value: unknown) => {
  if (!globalNightModeEnabled || typeof value !== 'string') {
    return value;
  }

  const color = normalizeHex(value);

  if (property === 'backgroundColor') {
    if (isLightSurface(value)) {
      return darkColors.card;
    }
    if (isLightBackground(value)) {
      return darkColors.background;
    }
    if (isMutedSurface(value)) {
      return darkColors.cardMuted;
    }
    if (isWarmSurface(value)) {
      return 'rgba(120,161,189,0.18)';
    }
    if (color === '#0A1124') {
      return darkColors.header;
    }
    if (isAccent(value)) {
      return darkColors.accent;
    }
    if (isAccentAlpha(value)) {
      return 'rgba(120,161,189,0.16)';
    }
    if (/^RGBA\(10,\s*17,\s*36,\s*0\.\d+\)$/i.test(value.trim())) {
      return 'rgba(255,255,255,0.1)';
    }
  }

  if (property === 'color') {
    if (isDarkInk(value)) {
      return darkColors.text;
    }
    if (isMutedText(value)) {
      return darkColors.mutedText;
    }
    if (isAccent(value)) {
      return darkColors.accent;
    }
  }

  if (
    property === 'borderColor' ||
    property === 'borderBottomColor' ||
    property === 'borderTopColor' ||
    property === 'borderLeftColor' ||
    property === 'borderRightColor' ||
    property === 'shadowColor'
  ) {
    if (
      color === '#E3E8F1' ||
      color === '#E9EDF4' ||
      color === '#D4DAE4' ||
      color === '#E9EEF8' ||
      isAccent(value) ||
      isAccentAlpha(value) ||
      /^RGBA\(10,\s*17,\s*36,\s*0\.\d+\)$/i.test(value.trim())
    ) {
      return darkColors.border;
    }
  }

  return value;
};

const colorStyleProperties = [
  'backgroundColor',
  'color',
  'borderColor',
  'borderBottomColor',
  'borderTopColor',
  'borderLeftColor',
  'borderRightColor',
  'shadowColor',
];

const transformStyle = (style: unknown): unknown => {
  if (!globalNightModeEnabled || !style) {
    return style;
  }

  const flatStyle = StyleSheet.flatten(style as any);
  if (!flatStyle || typeof flatStyle !== 'object') {
    return style;
  }

  const nextStyle: Record<string, unknown> = { ...flatStyle };
  colorStyleProperties.forEach(property => {
    if (property in nextStyle) {
      nextStyle[property] = transformColor(property, nextStyle[property]);
    }
  });

  return nextStyle;
};

const installNightModeStylePatch = () => {
  if (globalThis.__honaraNightModeStylePatchInstalled) {
    return;
  }

  globalThis.__honaraNightModeStylePatchInstalled = true;
  const setStyleAttributePreprocessor = (StyleSheet as any)
    .setStyleAttributePreprocessor;

  if (typeof setStyleAttributePreprocessor === 'function') {
    colorStyleProperties.forEach(property => {
      setStyleAttributePreprocessor(property, (value: unknown) => {
        const transformed = transformColor(property, value);
        return typeof transformed === 'string'
          ? processColor(transformed)
          : transformed;
      });
    });
  }

  const originalCreateElement = React.createElement;

  React.createElement = ((type: any, props: any, ...children: any[]) => {
    if (globalNightModeEnabled && props?.style) {
      return originalCreateElement(
        type,
        { ...props, style: transformStyle(props.style) },
        ...children,
      );
    }

    return originalCreateElement(type, props, ...children);
  }) as typeof React.createElement;
};

installNightModeStylePatch();

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

  globalNightModeEnabled = isNightMode;

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
        key={isNightMode ? 'night' : 'day'}
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
