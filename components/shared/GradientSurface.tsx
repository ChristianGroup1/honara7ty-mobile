import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface GradientSurfaceProps {
  /** Ordered gradient stop colors (2 or more). */
  colors: string[];
  /** Diagonal by default; pass false for a top→bottom gradient. */
  diagonal?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Absolute-fill linear gradient drawn with react-native-svg (already a
 * dependency, so no native rebuild needed). Place it inside a parent with
 * `overflow: 'hidden'` and the desired border radius — the gradient is clipped
 * to the parent's shape.
 *
 * Gradient stop colors are passed as SVG props (not RN style), so the
 * night-mode hex patch does not touch them; supply dark stops explicitly.
 */
const GradientSurface = ({
  colors,
  diagonal = true,
  style,
}: GradientSurfaceProps) => {
  const stops = colors.length >= 2 ? colors : [colors[0], colors[0]];
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient
            id="honaraGrad"
            x1="0%"
            y1="0%"
            x2={diagonal ? '100%' : '0%'}
            y2="100%"
          >
            {stops.map((color, index) => (
              <Stop
                key={`${color}-${index}`}
                offset={`${(index / (stops.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity={1}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#honaraGrad)" />
      </Svg>
    </View>
  );
};

export default React.memo(GradientSurface);
