import { Difficulty, WordSlot } from './types';

export const NAVY = '#0A1124';
export const GOLD = '#C9A84C';

export const DIFFICULTY_LEVELS = {
  easy: { label: 'سهل', hideRatio: 0.2 },
  medium: { label: 'متوسط', hideRatio: 0.35 },
  hard: { label: 'صعب', hideRatio: 0.5 },
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
