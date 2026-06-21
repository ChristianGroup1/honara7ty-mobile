export interface VerseStrongRef {
  strongId: string;
  displayWord: string;
}

type VerseMappings = Record<string, VerseStrongRef[]>;

const getBookMappings = (bookId: string): VerseMappings => {
  switch (bookId) {
    case '1':
      return require('./mappings/book1.json');
    case '2':
      return require('./mappings/book2.json');
    case '3':
      return require('./mappings/book3.json');
    case '4':
      return require('./mappings/book4.json');
    case '5':
      return require('./mappings/book5.json');
    case '6':
      return require('./mappings/book6.json');
    case '7':
      return require('./mappings/book7.json');
    case '8':
      return require('./mappings/book8.json');
    case '9':
      return require('./mappings/book9.json');
    case '10':
      return require('./mappings/book10.json');
    case '11':
      return require('./mappings/book11.json');
    case '12':
      return require('./mappings/book12.json');
    case '13':
      return require('./mappings/book13.json');
    case '14':
      return require('./mappings/book14.json');
    case '15':
      return require('./mappings/book15.json');
    case '16':
      return require('./mappings/book16.json');
    case '17':
      return require('./mappings/book17.json');
    case '18':
      return require('./mappings/book18.json');
    case '19':
      return require('./mappings/book19.json');
    case '20':
      return require('./mappings/book20.json');
    case '21':
      return require('./mappings/book21.json');
    case '22':
      return require('./mappings/book22.json');
    case '23':
      return require('./mappings/book23.json');
    case '24':
      return require('./mappings/book24.json');
    case '25':
      return require('./mappings/book25.json');
    case '26':
      return require('./mappings/book26.json');
    case '27':
      return require('./mappings/book27.json');
    case '28':
      return require('./mappings/book28.json');
    case '29':
      return require('./mappings/book29.json');
    case '30':
      return require('./mappings/book30.json');
    case '31':
      return require('./mappings/book31.json');
    case '32':
      return require('./mappings/book32.json');
    case '33':
      return require('./mappings/book33.json');
    case '34':
      return require('./mappings/book34.json');
    case '35':
      return require('./mappings/book35.json');
    case '36':
      return require('./mappings/book36.json');
    case '37':
      return require('./mappings/book37.json');
    case '38':
      return require('./mappings/book38.json');
    case '39':
      return require('./mappings/book39.json');
    case '43':
      return require('./mappings/book43.json');
    default:
      return {};
  }
};

export const getStrongRefsForVerse = (
  bookId: string,
  chapter: number,
  verse: number,
): VerseStrongRef[] =>
  getBookMappings(bookId)[`${bookId}:${chapter}:${verse}`] ?? [];
