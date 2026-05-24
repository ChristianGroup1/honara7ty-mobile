import { BIBLE_BOOKS } from '../components/data/bibleMetadata';
import {
  chaptersFromLegacy,
  normalizeSelectedChapters,
} from '../components/shared/chapterSelection';

export type ReadingEntry = {
  reading_book: string;
  selected_chapters: number[];
};

export function normalizeReadingEntries(
  entries?: ReadingEntry[] | null,
): ReadingEntry[] {
  return (entries ?? [])
    .map(entry => {
      const book = BIBLE_BOOKS.find(item => item.bookName === entry.reading_book);
      return {
        reading_book: entry.reading_book,
        selected_chapters: normalizeSelectedChapters(
          entry.selected_chapters?.map(Number) ?? [],
          book?.chapters ?? 0,
        ),
      };
    })
    .filter(entry => entry.reading_book && entry.selected_chapters.length > 0);
}

export function readingEntriesFromLegacy(params: {
  readingBook?: string | null;
  readingChapter?: number | null;
  chaptersRead?: number | null;
  selectedChapters?: number[] | null;
}) {
  if (!params.readingBook) {
    return [];
  }

  const book = BIBLE_BOOKS.find(item => item.bookName === params.readingBook);
  const chapters = Array.isArray(params.selectedChapters)
    ? normalizeSelectedChapters(params.selectedChapters.map(Number), book?.chapters ?? 0)
    : chaptersFromLegacy(
        params.readingChapter,
        params.chaptersRead,
        book?.chapters ?? 0,
      );

  return normalizeReadingEntries([
    {
      reading_book: params.readingBook,
      selected_chapters: chapters,
    },
  ]);
}

export function mergeReadingDraft(
  entries: ReadingEntry[],
  readingBook: string,
  selectedChapters: number[],
) {
  const existing = entries.find(entry => entry.reading_book === readingBook);
  const mergedChapters = existing
    ? [...existing.selected_chapters, ...selectedChapters]
    : selectedChapters;

  return normalizeReadingEntries([
    ...entries.filter(entry => entry.reading_book !== readingBook),
    {
      reading_book: readingBook,
      selected_chapters: mergedChapters,
    },
  ]);
}

export function formatReadingEntries(entries?: ReadingEntry[] | null) {
  return normalizeReadingEntries(entries)
    .map(entry => `${entry.reading_book} ${entry.selected_chapters.join(', ')}`)
    .join('، ');
}
