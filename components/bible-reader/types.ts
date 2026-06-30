import { BibleBook, Testament } from '../data/bibleMetadata';
import { HIGHLIGHT_COLORS, VERSE_TEXT_COLORS } from './constants';

export type OpenDropdown = 'testament' | 'book' | 'chapter' | null;

export type VerseTextColor = (typeof VERSE_TEXT_COLORS)[number];
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];
export type SavedVersesModalKind = 'favorites' | 'highlighted';

export interface SavedReadingPosition {
  testament: Testament;
  bookId: string;
  chapter: number;
}

export interface SavedReadingSettings {
  verseFontSize: number;
  verseTextColor: VerseTextColor;
  stripDiacritics: boolean;
  parallelLifeTranslation: boolean;
  inlineLifeTranslation: boolean;
}

export interface BibleSearchResult {
  key: string;
  book: BibleBook;
  chapter: number;
  verse: number;
  text: string;
}

export interface VerseAnnotation {
  favorite?: true;
  highlightColor?: HighlightColor;
}
