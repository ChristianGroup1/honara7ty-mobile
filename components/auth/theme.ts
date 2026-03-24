import { DefaultTheme } from 'react-native-paper';

export const AUTH_NAVY = '#0A1124';
export const AUTH_GOLD = '#fdfcf9ff';

export const authPaperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AUTH_NAVY,
    outline: '#E0E0E0',
  },
};
