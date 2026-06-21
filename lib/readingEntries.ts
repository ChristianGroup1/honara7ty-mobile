import { BIBLE_BOOKS, Testament } from '../components/data/bibleMetadata';
import {
  chaptersFromLegacy,
  normalizeSelectedChapters,
} from '../components/shared/chapterSelection';

export type ReadingEntry = {
  reading_book: string;
  selected_chapters: number[];
};

export type DevotionLogLike = {
  completed?: boolean | null;
  reading_book?: string | null;
  reading_chapter?: number | null;
  chapters_read?: number | null;
  selected_chapters?: number[] | null;
  reading_entries?: ReadingEntry[] | null;
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

const devotionLogEntries = (log: DevotionLogLike): ReadingEntry[] => {
  if (Array.isArray(log.reading_entries)) {
    return normalizeReadingEntries(log.reading_entries);
  }

  return readingEntriesFromLegacy({
    readingBook: log.reading_book,
    readingChapter: log.reading_chapter,
    chaptersRead: log.chapters_read,
    selectedChapters: log.selected_chapters,
  });
};

const getNextBook = (bookName: string) => {
  const index = BIBLE_BOOKS.findIndex(book => book.bookName === bookName);
  return index >= 0 ? BIBLE_BOOKS[index + 1] : BIBLE_BOOKS[0];
};

/** Suggests the next chapter after the user's most recent completed devotion. */
export function getNextDevotionReadingDraft(
  logs: Record<string, DevotionLogLike>,
): { entries: ReadingEntry[]; testament: Testament } | null {
  const latestLog = Object.entries(logs)
    .filter(([, log]) => log.completed)
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))[0]?.[1];
  const latestEntries = latestLog ? devotionLogEntries(latestLog) : [];
  const latestEntry = latestEntries[latestEntries.length - 1];

  let bookName = BIBLE_BOOKS[0].bookName;
  let chapter = 1;

  if (latestEntry) {
    const book = BIBLE_BOOKS.find(item => item.bookName === latestEntry.reading_book);
    const latestChapter =
      latestEntry.selected_chapters[latestEntry.selected_chapters.length - 1];

    if (book && latestChapter < book.chapters) {
      bookName = book.bookName;
      chapter = latestChapter + 1;
    } else {
      const nextBook = getNextBook(latestEntry.reading_book);
      bookName = nextBook?.bookName ?? BIBLE_BOOKS[0].bookName;
      chapter = 1;
    }
  }

  const matchedBook = BIBLE_BOOKS.find(book => book.bookName === bookName);
  if (!matchedBook) {
    return null;
  }

  const entries = normalizeReadingEntries([
    { reading_book: bookName, selected_chapters: [chapter] },
  ]);

  if (!entries.length) {
    return null;
  }

  return { entries, testament: matchedBook.testament };
}
