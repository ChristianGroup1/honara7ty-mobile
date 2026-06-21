import { BIBLE_BOOKS } from '../components/data/bibleMetadata';
import { getNextDevotionReadingDraft } from '../lib/readingEntries';

describe('getNextDevotionReadingDraft', () => {
  it('starts at Genesis 1 when there is no completed devotion', () => {
    const draft = getNextDevotionReadingDraft({});

    expect(draft).toEqual({
      entries: [
        {
          reading_book: BIBLE_BOOKS[0].bookName,
          selected_chapters: [1],
        },
      ],
      testament: 'old',
    });
  });

  it('continues from the next chapter after the latest completed devotion', () => {
    const draft = getNextDevotionReadingDraft({
      '2026-06-19': {
        completed: true,
        reading_entries: [
          {
            reading_book: BIBLE_BOOKS[0].bookName,
            selected_chapters: [1],
          },
        ],
      },
      '2026-06-20': {
        completed: false,
      },
    });

    expect(draft).toEqual({
      entries: [
        {
          reading_book: BIBLE_BOOKS[0].bookName,
          selected_chapters: [2],
        },
      ],
      testament: 'old',
    });
  });
});
