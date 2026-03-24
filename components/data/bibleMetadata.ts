export type Testament = 'old' | 'new';

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

export interface BibleBookMeta {
  bookID: string;
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

const BOOK_DEFINITIONS: Array<{
  apiBookID: string;
  displayName: string;
  testament: Testament;
}> = [
  { apiBookID: '1', displayName: 'سفر التكوين', testament: 'old' },
  { apiBookID: '2', displayName: 'سفر الخروج', testament: 'old' },
  { apiBookID: '3', displayName: 'سفر اللاويين', testament: 'old' },
  { apiBookID: '4', displayName: 'سفر العدد', testament: 'old' },
  { apiBookID: '5', displayName: 'سفر التثنية', testament: 'old' },
  { apiBookID: '6', displayName: 'سفر يشوع', testament: 'old' },
  { apiBookID: '7', displayName: 'سفر القضاة', testament: 'old' },
  { apiBookID: '8', displayName: 'سفر راعوث', testament: 'old' },
  { apiBookID: '9', displayName: 'سفر صموئيل الأول', testament: 'old' },
  { apiBookID: '10', displayName: 'سفر صموئيل الثاني', testament: 'old' },
  { apiBookID: '11', displayName: 'سفر الملوك الأول', testament: 'old' },
  { apiBookID: '12', displayName: 'سفر الملوك الثاني', testament: 'old' },
  { apiBookID: '13', displayName: 'سفر أخبار الأيام الأول', testament: 'old' },
  { apiBookID: '14', displayName: 'سفر أخبار الأيام الثاني', testament: 'old' },
  { apiBookID: '15', displayName: 'سفر عزرا', testament: 'old' },
  { apiBookID: '16', displayName: 'سفر نحميا', testament: 'old' },
  { apiBookID: '19', displayName: 'سفر أستير', testament: 'old' },
  { apiBookID: '21', displayName: 'سفر أيوب', testament: 'old' },
  { apiBookID: '22', displayName: 'سفر المزامير', testament: 'old' },
  { apiBookID: '24', displayName: 'سفر الأمثال', testament: 'old' },
  { apiBookID: '25', displayName: 'سفر الجامعة', testament: 'old' },
  { apiBookID: '26', displayName: 'سفر نشيد الأنشاد', testament: 'old' },
  { apiBookID: '29', displayName: 'سفر إشعياء', testament: 'old' },
  { apiBookID: '30', displayName: 'سفر إرميا', testament: 'old' },
  { apiBookID: '31', displayName: 'سفر مراثي إرميا', testament: 'old' },
  { apiBookID: '33', displayName: 'سفر حزقيال', testament: 'old' },
  { apiBookID: '34', displayName: 'سفر دانيال', testament: 'old' },
  { apiBookID: '36', displayName: 'سفر هوشع', testament: 'old' },
  { apiBookID: '37', displayName: 'سفر يوئيل', testament: 'old' },
  { apiBookID: '38', displayName: 'سفر عاموس', testament: 'old' },
  { apiBookID: '39', displayName: 'سفر عوبديا', testament: 'old' },
  { apiBookID: '40', displayName: 'سفر يونان', testament: 'old' },
  { apiBookID: '41', displayName: 'سفر ميخا', testament: 'old' },
  { apiBookID: '42', displayName: 'سفر ناحوم', testament: 'old' },
  { apiBookID: '43', displayName: 'سفر حبقوق', testament: 'old' },
  { apiBookID: '44', displayName: 'سفر صفنيا', testament: 'old' },
  { apiBookID: '45', displayName: 'سفر حجي', testament: 'old' },
  { apiBookID: '46', displayName: 'سفر زكريا', testament: 'old' },
  { apiBookID: '47', displayName: 'سفر ملاخي', testament: 'old' },
  { apiBookID: '50', displayName: 'إنجيل متى', testament: 'new' },
  { apiBookID: '51', displayName: 'إنجيل مرقس', testament: 'new' },
  { apiBookID: '52', displayName: 'إنجيل لوقا', testament: 'new' },
  { apiBookID: '53', displayName: 'إنجيل يوحنا', testament: 'new' },
  { apiBookID: '54', displayName: 'سفر أعمال الرسل', testament: 'new' },
  { apiBookID: '55', displayName: 'رسالة بولس الرسول إلى أهل رومية', testament: 'new' },
  { apiBookID: '56', displayName: 'رسالة بولس الرسول الأولى إلى أهل كورنثوس', testament: 'new' },
  { apiBookID: '57', displayName: 'رسالة بولس الرسول الثانية إلى أهل كورنثوس', testament: 'new' },
  { apiBookID: '58', displayName: 'رسالة بولس الرسول إلى أهل غلاطية', testament: 'new' },
  { apiBookID: '59', displayName: 'رسالة بولس الرسول إلى أهل أفسس', testament: 'new' },
  { apiBookID: '60', displayName: 'رسالة بولس الرسول إلى أهل فيلبي', testament: 'new' },
  { apiBookID: '61', displayName: 'رسالة بولس الرسول إلى أهل كولوسي', testament: 'new' },
  { apiBookID: '62', displayName: 'رسالة بولس الرسول الأولى إلى أهل تسالونيكي', testament: 'new' },
  { apiBookID: '63', displayName: 'رسالة بولس الرسول الثانية إلى أهل تسالونيكي', testament: 'new' },
  { apiBookID: '64', displayName: 'رسالة بولس الرسول الأولى إلى تيموثاوس', testament: 'new' },
  { apiBookID: '65', displayName: 'رسالة بولس الرسول الثانية إلى تيموثاوس', testament: 'new' },
  { apiBookID: '66', displayName: 'رسالة بولس الرسول إلى تيطس', testament: 'new' },
  { apiBookID: '67', displayName: 'رسالة بولس الرسول إلى فليمون', testament: 'new' },
  { apiBookID: '68', displayName: 'رسالة بولس الرسول إلى العبرانيين', testament: 'new' },
  { apiBookID: '69', displayName: 'رسالة يعقوب', testament: 'new' },
  { apiBookID: '70', displayName: 'رسالة بطرس الرسول الأولى', testament: 'new' },
  { apiBookID: '71', displayName: 'رسالة بطرس الرسول الثانية', testament: 'new' },
  { apiBookID: '72', displayName: 'رسالة يوحنا الرسول الأولى', testament: 'new' },
  { apiBookID: '73', displayName: 'رسالة يوحنا الرسول الثانية', testament: 'new' },
  { apiBookID: '74', displayName: 'رسالة يوحنا الرسول الثالثة', testament: 'new' },
  { apiBookID: '75', displayName: 'رسالة يهوذا', testament: 'new' },
  { apiBookID: '76', displayName: 'سفر رؤيا يوحنا اللاهوتي', testament: 'new' },
];

export const BIBLE_BOOKS: BibleBook[] = BOOK_DEFINITIONS.map((definition, index) => {
  const sourceBook = bibleData.books[index];

  if (!sourceBook) {
    throw new Error(`Missing book data for index ${index}`);
  }

  return {
    bookID: definition.apiBookID,
    bookName: definition.displayName,
    chapters: sourceBook.chapters.length,
    testament: definition.testament,
    localBookIndex: index,
    shortName: sourceBook.name,
    chaptersData: sourceBook.chapters,
  };
});

export const OLD_TESTAMENT_BOOKS = BIBLE_BOOKS.filter(
  book => book.testament === 'old',
);

export const NEW_TESTAMENT_BOOKS = BIBLE_BOOKS.filter(
  book => book.testament === 'new',
);
