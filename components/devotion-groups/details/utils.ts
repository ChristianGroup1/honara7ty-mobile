import { getStrings } from '../../../localization';
import {
  DevotionGroupMember,
  GroupMemberStatus,
} from '../../../lib/devotionGroups';
import { computeStreak } from '../../badges/utils';
import { CUSTOM_TARGET_VALUE, TARGET_DAY_OPTIONS } from './constants';
import {
  formatReadingEntries,
  readingEntriesFromLegacy,
} from '../../../lib/readingEntries';

export type PersonalGroupStats = {
  completedDays: number;
  currentStreak: number;
  commitmentRate: number;
};

export const roleLabels = (role: DevotionGroupMember['role']) => {
  const strings = getStrings().devotionGroups;
  if (role === 'owner') {
    return strings.owner;
  }
  if (role === 'leader') {
    return strings.leader;
  }
  return strings.member;
};

export const formatMemberReading = (member: GroupMemberStatus) => {
  const strings = getStrings().devotionGroups;
  const log = member.devotionLog;

  if (!log?.completed) {
    return strings.notCompleted;
  }

  const entriesText = formatReadingEntries(
    log.reading_entries ??
      readingEntriesFromLegacy({
        readingBook: log.reading_book,
        readingChapter: log.reading_chapter,
        chaptersRead: log.chapters_read,
        selectedChapters: log.selected_chapters,
      }),
  );

  if (entriesText) {
    return entriesText;
  }

  if (!log.reading_book) {
    return strings.noReadingDetails;
  }

  const chapters = Array.isArray(log.selected_chapters)
    ? log.selected_chapters.join(', ')
    : log.reading_chapter;

  return chapters ? `${log.reading_book} ${chapters}` : log.reading_book;
};

export const formatSharedReading = (
  readingBook?: string | null,
  selectedChapters?: number[] | null,
) => {
  const strings = getStrings().devotionGroups;
  if (!readingBook) {
    return strings.noSharedReading;
  }
  const chapters = Array.isArray(selectedChapters)
    ? selectedChapters.join(', ')
    : '';
  return chapters ? `${readingBook} ${chapters}` : readingBook;
};

export const formatSharedTarget = (targetDays?: number | null) => {
  const strings = getStrings().devotionGroups;
  if (!targetDays) {
    return strings.noSharedTarget;
  }
  if (targetDays === 7) {
    return strings.targetOneWeek;
  }
  if (targetDays === 30) {
    return strings.targetOneMonth;
  }
  if (targetDays === 60) {
    return strings.targetTwoMonths;
  }
  return strings.targetDays(targetDays);
};

export const isPresetTargetDays = (targetDays: number | null) =>
  targetDays === null || TARGET_DAY_OPTIONS.some(option => option === targetDays);

export const getTargetEditorValue = (targetDays?: number | null) =>
  isPresetTargetDays(targetDays ?? null) ? targetDays ?? null : CUSTOM_TARGET_VALUE;

export const buildPersonalGroupStats = (
  logsByDate: Record<string, any>,
  joinedAt?: string | null,
): PersonalGroupStats => {
  const joinedDate = joinedAt ? joinedAt.slice(0, 10) : null;
  const logs = Object.entries(logsByDate).filter(
    ([date]) => !joinedDate || date >= joinedDate,
  );
  const completedDates = logs
    .filter(([, log]) => Boolean(log?.completed))
    .map(([date]) => date);
  const commitmentRate =
    logs.length > 0 ? Math.round((completedDates.length / logs.length) * 100) : 0;

  return {
    completedDays: completedDates.length,
    currentStreak: computeStreak(completedDates),
    commitmentRate,
  };
};
