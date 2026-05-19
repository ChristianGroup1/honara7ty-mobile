import { BibleBook } from '../data/bibleMetadata';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'fullText';
export type VerseSelectionMode = 'single' | 'multi';

export interface WordSlot {
  word: string;
  hidden: boolean;
  userInput: string;
  correct?: boolean;
}

export interface MemorizationSelection {
  selectedBook: BibleBook;
  selectedChapter: number;
  selectedVerses: number[];
  verseMode: VerseSelectionMode;
  difficulty: Difficulty;
  verseOriginal: string;
  bookLabel: string;
  chapterLabel: string;
  timeSeconds?: number;
}

export interface MemorizationResult extends MemorizationSelection {
  slots: WordSlot[];
  score: number;
  total: number;
}

export type MemorizationStackParamList = {
  Pick: undefined;
  Recite: MemorizationSelection;
  Result: MemorizationResult;
  Stats: undefined;
};
