jest.mock('../lib/supbase', () => ({
  from: jest.fn(),
}));

import { buildReadingLogEntries } from '../lib/readingLog';

describe('buildReadingLogEntries', () => {
  it('builds one row per unique selected chapter', () => {
    expect(
      buildReadingLogEntries({
        userId: 'user-1',
        date: '2026-04-12',
        readingBook: 'سفر التكوين',
        selectedChapters: [3, 1, 3, 2],
      }),
    ).toEqual([
      {
        user_id: 'user-1',
        book_id: '1',
        chapter: 1,
        date: '2026-04-12',
      },
      {
        user_id: 'user-1',
        book_id: '1',
        chapter: 2,
        date: '2026-04-12',
      },
      {
        user_id: 'user-1',
        book_id: '1',
        chapter: 3,
        date: '2026-04-12',
      },
    ]);
  });

  it('returns an empty list when the book cannot be mapped', () => {
    expect(
      buildReadingLogEntries({
        userId: 'user-1',
        date: '2026-04-12',
        readingBook: 'كتاب غير موجود',
        selectedChapters: [1],
      }),
    ).toEqual([]);
  });
});
