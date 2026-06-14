import { BADGE_CONFIGS } from '../components/badges/constants';
import { computeStreak } from '../components/badges/utils';
import { DevotionDayLog } from '../components/devotion-calendar/types';
import {
  readCachedDevotionLogs,
  readCachedProfileRecord,
  saveProfileRecord,
} from './offlineSync';

/** Points granted for every day the user completes their devotion. */
export const XP_PER_DEVOTION_DAY = 10;

/** Completed devotion days required to climb one level. */
export const DAYS_PER_LEVEL = 7;

/**
 * Base of the level-up reward. The reward scales with the level reached, so
 * reaching level `L` grants `LEVEL_UP_XP_BASE * L` bonus points.
 */
export const LEVEL_UP_XP_BASE = 100;

/** Spiritual level titles, indexed by (level - 1) and clamped to the last one. */
export const LEVEL_TITLES = [
  'بداية الطريق',
  'مثابر',
  'ثابت',
  'أمين',
  'مجاهد',
  'راسخ',
  'قدوة',
  'نور للعالم',
];

export type XpSummary = {
  xp: number;
  completedDays: number;
  streak: number;
  earnedBadges: number;
};

export type LevelInfo = {
  level: number;
  title: string;
  xp: number;
  daysForLevel: number;
  daysIntoLevel: number;
  daysToNextLevel: number;
  nextLevelBonusXp: number;
  progress: number;
};

/** Level is driven purely by activity: every `DAYS_PER_LEVEL` completed days. */
export function getLevelFromDays(completedDays: number): number {
  return Math.floor(Math.max(completedDays, 0) / DAYS_PER_LEVEL) + 1;
}

/** XP awarded for reaching a specific level (0 for the starting level 1). */
export function levelUpReward(level: number): number {
  return level <= 1 ? 0 : LEVEL_UP_XP_BASE * level;
}

/** Total bonus XP accumulated from every level-up up to `level`. */
export function totalLevelUpXp(level: number): number {
  const top = Math.max(level, 1);
  // Sum of LEVEL_UP_XP_BASE * k for k = 2..top.
  return LEVEL_UP_XP_BASE * ((top * (top + 1)) / 2 - 1);
}

/**
 * XP is kept separate from the level. It is the sum of:
 *  - daily points: `XP_PER_DEVOTION_DAY` for each completed devotion day, and
 *  - level-up rewards: a scaling bonus granted each time a new level is reached.
 */
export function computeTotalXp(completedDays: number): number {
  const days = Math.max(completedDays, 0);
  const dailyXp = days * XP_PER_DEVOTION_DAY;
  const level = getLevelFromDays(days);
  return dailyXp + totalLevelUpXp(level);
}

export function getLevelInfo(completedDays: number): LevelInfo {
  const days = Math.max(completedDays, 0);
  const level = getLevelFromDays(days);
  const daysIntoLevel = days % DAYS_PER_LEVEL;
  const daysToNextLevel = DAYS_PER_LEVEL - daysIntoLevel;

  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xp: computeTotalXp(days),
    daysForLevel: DAYS_PER_LEVEL,
    daysIntoLevel,
    daysToNextLevel,
    nextLevelBonusXp: levelUpReward(level + 1),
    progress: daysIntoLevel / DAYS_PER_LEVEL,
  };
}

/** Derives the full XP summary from a map of devotion logs. */
export function summarizeXpFromDevotionLogs(
  logs: Record<string, DevotionDayLog>,
): XpSummary {
  const completedDates = Object.entries(logs)
    .filter(([, log]) => log?.completed)
    .map(([date]) => date);
  const completedDays = completedDates.length;
  const streak = computeStreak(completedDates);
  const earnedBadges = BADGE_CONFIGS.filter(
    badge => streak >= badge.days,
  ).length;

  return {
    xp: computeTotalXp(completedDays),
    completedDays,
    streak,
    earnedBadges,
  };
}

/** Persists the XP value to the user's profile, skipping no-op writes. */
export async function persistProfileXp(
  userId: string,
  xp: number,
): Promise<void> {
  try {
    const cached = await readCachedProfileRecord(userId);
    if (cached?.xp === xp) {
      return;
    }
    await saveProfileRecord({ userId, profile: { xp } });
  } catch {
    /* XP persistence is best-effort; never block the UI on it. */
  }
}

/**
 * Recomputes XP from the locally cached devotion logs and persists it to the
 * profile. Call after a devotion is saved so daily points stay up to date.
 */
export async function refreshAndPersistProfileXp(
  userId: string,
): Promise<number> {
  const logs = await readCachedDevotionLogs(userId);
  const summary = summarizeXpFromDevotionLogs(logs);
  await persistProfileXp(userId, summary.xp);
  return summary.xp;
}
