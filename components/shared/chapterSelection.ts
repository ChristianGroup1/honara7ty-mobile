export const normalizeSelectedChapters = (
  selectedChapters: number[],
  maxChapter: number,
) => {
  const uniqueSorted = Array.from(
    new Set(
      selectedChapters.filter(
        chapter => Number.isInteger(chapter) && chapter >= 1 && chapter <= maxChapter,
      ),
    ),
  ).sort((a, b) => a - b);

  return uniqueSorted;
};

export const chaptersFromLegacy = (
  readingChapter?: number | null,
  chapterCount?: number | null,
  maxChapter = 1,
) => {
  const start = Math.max(1, Number(readingChapter ?? 1));
  const count = Math.max(1, Number(chapterCount ?? 1));
  const end = Math.min(start + count - 1, maxChapter);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const firstSelectedChapter = (selectedChapters: number[]) =>
  normalizeSelectedChapters(selectedChapters, Math.max(...selectedChapters, 1))[0] ??
  null;

export const toggleChapterSelection = (
  selectedChapters: number[],
  chapter: number,
  maxChapter: number,
) => {
  const normalized = normalizeSelectedChapters(selectedChapters, maxChapter);

  if (normalized.includes(chapter)) {
    return normalized.filter(value => value !== chapter);
  }

  return normalizeSelectedChapters([...normalized, chapter], maxChapter);
};
