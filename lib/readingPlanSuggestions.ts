import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
} from '../components/data/bibleMetadata';
import { ReadingEntry, normalizeReadingEntries } from './readingEntries';

export type ReadingPlanSuggestion = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  entries: ReadingEntry[];
  days: ReadingPlanDay[];
};

export type ReadingPlanDay = {
  day: number;
  entries: ReadingEntry[];
};

type ReadingLogLike = {
  completed?: boolean | null;
  reading_book?: string | null;
  reading_chapter?: number | null;
  chapters_read?: number | null;
  selected_chapters?: number[] | null;
  reading_entries?: ReadingEntry[] | null;
};

type ReadingPlanStrings = {
  bibleYearTitle: string;
  bibleYearSubtitle: string;
  bibleYearBadge: string;
  newTestamentTitle: string;
  newTestamentSubtitle: string;
  newTestamentBadge: string;
  topicalPeaceTitle: string;
  topicalPeaceSubtitle: string;
  topicalPeaceBadge: string;
  topicalWisdomTitle: string;
  topicalWisdomSubtitle: string;
  topicalWisdomBadge: string;
  paceTitle: string;
  paceSubtitle: (chapters: number) => string;
  paceBadge: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getBook = (bookName: string) =>
  BIBLE_BOOKS.find(book => book.bookName === bookName);

const getBookName = (bookName: string) =>
  BIBLE_BOOKS.find(book => book.bookName.trim() === bookName.trim())
    ?.bookName ?? bookName;

const getNextBook = (bookName: string) => {
  const index = BIBLE_BOOKS.findIndex(book => book.bookName === bookName);
  return index >= 0 ? BIBLE_BOOKS[index + 1] : undefined;
};

export function buildSequentialReadingEntries(
  books: typeof BIBLE_BOOKS,
  chaptersPerDay: number,
  startBookName = books[0]?.bookName,
  startChapter = 1,
): ReadingEntry[] {
  const entries: ReadingEntry[] = [];
  let remaining = Math.max(Math.floor(chaptersPerDay), 1);
  let bookIndex = books.findIndex(book => book.bookName === startBookName);
  let chapter = Math.max(Math.floor(startChapter), 1);

  if (bookIndex < 0) {
    bookIndex = 0;
    chapter = 1;
  }

  while (remaining > 0 && bookIndex < books.length) {
    const book = books[bookIndex];
    const selectedChapters: number[] = [];

    while (remaining > 0 && chapter <= book.chapters) {
      selectedChapters.push(chapter);
      chapter += 1;
      remaining -= 1;
    }

    if (selectedChapters.length > 0) {
      entries.push({
        reading_book: book.bookName,
        selected_chapters: selectedChapters,
      });
    }

    if (chapter > book.chapters) {
      bookIndex += 1;
      chapter = 1;
    }
  }

  return normalizeReadingEntries(entries);
}

export function buildSequentialReadingDays(
  books: typeof BIBLE_BOOKS,
  days: number,
  chaptersPerDay: number,
  startBookName = books[0]?.bookName,
  startChapter = 1,
): ReadingPlanDay[] {
  const planDays: ReadingPlanDay[] = [];
  let bookIndex = books.findIndex(book => book.bookName === startBookName);
  let chapter = Math.max(Math.floor(startChapter), 1);

  if (bookIndex < 0) {
    bookIndex = 0;
    chapter = 1;
  }

  for (let day = 1; day <= days && bookIndex < books.length; day += 1) {
    const entries: ReadingEntry[] = [];
    let remaining = Math.max(Math.floor(chaptersPerDay), 1);

    while (remaining > 0 && bookIndex < books.length) {
      const book = books[bookIndex];
      const selectedChapters: number[] = [];

      while (remaining > 0 && chapter <= book.chapters) {
        selectedChapters.push(chapter);
        chapter += 1;
        remaining -= 1;
      }

      if (selectedChapters.length > 0) {
        entries.push({
          reading_book: book.bookName,
          selected_chapters: selectedChapters,
        });
      }

      if (chapter > book.chapters) {
        bookIndex += 1;
        chapter = 1;
      }
    }

    if (entries.length > 0) {
      planDays.push({
        day,
        entries: normalizeReadingEntries(entries),
      });
    }
  }

  return planDays;
}

const normalizeLogEntries = (log: ReadingLogLike): ReadingEntry[] => {
  if (Array.isArray(log.reading_entries)) {
    return normalizeReadingEntries(log.reading_entries);
  }

  if (!log.reading_book) {
    return [];
  }

  const book = getBook(log.reading_book);
  const chapters = Array.isArray(log.selected_chapters)
    ? log.selected_chapters
    : Array.from(
        { length: Math.max(log.chapters_read ?? 1, 1) },
        (_, index) => (log.reading_chapter ?? 1) + index,
      );

  return normalizeReadingEntries([
    {
      reading_book: log.reading_book,
      selected_chapters: chapters.filter(
        chapter => chapter >= 1 && chapter <= (book?.chapters ?? 0),
      ),
    },
  ]);
};

const estimateCurrentPace = (logs: Record<string, ReadingLogLike>) => {
  const completedLogs = Object.entries(logs)
    .filter(([, log]) => log.completed)
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .slice(0, 14)
    .map(([, log]) => normalizeLogEntries(log))
    .filter(entries => entries.length > 0);

  if (!completedLogs.length) {
    return 1;
  }

  const totalChapters = completedLogs.reduce(
    (total, entries) =>
      total +
      entries.reduce(
        (entryTotal, entry) => entryTotal + entry.selected_chapters.length,
        0,
      ),
    0,
  );

  return clamp(Math.round(totalChapters / completedLogs.length), 1, 6);
};

const getNextReadingStart = (logs: Record<string, ReadingLogLike>) => {
  const latestLog = Object.entries(logs)
    .filter(([, log]) => log.completed)
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))[0]?.[1];
  const latestEntries = latestLog ? normalizeLogEntries(latestLog) : [];
  const latestEntry = latestEntries[latestEntries.length - 1];

  if (!latestEntry) {
    return {
      bookName: BIBLE_BOOKS[0].bookName,
      chapter: 1,
    };
  }

  const book = getBook(latestEntry.reading_book);
  const latestChapter = latestEntry.selected_chapters[
    latestEntry.selected_chapters.length - 1
  ];

  if (book && latestChapter < book.chapters) {
    return {
      bookName: book.bookName,
      chapter: latestChapter + 1,
    };
  }

  const nextBook = getNextBook(latestEntry.reading_book);
  return {
    bookName: nextBook?.bookName ?? BIBLE_BOOKS[0].bookName,
    chapter: 1,
  };
};

