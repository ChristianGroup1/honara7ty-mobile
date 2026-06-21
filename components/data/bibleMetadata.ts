export type Testament = 'old' | 'new';
export type BibleTranslationId = 'local_bible' | 'arb_nav';

interface BibleJsonVerse {
  verse: number;
  text: string;
}

interface BibleJsonChapter {
  chapter: number;
  verses: BibleJsonVerse[];
}

interface BibleJsonBook {
  name: string;
  chapters: BibleJsonChapter[];
}

interface BibleJsonData {
  books: BibleJsonBook[];
}

export interface BibleTranslation {
  id: BibleTranslationId;
  label: string;
  shortLabel: string;
  sourceName: string;
  textDirection: 'rtl' | 'ltr';
}

export interface BibleBookMeta {
  bookID: string;
  helloAoBookID: string;
  bookName: string;
  chapters: number;
  testament: Testament;
  localBookIndex: number;
}

export interface BibleBook extends BibleBookMeta {
  shortName: string;
  chaptersData: BibleJsonChapter[];
}

const bibleData = require('./bible.json') as BibleJsonData;

export const DEFAULT_BIBLE_TRANSLATION_ID: BibleTranslationId = 'local_bible';

export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  {
    id: 'local_bible',
    label: 'Bible JSON',
    shortLabel: 'JSON',
    sourceName: 'components/data/bible.json',
    textDirection: 'rtl',
  },
  {
    id: 'arb_nav',
    label: 'كتاب الحياة',
    shortLabel: 'NAV',
    sourceName: 'New Arabic Version (Book of Life)',
    textDirection: 'rtl',
  },
];

const getBibleTranslationData = (
  translationId: BibleTranslationId,
): BibleJsonData => {
  if (translationId === 'arb_nav') {
    return require('./bibleTranslations/arb_nav.json') as BibleJsonData;
  }

  return bibleData;
};

