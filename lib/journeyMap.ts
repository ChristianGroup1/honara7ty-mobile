/**
 * Journey Map
 *
 * Turns the user's cumulative devotion days into a walk along Paul's first
 * missionary journey (Acts 13–14). Every completed devotion day moves the
 * traveler one step closer to the next ancient stop. The journey never
 * shrinks — it is driven by TOTAL completed days, while the streak only
 * adds encouragement copy.
 */

export type JourneyStopKey =
  | 'antioch'
  | 'seleucia'
  | 'salamis'
  | 'paphos'
  | 'perga'
  | 'pisidianAntioch'
  | 'iconium'
  | 'lystra'
  | 'derbe'
  | 'returnAntioch';

export type JourneyStopDef = {
  index: number;
  key: JourneyStopKey;
  /** Cumulative completed devotion days required to stand at this stop. */
  minDays: number;
  /** Normalized coordinates on the map canvas (percent of width/height). */
  x: number;
  y: number;
  /** Scripture where this stop appears in Acts. */
  verseRef: string;
};

/** Ordered journey stops. Coordinates form a snake across a stylized map. */
export const JOURNEY_STOPS: JourneyStopDef[] = [
  {
    index: 0,
    key: 'antioch',
    minDays: 0,
    x: 87,
    y: 84,
    verseRef: 'أعمال 13:1-3',
  },
  {
    index: 1,
    key: 'seleucia',
    minDays: 1,
    x: 80,
    y: 76,
    verseRef: 'أعمال 13:4',
  },
  {
    index: 2,
    key: 'salamis',
    minDays: 3,
    x: 64,
    y: 64,
    verseRef: 'أعمال 13:5',
  },
  {
    index: 3,
    key: 'paphos',
    minDays: 7,
    x: 43,
    y: 59,
    verseRef: 'أعمال 13:6-12',
  },
  {
    index: 4,
    key: 'perga',
    minDays: 14,
    x: 38,
    y: 45,
    verseRef: 'أعمال 13:13-14',
  },
  {
    index: 5,
    key: 'pisidianAntioch',
    minDays: 21,
    x: 46,
    y: 33,
    verseRef: 'أعمال 13:14-52',
  },
  {
    index: 6,
    key: 'iconium',
    minDays: 30,
    x: 58,
    y: 27,
    verseRef: 'أعمال 14:1-7',
  },
  {
    index: 7,
    key: 'lystra',
    minDays: 45,
    x: 66,
    y: 35,
    verseRef: 'أعمال 14:8-20',
  },
  {
    index: 8,
    key: 'derbe',
    minDays: 60,
    x: 74,
    y: 41,
    verseRef: 'أعمال 14:20-21',
  },
  {
    index: 9,
    key: 'returnAntioch',
    minDays: 90,
    x: 89,
    y: 19,
    verseRef: 'أعمال 14:24-28',
  },
];

export const MAX_JOURNEY_STOP_INDEX = JOURNEY_STOPS.length - 1;

export type JourneyStopStatus = 'visited' | 'current' | 'locked';

export type JourneyStopInfo = {
  stop: JourneyStopDef;
  status: JourneyStopStatus;
};

export type JourneyInfo = {
  stops: JourneyStopInfo[];
  currentIndex: number;
  currentStop: JourneyStopDef;
  nextStop: JourneyStopDef | null;
  isComplete: boolean;
  completedDays: number;
  /** Cumulative days still needed to reach the next stop (0 when complete). */
  daysToNext: number;
  /** Progress 0..1 from the current stop toward the next one. */
  progress: number;
};

/**
 * Index of the last leg drawn as the long "sail home" curve. Legs after the
 * Derbe stop represent the return trip through Attalia back to Antioch.
 */
export const SAIL_HOME_LEG_INDEX = MAX_JOURNEY_STOP_INDEX - 1;

/** Resolves the full journey info from cumulative completed devotion days. */
export function getJourneyInfo(completedDays: number): JourneyInfo {
  const days = Math.max(completedDays, 0);

  let current = JOURNEY_STOPS[0];
  for (const candidate of JOURNEY_STOPS) {
    if (days >= candidate.minDays) {
      current = candidate;
    } else {
      break;
    }
  }

  const nextStop =
    current.index < MAX_JOURNEY_STOP_INDEX
      ? JOURNEY_STOPS[current.index + 1]
      : null;

  const isComplete = nextStop === null;
  const daysToNext = nextStop ? Math.max(nextStop.minDays - days, 0) : 0;

  let progress = 1;
  if (nextStop) {
    const span = nextStop.minDays - current.minDays;
    progress = span > 0 ? (days - current.minDays) / span : 1;
    progress = Math.min(Math.max(progress, 0), 1);
  }

  const stops: JourneyStopInfo[] = JOURNEY_STOPS.map(stop => ({
    stop,
    status:
      stop.index < current.index
        ? 'visited'
        : stop.index === current.index
        ? 'current'
        : 'locked',
  }));

  return {
    stops,
    currentIndex: current.index,
    currentStop: current,
    nextStop,
    isComplete,
    completedDays: days,
    daysToNext,
    progress,
  };
}

/**
 * Builds SVG path data for the leg between two consecutive stops.
 * The final leg is a curved "sail home" arc over the open sea; every other
 * leg is a gentle curved segment to feel hand-drawn rather than rigid.
 */
export function getLegPath(from: JourneyStopDef, to: JourneyStopDef): string {
  if (from.index === SAIL_HOME_LEG_INDEX && to.key === 'returnAntioch') {
    const midX = (from.x + to.x) / 2 + 16;
    const midY = (from.y + to.y) / 2;
    return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  }

  const midX = (from.x + to.x) / 2 + (to.y < from.y ? 2 : -2);
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}
