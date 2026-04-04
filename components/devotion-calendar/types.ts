import { Testament } from '../data/bibleMetadata';

export type DevotionDayLog = {
  completed: boolean;
  reading_book?: string | null;
  reading_chapter?: number | null;
  chapters_read?: number | null;
};

export type CalendarCell = {
  key: string;
  dayNumber?: number;
  isoDate?: string;
  completed: boolean;
  today: boolean;
  empty?: boolean;
};

export type TestamentOption = {
  key: Testament;
  label: string;
  icon: string;
};
