import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ReadingPlanSuggestion,
} from './readingPlanSuggestions';
import type { ReadingEntry } from './readingEntries';

export type ActiveReadingPlan = {
  key: string;
  startDate: string;
};

const activeReadingPlanKey = (userId: string) =>
  `active_reading_plan:${userId}`;

const toLocalIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

export async function getActiveReadingPlan(
  userId: string,
): Promise<ActiveReadingPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(activeReadingPlanKey(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ActiveReadingPlan>;
    if (!parsed?.key || !parsed?.startDate) {
      return null;
    }
    return { key: parsed.key, startDate: parsed.startDate };
  } catch {
    return null;
  }
}

export async function setActiveReadingPlan(
  userId: string,
  key: string,
): Promise<void> {
  try {
    const plan: ActiveReadingPlan = {
      key,
      startDate: toLocalIsoDate(new Date()),
    };
    await AsyncStorage.setItem(
      activeReadingPlanKey(userId),
      JSON.stringify(plan),
    );
  } catch {
    /* best-effort persistence */
  }
}

export async function clearActiveReadingPlan(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(activeReadingPlanKey(userId));
  } catch {
    /* best-effort */
  }
}

/**
 * Resolves the reading for *today* from an active plan. The plan day advances
 * by actual progress: it points to the day after the number of devotion days
 * already completed since the plan started (today excluded), so a missed
 * calendar day never skips a reading. It cycles back to the beginning once the
 * plan's days are exhausted so the prompt never runs dry.
 */
export function resolveTodayPlanEntries(params: {
  plan: ActiveReadingPlan | null;
  suggestions: ReadingPlanSuggestion[];
  devotionLogs?: Record<string, { completed?: boolean | null }>;
}): { entries: ReadingEntry[]; dayNumber: number } | null {
  const { plan, suggestions, devotionLogs } = params;
  if (!plan) {
    return null;
  }

  const suggestion = suggestions.find(item => item.key === plan.key);
  if (!suggestion || suggestion.days.length === 0) {
    return null;
  }

  const todayIso = toLocalIsoDate(startOfDay(new Date()));
  const completedSinceStart = Object.entries(devotionLogs ?? {}).filter(
    ([date, log]) =>
      Boolean(log?.completed) && date >= plan.startDate && date < todayIso,
  ).length;

  const index = completedSinceStart % suggestion.days.length;
  const planDay = suggestion.days[index];

  if (!planDay || planDay.entries.length === 0) {
    return null;
  }

  return { entries: planDay.entries, dayNumber: planDay.day };
}