const BOOK_DEFINITIONS: Array<{
  apiBookID: string;
  helloAoBookID: string;
  displayName: string;
  testament: Testament;
}> = [
  {
    apiBookID: '1',
    helloAoBookID: 'GEN',
    displayName: 'سفر التكوين',
    testament: 'old',
  },
  {
    apiBookID: '2',
    helloAoBookID: 'EXO',
    displayName: 'سفر الخروج',
    testament: 'old',
  },
  {
    apiBookID: '3',
    helloAoBookID: 'LEV',
    displayName: 'سفر اللاويين',
    testament: 'old',
  },
  {
    apiBookID: '4',
    helloAoBookID: 'NUM',
    displayName: 'سفر العدد',
    testament: 'old',
  },
  {
    apiBookID: '5',
    helloAoBookID: 'DEU',
    displayName: 'سفر التثنية',
    testament: 'old',
  },
  {
    apiBookID: '6',
    helloAoBookID: 'JOS',
    displayName: 'سفر يشوع',
    testament: 'old',
  },
  {
    apiBookID: '7',
    helloAoBookID: 'JDG',
    displayName: 'سفر القضاة',
    testament: 'old',
  },
  {
    apiBookID: '8',
    helloAoBookID: 'RUT',
    displayName: 'سفر راعوث',
    testament: 'old',
  },
  {
    apiBookID: '9',
    helloAoBookID: '1SA',
    displayName: 'سفر صموئيل الأول',
    testament: 'old',
  },
  {
    apiBookID: '10',
    helloAoBookID: '2SA',
    displayName: 'سفر صموئيل الثاني',
    testament: 'old',
  },
  {
    apiBookID: '11',
    helloAoBookID: '1KI',
    displayName: 'سفر الملوك الأول',
    testament: 'old',
  },
  {
    apiBookID: '12',
    helloAoBookID: '2KI',
    displayName: 'سفر الملوك الثاني',
    testament: 'old',
  },
  {
    apiBookID: '13',
    helloAoBookID: '1CH',
    displayName: 'سفر أخبار الأيام الأول',
    testament: 'old',
  },
  {
    apiBookID: '14',
    helloAoBookID: '2CH',
    displayName: 'سفر أخبار الأيام الثاني',
    testament: 'old',
  },
  {
    apiBookID: '15',
    helloAoBookID: 'EZR',
    displayName: 'سفر عزرا',
    testament: 'old',
  },
  {
    apiBookID: '16',
    helloAoBookID: 'NEH',
    displayName: 'سفر نحميا',
    testament: 'old',
  },
  {
    apiBookID: '17',
    helloAoBookID: 'EST',
    displayName: 'سفر أستير ',
    testament: 'old',
  },
  {
    apiBookID: '18',
    helloAoBookID: 'JOB',
    displayName: 'سفر أيوب',
    testament: 'old',
  },
  {
    apiBookID: '19',
    helloAoBookID: 'PSA',
    displayName: 'سفر المزامير ',
    testament: 'old',
  },
  {
    apiBookID: '20',
    helloAoBookID: 'PRO',
    displayName: 'سفر الأمثال',
    testament: 'old',
  },
  {
    apiBookID: '21',
    helloAoBookID: 'ECC',
    displayName: 'سفر الجامعة',
    testament: 'old',
  },
  {
    apiBookID: '22',
    helloAoBookID: 'SNG',
    displayName: 'سفر نشيد الأنشاد',
    testament: 'old',
  },
  {
    apiBookID: '23',
    helloAoBookID: 'ISA',
    displayName: 'سفر إشعياء',
    testament: 'old',
  },
  {
    apiBookID: '24',
    helloAoBookID: 'JER',
    displayName: 'سفر إرميا',
    testament: 'old',
  },
  {
    apiBookID: '25',
    helloAoBookID: 'LAM',
    displayName: 'سفر مراثي إرميا',
    testament: 'old',
  },
  {
    apiBookID: '26',
    helloAoBookID: 'EZK',
    displayName: 'سفر حزقيال',
    testament: 'old',
  },
  {
    apiBookID: '27',
    helloAoBookID: 'DAN',
    displayName: 'سفر دانيال',
    testament: 'old',
  },
  {
    apiBookID: '28',
    helloAoBookID: 'HOS',
    displayName: 'سفر هوشع',
    testament: 'old',
  },
  {
    apiBookID: '29',
    helloAoBookID: 'JOL',
    displayName: 'سفر يوئيل',
    testament: 'old',
  },
  {
    apiBookID: '30',
    helloAoBookID: 'AMO',
    displayName: 'سفر عاموس',
    testament: 'old',
  },
  {
    apiBookID: '31',
    helloAoBookID: 'OBA',
    displayName: 'سفر عوبديا',
    testament: 'old',
  },
  {
    apiBookID: '32',
    helloAoBookID: 'JON',
    displayName: 'سفر يونان',
    testament: 'old',
  },
  {
    apiBookID: '33',
    helloAoBookID: 'MIC',
    displayName: 'سفر ميخا',
    testament: 'old',
  },
  {
    apiBookID: '34',
    helloAoBookID: 'NAM',
    displayName: 'سفر ناحوم',
    testament: 'old',
  },
  {
    apiBookID: '35',
    helloAoBookID: 'HAB',
    displayName: 'سفر حبقوق',
    testament: 'old',
  },
  {
    apiBookID: '36',
    helloAoBookID: 'ZEP',
    displayName: 'سفر صفنيا',
    testament: 'old',
  },
  {
    apiBookID: '37',
    helloAoBookID: 'HAG',
    displayName: 'سفر حجي',
    testament: 'old',
  },
  {
    apiBookID: '38',
    helloAoBookID: 'ZEC',
    displayName: 'سفر زكريا',
    testament: 'old',
  },
  {
    apiBookID: '39',
    helloAoBookID: 'MAL',
    displayName: 'سفر ملاخي',
    testament: 'old',
  },
  {
    apiBookID: '40',
    helloAoBookID: 'MAT',
    displayName: 'إنجيل متى',
    testament: 'new',
  },
  {
    apiBookID: '41',
    helloAoBookID: 'MRK',
    displayName: 'إنجيل مرقس',
    testament: 'new',
  },
  {
    apiBookID: '42',
    helloAoBookID: 'LUK',
    displayName: 'إنجيل لوقا',
    testament: 'new',
  },
  {
    apiBookID: '43',
    helloAoBookID: 'JHN',
    displayName: 'إنجيل يوحنا',
    testament: 'new',
  },
  {
    apiBookID: '44',
    helloAoBookID: 'ACT',
    displayName: 'سفر أعمال الرسل',
    testament: 'new',
  },
  {
    apiBookID: '45',
    helloAoBookID: 'ROM',
    displayName: 'رسالة بولس الرسول إلى أهل رومية',
    testament: 'new',
  },
  {
    apiBookID: '46',
    helloAoBookID: '1CO',
    displayName: 'رسالة بولس الرسول الأولى إلى أهل كورنثوس',
    testament: 'new',
  },
  {
    apiBookID: '47',
    helloAoBookID: '2CO',
    displayName: 'رسالة بولس الرسول الثانية إلى أهل كورنثوس',
    testament: 'new',
  },
  {
    apiBookID: '48',
    helloAoBookID: 'GAL',
    displayName: 'رسالة بولس الرسول إلى أهل غلاطية',
    testament: 'new',
  },
  {
    apiBookID: '49',
    helloAoBookID: 'EPH',
    displayName: 'رسالة بولس الرسول إلى أهل أفسس',
    testament: 'new',
  },
  {
    apiBookID: '50',
    helloAoBookID: 'PHP',
    displayName: 'رسالة بولس الرسول إلى أهل فيلبي',
    testament: 'new',
  },
  {
    apiBookID: '51',
    helloAoBookID: 'COL',
    displayName: 'رسالة بولس الرسول إلى أهل كولوسي',
    testament: 'new',
  },
  {
    apiBookID: '52',
    helloAoBookID: '1TH',
    displayName: 'رسالة بولس الرسول الأولى إلى أهل تسالونيكي',
    testament: 'new',
  },
  {
    apiBookID: '53',
    helloAoBookID: '2TH',
    displayName: 'رسالة بولس الرسول الثانية إلى أهل تسالونيكي',
    testament: 'new',
  },
  {
    apiBookID: '54',
    helloAoBookID: '1TI',
    displayName: 'رسالة بولس الرسول الأولى إلى تيموثاوس',
    testament: 'new',
  },
  {
    apiBookID: '55',
    helloAoBookID: '2TI',
    displayName: 'رسالة بولس الرسول الثانية إلى تيموثاوس',
    testament: 'new',
  },
  {
    apiBookID: '56',
    helloAoBookID: 'TIT',
    displayName: 'رسالة بولس الرسول إلى تيطس',
    testament: 'new',
  },
  {
    apiBookID: '57',
    helloAoBookID: 'PHM',
    displayName: 'رسالة بولس الرسول إلى فليمون',
    testament: 'new',
  },
  {
    apiBookID: '58',
    helloAoBookID: 'HEB',
    displayName: 'رسالة بولس الرسول إلى العبرانيين',
    testament: 'new',
  },
  {
    apiBookID: '59',
    helloAoBookID: 'JAS',
    displayName: 'رسالة يعقوب',
    testament: 'new',
  },
  {
    apiBookID: '60',
    helloAoBookID: '1PE',
    displayName: 'رسالة بطرس الرسول الأولى',
    testament: 'new',
  },
  {
    apiBookID: '61',
    helloAoBookID: '2PE',
    displayName: 'رسالة بطرس الرسول الثانية',
    testament: 'new',
  },
  {
    apiBookID: '62',
    helloAoBookID: '1JN',
    displayName: 'رسالة يوحنا الرسول الأولى',
    testament: 'new',
  },
  {
    apiBookID: '63',
    helloAoBookID: '2JN',
    displayName: 'رسالة يوحنا الرسول الثانية',
    testament: 'new',
  },
  {
    apiBookID: '64',
    helloAoBookID: '3JN',
    displayName: 'رسالة يوحنا الرسول الثالثة',
    testament: 'new',
  },
  {
    apiBookID: '65',
    helloAoBookID: 'JUD',
    displayName: 'رسالة يهوذا',
    testament: 'new',
  },
  {
    apiBookID: '66',
    helloAoBookID: 'REV',
    displayName: 'سفر رؤيا يوحنا اللاهوتي',
    testament: 'new',
  },
];

export const getBibleBooksForTranslation = (
  translationId: BibleTranslationId = DEFAULT_BIBLE_TRANSLATION_ID,
): BibleBook[] => {
  const sourceData = getBibleTranslationData(translationId);

  return BOOK_DEFINITIONS.map((definition, index) => {
    const sourceBook = sourceData.books[index];

    if (!sourceBook) {
      throw new Error(`Missing book data for index ${index}`);
    }

    return {
      bookID: definition.apiBookID,
      helloAoBookID: definition.helloAoBookID,
      bookName: definition.displayName,
      chapters: sourceBook.chapters.length,
      testament: definition.testament,
      localBookIndex: index,
      shortName: sourceBook.name,
      chaptersData: sourceBook.chapters,
    };
  });
};

export const BIBLE_BOOKS: BibleBook[] = getBibleBooksForTranslation();

export const OLD_TESTAMENT_BOOKS = BIBLE_BOOKS.filter(
  book => book.testament === 'old',
);

export const NEW_TESTAMENT_BOOKS = BIBLE_BOOKS.filter(
  book => book.testament === 'new',
);
