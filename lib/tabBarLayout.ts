import { Platform } from 'react-native';

export const getTabBarLayout = (bottomInset: number) => {
  const tabBarBaseHeight = Platform.OS === 'android' ? 72 : 70;
  const tabBarBottomPadding =
    Platform.OS === 'android' ? Math.max(bottomInset, 10) : bottomInset + 8;
  const tabBarHeight = tabBarBaseHeight + tabBarBottomPadding;

  return { tabBarBaseHeight, tabBarBottomPadding, tabBarHeight };
};

/** Approximate height of the verse selection bottom sheet (excluding tab bar). */
export const SELECTION_BAR_HEIGHT = 96;
