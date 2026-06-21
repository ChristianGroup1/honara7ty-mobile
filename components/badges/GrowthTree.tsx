import React, { useMemo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

type GrowthTreeProps = {
  /** Growth stage index 0..9. */
  stage: number;
  /** Vibrant leaves when true, muted/sage when the streak is broken. */
  thriving?: boolean;
  /** Square render size in px. */
  size?: number;
  /** Adapt soil / backdrop to dark surfaces. */
  isNight?: boolean;
};

const VIEW = 120;
const GROUND_Y = 122;
const CENTER_X = 60;

/** Unit canopy blob offsets (relative to canopy radius). */
const CANOPY_BLOBS = [
  { x: 0, y: -0.18, r: 1.0 },
  { x: -0.62, y: 0.12, r: 0.66 },
  { x: 0.62, y: 0.12, r: 0.66 },
  { x: -0.34, y: -0.6, r: 0.58 },
  { x: 0.34, y: -0.6, r: 0.58 },
  { x: 0, y: 0.52, r: 0.62 },
  { x: -0.52, y: -0.32, r: 0.5 },
  { x: 0.52, y: -0.32, r: 0.5 },
];

const BLOB_COUNT_BY_STAGE = [0, 0, 1, 3, 5, 6, 7, 8, 8, 8];

/** Deterministic fruit / flower spots in unit canopy space. */
const SPOTS = [
  { x: -0.3, y: -0.1 },
  { x: 0.32, y: 0.05 },
  { x: 0.05, y: -0.42 },
  { x: -0.45, y: -0.45 },
  { x: 0.46, y: -0.4 },
  { x: -0.05, y: 0.34 },
];

const GrowthTree = ({
  stage,
  thriving = true,
  size = 150,
  isNight = false,
}: GrowthTreeProps) => {
  const s = Math.min(Math.max(stage, 0), 9);
  const g = s / 9;

  const leafLight = thriving ? '#63C487' : '#AEBCA1';
  const leafMain = thriving ? '#3FA864' : '#94A587';
  const leafDark = thriving ? '#2E8B57' : '#7E8F72';
  const trunkLight = '#AE7A53';
  const trunkDark = '#7B4F30';
  const soilTop = isNight ? '#4A3B2E' : '#D8B48C';
  const soilBottom = isNight ? '#34281F' : '#B5895E';
  const isLifeTree = s >= 9;
  const fruitColor = isLifeTree ? '#E6B450' : '#E0533B';

  const trunkHeight = s === 0 ? 0 : 20 + g * 66;
  const trunkTopY = GROUND_Y - trunkHeight;
  const trunkWidth = 4 + g * 9;
  const canopyR = s <= 1 ? 9 + s * 3 : 14 + g * 34;
  const canopyCY = trunkTopY - canopyR * 0.25;

  const blobs = useMemo(() => {
    const count = BLOB_COUNT_BY_STAGE[s];
    return CANOPY_BLOBS.slice(0, count);
  }, [s]);

  const showFlowers = s === 6;
  const fruitCount = s >= 7 ? (isLifeTree ? 6 : s === 7 ? 3 : 4) : 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      <Defs>
        <RadialGradient id="canopy" cx="50%" cy="40%" r="65%">
          <Stop offset="0%" stopColor={leafLight} />
          <Stop offset="70%" stopColor={leafMain} />
          <Stop offset="100%" stopColor={leafDark} />
        </RadialGradient>
        <LinearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={trunkDark} />
          <Stop offset="50%" stopColor={trunkLight} />
          <Stop offset="100%" stopColor={trunkDark} />
        </LinearGradient>
        <LinearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={soilTop} />
          <Stop offset="100%" stopColor={soilBottom} />
        </LinearGradient>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FCE9B0" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#FCE9B0" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Golden halo for the tree of life */}
      {isLifeTree ? (
        <Circle cx={CENTER_X} cy={canopyCY} r={canopyR * 1.5} fill="url(#glow)" />
      ) : null}

      {/* Soil mound + ground line */}
      <Ellipse
        cx={CENTER_X}
        cy={GROUND_Y}
        rx={42}
        ry={10}
        fill="url(#soil)"
      />
      <Ellipse
        cx={CENTER_X}
        cy={GROUND_Y - 3}
        rx={30}
        ry={6}
        fill={soilTop}
        opacity={0.6}
      />

      {/* Stage 0 — seed resting in the soil */}
      {s === 0 ? (
        <G>
          <Ellipse
            cx={CENTER_X}
            cy={GROUND_Y - 5}
            rx={7}
            ry={9}
            fill="#8B5E3C"
          />
          <Path
            d={`M ${CENTER_X} ${GROUND_Y - 12} q 4 -6 9 -6`}
            stroke={leafMain}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      ) : null}

      {/* Trunk */}
      {s >= 1 ? (
        <Path
          d={`M ${CENTER_X - trunkWidth / 2} ${GROUND_Y}
             C ${CENTER_X - trunkWidth / 2} ${GROUND_Y - trunkHeight * 0.5},
               ${CENTER_X - trunkWidth / 3} ${trunkTopY + 4},
               ${CENTER_X} ${trunkTopY}
             C ${CENTER_X + trunkWidth / 3} ${trunkTopY + 4},
               ${CENTER_X + trunkWidth / 2} ${GROUND_Y - trunkHeight * 0.5},
               ${CENTER_X + trunkWidth / 2} ${GROUND_Y}
             Z`}
          fill="url(#trunk)"
        />
      ) : null}

      {/* Branches for taller trees */}
      {s >= 4 ? (
        <G stroke={trunkDark} strokeWidth={trunkWidth * 0.32} strokeLinecap="round">
          <Path
            d={`M ${CENTER_X} ${trunkTopY + canopyR * 0.6}
               q -${canopyR * 0.5} -4 -${canopyR * 0.7} -${canopyR * 0.5}`}
            fill="none"
          />
          <Path
            d={`M ${CENTER_X} ${trunkTopY + canopyR * 0.6}
               q ${canopyR * 0.5} -4 ${canopyR * 0.7} -${canopyR * 0.5}`}
            fill="none"
          />
        </G>
      ) : null}

      {/* Canopy */}
      {blobs.map((b, i) => (
        <Circle
          key={`blob-${i}`}
          cx={CENTER_X + b.x * canopyR}
          cy={canopyCY + b.y * canopyR}
          r={b.r * canopyR * 0.62}
          fill="url(#canopy)"
        />
      ))}

      {/* Stage 1 sprout leaves */}
      {s === 1 ? (
        <G fill={leafMain}>
          <Ellipse
            cx={CENTER_X - 6}
            cy={trunkTopY + 2}
            rx={6}
            ry={3.4}
            transform={`rotate(-28 ${CENTER_X - 6} ${trunkTopY + 2})`}
          />
          <Ellipse
            cx={CENTER_X + 6}
            cy={trunkTopY + 2}
            rx={6}
            ry={3.4}
            transform={`rotate(28 ${CENTER_X + 6} ${trunkTopY + 2})`}
          />
        </G>
      ) : null}

      {/* Flowers (flowering stage) */}
      {showFlowers
        ? SPOTS.slice(0, 5).map((spot, i) => (
            <Circle
              key={`flower-${i}`}
              cx={CENTER_X + spot.x * canopyR}
              cy={canopyCY + spot.y * canopyR}
              r={3}
              fill="#F4A6C0"
            />
          ))
        : null}

      {/* Fruits (fruiting / flourishing / life tree) */}
      {fruitCount > 0
        ? SPOTS.slice(0, fruitCount).map((spot, i) => (
            <Circle
              key={`fruit-${i}`}
              cx={CENTER_X + spot.x * canopyR}
              cy={canopyCY + spot.y * canopyR}
              r={3.4}
              fill={fruitColor}
            />
          ))
        : null}
    </Svg>
  );
};

export default React.memo(GrowthTree);
