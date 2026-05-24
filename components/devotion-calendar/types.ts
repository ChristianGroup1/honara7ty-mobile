import { Testament } from '../data/bibleMetadata';
import type { ReadingEntry } from '../../lib/readingEntries';

export type DevotionDayLog = {
  completed: boolean;
  reading_book?: string | null;
  reading_chapter?: number | null;
  chapters_read?: number | null;
  selected_chapters?: number[] | null;
  reading_entries?: ReadingEntry[] | null;
  pendingSync?: boolean;
};

export type CalendarCell = {
  key: string;
  dayNumber?: number;
  isoDate?: string;
  completed: boolean;
  missed?: boolean;
  today: boolean;
  empty?: boolean;
};

export type TestamentOption = {
  key: Testament;
  label: string;
  icon: string;
};
