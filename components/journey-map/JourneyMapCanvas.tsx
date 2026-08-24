/**
 * JourneyMapCanvas
 *
 * A stylized SVG map of Paul's first missionary journey: the southern coast
 * of Asia Minor, Cyprus, and the Syrian coast, with the route snaking from
 * Antioch across the sea and back. Waypoint labels are rendered as native
 * Text overlays (not SVG text) so Arabic shaping renders correctly.
 */

import React, { useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  JOURNEY_STOPS,
  getLegPath,
  type JourneyInfo,
} from '../../lib/journeyMap';
import { useNightMode } from '../../lib/nightMode';
import { getStrings } from '../../localization';

const CANVAS_ASPECT = 10 / 13;

type MapColors = {
  sea: string;
  wave: string;
  land: string;
  landEdge: string;
  traveled: string;
  upcoming: string;
  visitedDot: string;
  currentDot: string;
  lockedDot: string;
  lockedRing: string;
  pulse: string;
  label: string;
  activeLabel: string;
};

const LIGHT_COLORS: MapColors = {
  sea: '#D8E9F6',
  wave: '#C4DCEE',
  land: '#EFE9D6',
  landEdge: '#D9CEB2',
  traveled: '#78A1BD',
  upcoming: '#9AA7B8',
  visitedDot: '#2D9C5A',
  currentDot: '#E6B84A',
  lockedDot: '#FFFFFF',
  lockedRing: '#AEB9C8',
  pulse: 'rgba(230,184,74,0.35)',
  label: '#51607A',
  activeLabel: '#0A1124',
};

const DARK_COLORS: MapColors = {
  sea: '#0F1B33',
  wave: '#18263F',
  land: '#1D2940',
  landEdge: '#31405E',
  traveled: '#78A1BD',
  upcoming: '#46536B',
  visitedDot: '#3FBF77',
  currentDot: '#E6B84A',
  lockedDot: '#1D2940',
  lockedRing: '#44536F',
  pulse: 'rgba(230,184,74,0.28)',
  label: '#9DA9BF',
  activeLabel: '#F7FAFC',
};

/** Decorative coastline shapes (percent coordinates of the canvas). */
const LAND_PATHS = [
  // Asia Minor — the big northern landmass.
  'M -5 -5 L 105 -5 L 105 36 L 94 42 L 83 38 L 72 44 L 61 40 L 53 46 L 45 41 L 37 47 L 29 43 L 20 49 L 10 45 L -5 52 Z',
  // Cyprus — the island mid-way through the journey.
  'M 36 56 C 42 53 50 54 57 56 C 63 58 68 60 67 63 C 66 66 59 68 51 67 C 43 66 35 64 34 61 C 34 59 35 57 36 56 Z',
  // Syria — bottom-right coast holding Antioch.
  'M 105 70 L 96 76 L 88 72 L 82 80 L 73 85 L 66 93 L 62 100 L 70 135 L 105 135 Z',
];

/** Subtle decorative wave strokes scattered over open water. */
const WAVE_PATHS = [
  'M 12 78 q 5 -4 10 0 q 5 4 10 0',
  'M 22 95 q 5 -4 10 0 q 5 4 10 0',
  'M 8 108 q 5 -4 10 0 q 5 4 10 0',
  'M 30 118 q 5 -4 10 0 q 5 4 10 0',
  'M 48 90 q 5 -4 10 0 q 5 4 10 0',
];

type JourneyMapCanvasProps = {
  info: JourneyInfo;
};

const LABEL_WIDTH = 96;

