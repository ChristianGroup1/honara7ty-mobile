import { Testament } from '../data/bibleMetadata';

export const testamentLabels: Record<Testament, string> = {
  old: 'العهد القديم',
  new: 'العهد الجديد',
};

export const LAST_READING_POSITION_KEY = 'honara7ty:bible-reader:last-position';
export const READING_SETTINGS_KEY = 'honara7ty:bible-reader:settings';
export const FAVORITE_VERSES_KEY = 'honara7ty:bible-reader:favorite-verses';

export const MIN_VERSE_FONT_SIZE = 14;
export const MAX_VERSE_FONT_SIZE = 24;
export const DEFAULT_VERSE_FONT_SIZE = 17;

export const VERSE_TEXT_COLORS = [
  'default',
  '#0A1124',
  '#33506E',
  '#B42318',
] as const;

export const MAX_SEARCH_RESULTS = 50;

export const HIGHLIGHT_COLORS = [
  '#FFF1A8',
  '#D9F99D',
  '#BFDBFE',
  '#FBCFE8',
] as const;
