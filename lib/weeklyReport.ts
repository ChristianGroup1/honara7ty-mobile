import { computeStreak } from '../components/badges/utils';
import { DevotionDayLog } from '../components/devotion-calendar/types';
import { getMemorizationStats } from './memorization';
import {
  normalizeReadingEntries,
  readingEntriesFromLegacy,
} from './readingEntries';
import {
  readCachedDevotionLogs,
  readCachedPrayerNotes,
  readCachedReflections,
  refreshDevotionLogs,
  refreshPrayerNotes,
  refreshReflections,
} from './offlineSync';

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  totalDays: number;
  devotionDays: number;
  streak: number;
  chaptersRead: number;
  newPrayers: number;
  answeredPrayers: number;
  reflections: number;
  versesMemorized: number;
};

const toLocalIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/** Sunday is treated as the first day of the week to match memorization stats. */
const startOfWeek = (today: Date) => {
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const countChaptersForLog = (log: DevotionDayLog): number => {
  const entries =
    Array.isArray(log.reading_entries) && log.reading_entries.length > 0
      ? normalizeReadingEntries(log.reading_entries)
      : readingEntriesFromLegacy({
          readingBook: log.reading_book,
          readingChapter: log.reading_chapter,
          chaptersRead: log.chapters_read,
          selectedChapters: log.selected_chapters,
        });

  return entries.reduce(
    (total, entry) => total + entry.selected_chapters.length,
    0,
  );
};

const isWithinWeek = (isoDate: string, weekStartIso: string, weekEndIso: string) =>
  isoDate >= weekStartIso && isoDate <= weekEndIso;

/**
 * Builds a "your week with God" summary from devotion logs, prayer notes,
 * reflections, and memorization activity for the current week (Sunday → today).
 *
 * Pass `useCacheOnly` for an instant first paint from local storage, then call
 * again without it to refresh from the network.
 */
export async function buildWeeklyReport(
  userId: string,
  useCacheOnly = false,
): Promise<WeeklyReport> {
  const today = startOfToday();
  const weekStartIso = toLocalIsoDate(startOfWeek(today));
  const weekEndIso = toLocalIsoDate(today);
  const totalDays = today.getDay() + 1;

  const [devotionLogs, prayers, reflections, memStats] = await Promise.all([
    (useCacheOnly
      ? readCachedDevotionLogs(userId)
      : refreshDevotionLogs(userId).then(result => result.data)
    ).catch(() => ({} as Record<string, DevotionDayLog>)),
    (useCacheOnly
      ? readCachedPrayerNotes(userId)
      : refreshPrayerNotes(userId).then(result => result.data)
    ).catch(() => []),
    (useCacheOnly
      ? readCachedReflections(userId)
      : refreshReflections(userId).then(result => result.data)
    ).catch(() => []),
    getMemorizationStats().catch(() => null),
  ]);

  const completedDates = Object.entries(devotionLogs)
    .filter(([, log]) => log?.completed)
    .map(([date]) => date);
  const streak = computeStreak(completedDates);

  let devotionDays = 0;
  let chaptersRead = 0;
  Object.entries(devotionLogs).forEach(([date, log]) => {
    if (log?.completed && isWithinWeek(date, weekStartIso, weekEndIso)) {
      devotionDays += 1;
      chaptersRead += countChaptersForLog(log);
    }
  });

  const newPrayers = prayers.filter(prayer =>
    isWithinWeek(
      toLocalIsoDate(new Date(prayer.created_at)),
      weekStartIso,
      weekEndIso,
    ),
  ).length;
  const answeredPrayers = prayers.filter(prayer => prayer.is_answered).length;
  const reflectionsCount = reflections.filter(reflection =>
    isWithinWeek(reflection.date, weekStartIso, weekEndIso),
  ).length;
  const versesMemorized = memStats?.thisWeekCount ?? 0;

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    totalDays,
    devotionDays,
    streak,
    chaptersRead,
    newPrayers,
    answeredPrayers,
    reflections: reflectionsCount,
    versesMemorized,
  };
}

export const isWeeklyReportEmpty = (report: WeeklyReport) =>
  report.devotionDays === 0 &&
  report.chaptersRead === 0 &&
  report.newPrayers === 0 &&
  report.reflections === 0 &&
  report.versesMemorized === 0;