const JourneyMapCanvas = ({ info }: JourneyMapCanvasProps) => {
  const strings = getStrings().journeyMap;
  const { isNightMode } = useNightMode();
  const colors = isNightMode ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => createCanvasStyles(colors), [colors]);

  const pulseValue = useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseValue]);

  const legs = useMemo(() => {
    const result: { d: string; index: number; traveled: boolean }[] = [];
    for (let i = 0; i < JOURNEY_STOPS.length - 1; i += 1) {
      const from = JOURNEY_STOPS[i];
      const to = JOURNEY_STOPS[i + 1];
      result.push({
        d: getLegPath(from, to),
        index: i,
        traveled: info.currentIndex > from.index,
      });
    }
    return result;
  }, [info.currentIndex]);

  const currentStopDef = info.currentStop;

  const pulseSize = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 54],
  });
  const pulseOpacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 0],
  });

  return (
    <View style={[styles.canvas, { aspectRatio: CANVAS_ASPECT }]}>
      <Svg viewBox="0 0 100 130" style={StyleSheet.absoluteFill}>
        {/* Sea */}
        <Rect x={-5} y={-5} width={110} height={140} fill={colors.sea} />

        {/* Landmasses */}
        {LAND_PATHS.map((d, i) => (
          <Path
            key={`land-${i}`}
            d={d}
            fill={colors.land}
            stroke={colors.landEdge}
            strokeWidth={0.7}
          />
        ))}

        {/* Decorative waves */}
        {WAVE_PATHS.map((d, i) => (
          <Path
            key={`wave-${i}`}
            d={d}
            fill="none"
            stroke={colors.wave}
            strokeWidth={0.7}
            strokeLinecap="round"
          />
        ))}

        {/* Route legs */}
        {legs.map(leg => (
          <Path
            key={`leg-${leg.index}`}
            d={leg.d}
            fill="none"
            stroke={leg.traveled ? colors.traveled : colors.upcoming}
            strokeWidth={1.4}
            strokeDasharray={leg.traveled ? undefined : '2.4 2.6'}
            strokeLinecap="round"
          />
        ))}

        {/* Waypoints */}
        {JOURNEY_STOPS.map(stop => {
          const status = info.stops[stop.index].status;
          if (status === 'visited') {
            return (
              <Circle
                key={`stop-${stop.key}`}
                cx={stop.x}
                cy={stop.y}
                r={2.6}
                fill={colors.visitedDot}
              />
            );
          }
          if (status === 'current') {
            return (
              <Circle
                key={`stop-${stop.key}`}
                cx={stop.x}
                cy={stop.y}
                r={3.4}
                fill={colors.currentDot}
                stroke="#FFFFFF"
                strokeWidth={1.2}
              />
            );
          }
          return (
            <Circle
              key={`stop-${stop.key}`}
              cx={stop.x}
              cy={stop.y}
              r={2.4}
              fill={colors.lockedDot}
              stroke={colors.lockedRing}
              strokeWidth={1}
            />
          );
        })}
      </Svg>

      {/* Pulsing halo over the current stop (native overlay so it can animate). */}
      {!info.isComplete ? (
        <View
          pointerEvents="none"
          style={[
            styles.pulseAnchor,
            {
              left: `${currentStopDef.x}%`,
              top: `${currentStopDef.y}%`,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                width: pulseSize,
                height: pulseSize,
                opacity: pulseOpacity,
              },
            ]}
          />
        </View>
      ) : null}

      {/* Native labels overlay (correct Arabic rendering). */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {JOURNEY_STOPS.map(stop => {
          const status = info.stops[stop.index].status;
          const isActive = status === 'current';
          return (
            <View
              key={`label-${stop.key}`}
              pointerEvents="none"
              style={[
                styles.labelAnchor,
                {
                  left: `${stop.x}%`,
                  top: `${stop.y}%`,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={isActive ? styles.stopLabelActive : styles.stopLabel}
              >
                {strings.stops[stop.key].name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const createCanvasStyles = (themeColors: MapColors) =>
  StyleSheet.create({
    canvas: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: 20,
    },
    pulseAnchor: {
      position: 'absolute',
      width: 54,
      height: 54,
      marginLeft: -27,
      marginTop: -27,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseCircle: {
      borderRadius: 999,
      backgroundColor: themeColors.pulse,
    },
    labelAnchor: {
      position: 'absolute',
      alignItems: 'center',
      width: LABEL_WIDTH,
      marginLeft: -(LABEL_WIDTH / 2),
      marginTop: -30,
    },
    stopLabel: {
      textAlign: 'center',
      color: themeColors.label,
      fontWeight: '700',
      fontSize: 10,
    },
    stopLabelActive: {
      textAlign: 'center',
      color: themeColors.activeLabel,
      fontWeight: '900',
      fontSize: 11,
    },
  });

export default React.memo(JourneyMapCanvas);
