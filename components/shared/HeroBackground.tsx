import React from 'react';
import { StyleSheet, View } from 'react-native';
import GradientSurface from './GradientSurface';
import { headerGradient } from './designTokens';
import { useNightMode } from '../../lib/nightMode';

/**
 * Drop-in decorative background for navy "hero" cards: a subtle navy→blue
 * gradient plus a soft accent glow, matching the redesigned header. Place as
 * the first child of a card that has `overflow: 'hidden'` and a border radius.
 */
const HeroBackground = () => {
  const { isNightMode } = useNightMode();
  const colors = isNightMode ? headerGradient.dark : headerGradient.light;
  return (
    <>
      <GradientSurface colors={colors} />
      <View style={styles.glow} pointerEvents="none" />
    </>
  );
};

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -40,
    left: -24,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(120,161,189,0.18)',
  },
});

export default React.memo(HeroBackground);
