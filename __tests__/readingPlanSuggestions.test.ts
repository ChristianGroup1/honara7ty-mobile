import {
  buildReadingPlanSuggestions,
  buildSequentialReadingEntries,
} from '../lib/readingPlanSuggestions';
import { BIBLE_BOOKS } from '../components/data/bibleMetadata';

const strings = {
  bibleYearTitle: 'Bible in a year',
  bibleYearSubtitle: 'Four chapters daily',
  bibleYearBadge: '365 days',
  newTestamentTitle: 'New Testament',
  newTestamentSubtitle: 'Three chapters daily',
  newTestamentBadge: '90 days',
  topicalPeaceTitle: 'Peace',
  topicalPeaceSubtitle: 'Peace readings',
  topicalPeaceBadge: 'Topical',
  topicalWisdomTitle: 'Wisdom',
  topicalWisdomSubtitle: 'Wisdom readings',
  topicalWisdomBadge: 'Topical',
  paceTitle: 'Current pace',
  paceSubtitle: (chapters: number) => `${chapters} chapters daily`,
  paceBadge: 'Auto',
};

describe('reading plan suggestions', () => {
  it('builds sequential reading entries across book boundaries', () => {
    const entries = buildSequentialReadingEntries(
      BIBLE_BOOKS,
      3,
      'سفر التكوين',
      50,
    );

    expect(entries).toEqual([
      { reading_book: 'سفر التكوين', selected_chapters: [50] },
      { reading_book: 'سفر الخروج', selected_chapters: [1, 2] },
    ]);
  });

  it('includes fixed and topical reading plan suggestions', () => {
    const suggestions = buildReadingPlanSuggestions(strings);

    expect(suggestions.map(suggestion => suggestion.key)).toEqual([
      'bible-year',
      'new-testament-3-months',
      'topical-peace',
      'topical-wisdom',
      'current-pace',
    ]);
    expect(suggestions[0].entries[0]).toEqual({
      reading_book: 'سفر التكوين',
      selected_chapters: [1, 2, 3, 4],
    });
    expect(suggestions[0].days[1]).toEqual({
      day: 2,
      entries: [{ reading_book: 'سفر التكوين', selected_chapters: [5, 6, 7, 8] }],
    });
    expect(suggestions[2].days).toHaveLength(3);
  });

  it('continues from latest completed reading at the current pace', () => {
    const suggestions = buildReadingPlanSuggestions(strings, {
      '2026-06-09': {
        completed: true,
        reading_entries: [
          { reading_book: 'سفر التكوين', selected_chapters: [1, 2, 3] },
        ],
      },
      '2026-06-10': {
        completed: true,
        reading_entries: [
          { reading_book: 'سفر التكوين', selected_chapters: [4, 5, 6] },
        ],
      },
    });

    expect(suggestions[4].subtitle).toBe('3 chapters daily');
    expect(suggestions[4].entries[0]).toEqual({
      reading_book: 'سفر التكوين',
      selected_chapters: [7, 8, 9],
    });
  });
});