export function buildReadingPlanSuggestions(
  strings: ReadingPlanStrings,
  devotionLogs: Record<string, ReadingLogLike> = {},
): ReadingPlanSuggestion[] {
  const pace = estimateCurrentPace(devotionLogs);
  const nextStart = getNextReadingStart(devotionLogs);
  const bibleYearDays = buildSequentialReadingDays(BIBLE_BOOKS, 365, 4);
  const newTestamentDays = buildSequentialReadingDays(
    NEW_TESTAMENT_BOOKS,
    90,
    3,
  );
  const peaceDays = [
    {
      day: 1,
      entries: normalizeReadingEntries([
        { reading_book: getBookName('سفر المزامير'), selected_chapters: [23] },
      ]),
    },
    {
      day: 2,
      entries: normalizeReadingEntries([
        { reading_book: getBookName('إنجيل يوحنا'), selected_chapters: [14] },
      ]),
    },
    {
      day: 3,
      entries: normalizeReadingEntries([
        {
          reading_book: getBookName('رسالة بولس الرسول إلى أهل فيلبي'),
          selected_chapters: [4],
        },
      ]),
    },
  ];
  const wisdomDays = [
    {
      day: 1,
      entries: normalizeReadingEntries([
        { reading_book: getBookName('سفر الأمثال'), selected_chapters: [1] },
      ]),
    },
    {
      day: 2,
      entries: normalizeReadingEntries([
        { reading_book: getBookName('رسالة يعقوب'), selected_chapters: [1] },
      ]),
    },
  ];
  const paceDays = buildSequentialReadingDays(
    BIBLE_BOOKS,
    7,
    pace,
    nextStart.bookName,
    nextStart.chapter,
  );

  return [
    {
      key: 'bible-year',
      icon: 'calendar-check',
      title: strings.bibleYearTitle,
      subtitle: strings.bibleYearSubtitle,
      badge: strings.bibleYearBadge,
      entries: bibleYearDays[0]?.entries ?? [],
      days: bibleYearDays,
    },
    {
      key: 'new-testament-3-months',
      icon: 'book-open-page-variant',
      title: strings.newTestamentTitle,
      subtitle: strings.newTestamentSubtitle,
      badge: strings.newTestamentBadge,
      entries: newTestamentDays[0]?.entries ?? [],
      days: newTestamentDays,
    },
    {
      key: 'topical-peace',
      icon: 'heart-outline',
      title: strings.topicalPeaceTitle,
      subtitle: strings.topicalPeaceSubtitle,
      badge: strings.topicalPeaceBadge,
      entries: peaceDays[0].entries,
      days: peaceDays,
    },
    {
      key: 'topical-wisdom',
      icon: 'lightbulb-outline',
      title: strings.topicalWisdomTitle,
      subtitle: strings.topicalWisdomSubtitle,
      badge: strings.topicalWisdomBadge,
      entries: wisdomDays[0].entries,
      days: wisdomDays,
    },
    {
      key: 'current-pace',
      icon: 'speedometer',
      title: strings.paceTitle,
      subtitle: strings.paceSubtitle(pace),
      badge: strings.paceBadge,
      entries: paceDays[0]?.entries ?? [],
      days: paceDays,
    },
  ];
}
