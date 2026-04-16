import { Difficulty, WordSlot } from './types';
import { getStrings } from '../../localization';

export const NAVY = '#0A1124';
export const GOLD = '#C9A84C';

const memorizationStrings = getStrings().bibleMemorization;

export const DIFFICULTY_LEVELS = {
  easy: { label: memorizationStrings.difficultyLevels.easy, hideRatio: 0.2 },
  medium: {
    label: memorizationStrings.difficultyLevels.medium,
    hideRatio: 0.35,
  },
  hard: { label: memorizationStrings.difficultyLevels.hard, hideRatio: 0.5 },
  fullText: {
    label: memorizationStrings.difficultyLevels.fullText,
    hideRatio: 1,
  },
} as const;

const MIN_WORD_LENGTH = 3;

export function stripVerseNumber(text: string): string {
  return text.replace(/^[\u0660-\u0669\d]+\s/, '');
}

export function normalizeArabicAnswer(text: string): string {
  return stripVerseNumber(text)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[،.؟!:؛\u060C\u061B\u061F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSlots(
  verseText: string,
  difficulty: Difficulty,
): WordSlot[] {
  const clean = stripVerseNumber(verseText);
  const words = clean.split(' ').filter(w => w.trim());

  if (difficulty === 'fullText') {
    return words.map(word => ({
      word,
      hidden: true,
      userInput: '',
    }));
  }

  const candidates = words
    .map((w, i) => ({ i, w }))
    .filter(({ w }) => w.replace(/[،.؟!:؛]/g, '').length >= MIN_WORD_LENGTH);
  const hideCount = Math.max(
    1,
    Math.round(candidates.length * DIFFICULTY_LEVELS[difficulty].hideRatio),
  );
  const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
  const hiddenIndices = new Set(shuffled.slice(0, hideCount).map(({ i }) => i));

  return words.map((word, i) => ({
    word,
    hidden: hiddenIndices.has(i),
    userInput: '',
  }));
}

export function buildFullTextResultSlots(
  verseText: string,
  userText: string,
): WordSlot[] {
  const expectedWords = stripVerseNumber(verseText)
    .split(' ')
    .filter(word => word.trim());
  const userWords = userText
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);

  return expectedWords.map((word, index) => {
    const userInput = userWords[index] ?? '';
    return {
      word,
      hidden: true,
      userInput,
      correct:
        normalizeArabicAnswer(userInput) === normalizeArabicAnswer(word),
    };
  });
}
