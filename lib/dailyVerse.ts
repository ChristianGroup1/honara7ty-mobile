export interface DailyVerse {
  text: string;
  reference: string;
}

export const getDayOfYear = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
};

export const getDailyVerse = <T extends DailyVerse>(
  verses: readonly T[],
  date = new Date(),
) => {
  if (!verses.length) {
    return null;
  }

  return verses[getDayOfYear(date) % verses.length];
};
