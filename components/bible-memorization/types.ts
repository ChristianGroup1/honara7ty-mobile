import { BibleBook } from '../data/bibleMetadata';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type VerseSelectionMode = 'single' | 'range';

export interface WordSlot {
  word: string;
  hidden: boolean;
  userInput: string;
  correct?: boolean;
}

export interface MemorizationSelection {
  selectedBook: BibleBook;
  selectedChapter: number;
  selectedVerseStart: number;
  selectedVerseEnd: number;
  verseMode: VerseSelectionMode;
  difficulty: Difficulty;
  verseOriginal: string;
  bookLabel: string;
  chapterLabel: string;
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
};
