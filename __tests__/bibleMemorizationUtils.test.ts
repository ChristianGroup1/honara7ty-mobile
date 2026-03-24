import {
  buildSlots,
  normalizeArabicAnswer,
  stripVerseNumber,
} from '../components/bible-memorization/utils';

describe('bible memorization utils', () => {
  it('strips leading verse numbers', () => {
    expect(stripVerseNumber('12 فِي الْبَدْءِ')).toBe('فِي الْبَدْءِ');
    expect(stripVerseNumber('٣ فِي الْبَدْءِ')).toBe('فِي الْبَدْءِ');
  });

  it('normalizes Arabic answers for tolerant comparison', () => {
    expect(normalizeArabicAnswer('١ اللهُ، رَؤُوفٌ!')).toBe('الله رووف');
    expect(normalizeArabicAnswer('آيةٌ جميلةة')).toBe('ايه جميلهه');
    expect(normalizeArabicAnswer('إِسرائيل   شعبٌ')).toBe('اسراييل شعب');
  });

  it('builds hidden word slots from verse text', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.2;

    const slots = buildSlots('1 هذا اختبار بسيط لكلمات متعددة وواضحة', 'medium');

    Math.random = originalRandom;

    expect(slots).toHaveLength(6);
    expect(slots.some(slot => slot.hidden)).toBe(true);
    expect(slots.every(slot => typeof slot.word === 'string')).toBe(true);
  });
});
