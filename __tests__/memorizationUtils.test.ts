import {
  buildFullTextResultSlots,
  buildSlots,
} from '../components/bible-memorization/utils';

describe('memorization utils', () => {
  it('marks every word as writable in full-text mode', () => {
    const slots = buildSlots('1 في البدء كان الكلمة', 'fullText');

    expect(slots).toHaveLength(4);
    expect(slots.every(slot => slot.hidden)).toBe(true);
  });

  it('compares full-text answers word by word after normalization', () => {
    const slots = buildFullTextResultSlots(
      '1 فِي الْبَدْءِ كَانَ الْكَلِمَةُ',
      'في البدء كان الكلمه',
    );

    expect(slots).toHaveLength(4);
    expect(slots.every(slot => slot.correct)).toBe(true);
  });

  it('keeps track of the exact word position that is wrong', () => {
    const slots = buildFullTextResultSlots(
      '1 في البدء كان الكلمة',
      'في البدء صار الكلمة',
    );

    expect(slots.map(slot => slot.correct)).toEqual([true, true, false, true]);
    expect(slots[2].userInput).toBe('صار');
    expect(slots[2].word).toBe('كان');
  });
});
