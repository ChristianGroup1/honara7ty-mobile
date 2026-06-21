import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  getBibleBooksForTranslation,
} from '../components/data/bibleMetadata';

describe('bibleMetadata', () => {
  it('builds the 66 canonical books from local json', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(OLD_TESTAMENT_BOOKS).toHaveLength(39);
    expect(NEW_TESTAMENT_BOOKS).toHaveLength(27);
  });

  it('preserves expected ordering and ids', () => {
    expect(BIBLE_BOOKS[0]).toMatchObject({
      bookID: '1',
      bookName: 'سفر التكوين',
      testament: 'old',
      localBookIndex: 0,
    });
    expect(BIBLE_BOOKS[39]).toMatchObject({
      bookID: '40',
      helloAoBookID: 'MAT',
      bookName: 'إنجيل متى',
      testament: 'new',
    });
    expect(BIBLE_BOOKS[65]).toMatchObject({
      bookID: '66',
      helloAoBookID: 'REV',
      bookName: 'سفر رؤيا يوحنا اللاهوتي',
      testament: 'new',
    });
  });

  it('exposes chapter data for local readers and memorization', () => {
    expect(BIBLE_BOOKS[0].chapters).toBeGreaterThan(0);
    expect(
      BIBLE_BOOKS[0].chaptersData[0].verses[0].text.length,
    ).toBeGreaterThan(0);
  });

  it('exposes offline translation data for the reader', () => {
    expect(BIBLE_TRANSLATIONS.map(translation => translation.id)).toEqual([
      'local_bible',
      'arb_nav',
    ]);

    const navBooks = getBibleBooksForTranslation('arb_nav');

    expect(navBooks).toHaveLength(66);
    expect(navBooks[0].chaptersData[0].verses[0].text).toContain(
      'خَلَقَ اللهُ',
    );
  });
});
