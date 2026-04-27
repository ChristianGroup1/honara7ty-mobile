import supabase from './supbase';
import { BIBLE_BOOKS } from '../components/data/bibleMetadata';

type SyncReadingLogParams = {
  userId: string;
  date: string;
  completed: boolean;
  readingBook?: string | null;
  selectedChapters?: number[] | null;
};

type ReadingLogEntry = {
  user_id: string;
  book_id: string;
  chapter: number;
  date: string;
};

export function buildReadingLogEntries({
  userId,
  date,
  readingBook,
  selectedChapters,
}: Omit<SyncReadingLogParams, 'completed'>): ReadingLogEntry[] {
  if (!readingBook || !selectedChapters?.length) {
    return [];
  }

  const matchedBook = BIBLE_BOOKS.find(book => book.bookName === readingBook);
  if (!matchedBook) {
    return [];
  }

  const chapters = Array.from(
    new Set(
      selectedChapters.filter(
        chapter => Number.isInteger(chapter) && chapter > 0,
      ),
    ),
  ).sort((left, right) => left - right);

  return chapters.map(chapter => ({
    user_id: userId,
    book_id: matchedBook.bookID,
    chapter,
    date,
  }));
}

export async function syncReadingLogForDate({
  userId,
  date,
  completed,
  readingBook,
  selectedChapters,
}: SyncReadingLogParams) {
  const entries = completed
    ? buildReadingLogEntries({
        userId,
        date,
        readingBook,
        selectedChapters,
      })
    : [];

  const { error: deleteError } = await supabase
    .from('reading_log')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);

  if (deleteError) {
    return { error: deleteError };
  }

  if (!entries.length) {
    return { error: null };
  }

  const { error: insertError } = await supabase
    .from('reading_log')
    .insert(entries);

  return { error: insertError };
}
