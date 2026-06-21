import { getDailyVerse } from '../lib/dailyVerse';

describe('daily verse', () => {
  it('returns a stable verse for a given date', () => {
    const verses = [
      { text: 'first', reference: 'ref 1' },
      { text: 'second', reference: 'ref 2' },
      { text: 'third', reference: 'ref 3' },
    ];

    expect(getDailyVerse(verses, new Date(2026, 0, 1))).toEqual(verses[1]);
    expect(getDailyVerse(verses, new Date(2026, 0, 2))).toEqual(verses[2]);
  });

  it('returns null when no verses are configured', () => {
    expect(getDailyVerse([], new Date(2026, 0, 1))).toBeNull();
  });
});
