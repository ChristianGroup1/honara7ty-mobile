jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../components/shared/CustomAlert', () => () => null);
jest.mock('../components/shared/AppHeader', () => {
  const React = require('react');
  const { TouchableOpacity, View } = require('react-native');
  const AppHeader = ({ trailing }: any) => <View>{trailing}</View>;
  const AppHeaderAction = ({ icon, onPress }: any) => (
    <TouchableOpacity testID={`header-action-${icon}`} onPress={onPress} />
  );
  return {
    __esModule: true,
    default: AppHeader,
    AppHeaderAction,
  };
});
jest.mock('../lib/nightMode', () => ({
  useNightMode: () => ({
    isNightMode: false,
    setNightMode: jest.fn(),
    colors: {
      background: '#F2F4F8',
      card: '#FFFFFF',
      cardMuted: '#F8FAFD',
      header: '#0A1124',
      text: '#0A1124',
      mutedText: '#667085',
      border: '#E3E8F1',
      accent: '#78A1BD',
      tabInactive: 'rgba(255,255,255,0.45)',
      shadow: '#000000',
    },
  }),
}));

jest.mock('../lib/supbase', () => ({
  auth: {
    getSession: jest.fn(async () => ({ data: { session: null } })),
  },
  from: jest.fn(() => ({
    upsert: jest.fn(async () => ({ error: null })),
  })),
}));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import ReactTestRenderer from 'react-test-renderer';
import {
  BIBLE_BOOKS,
  getBibleBooksForTranslation,
} from '../components/data/bibleMetadata';
import BibleReaderScreen from '../components/bible-reader/BibleReaderScreen';

const LAST_READING_POSITION_KEY = 'honara7ty:bible-reader:last-position';
const READING_SETTINGS_KEY = 'honara7ty:bible-reader:settings';
const FAVORITE_VERSES_KEY = 'honara7ty:bible-reader:favorite-verses';

const createTouchEvent = (
  currentPageX: number,
  previousPageX: number,
  timestamp: number,
) =>
  ({
    nativeEvent: {
      touches: [{}],
    },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX,
          currentPageY: 0,
          currentTimeStamp: timestamp,
          previousPageX,
          previousPageY: 0,
          touchActive: true,
        },
      ],
    },
  } as any);

const swipeScreen = (
  screen: ReactTestRenderer.ReactTestInstance,
  dx: number,
) => {
  screen.props.onStartShouldSetResponderCapture(createTouchEvent(0, 0, 1));
  screen.props.onResponderGrant(createTouchEvent(0, 0, 1));
  screen.props.onResponderMove(createTouchEvent(dx, 0, 16));
  screen.props.onResponderRelease(createTouchEvent(dx, 0, 17));
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('bible reader defaults to Genesis 1 when there is no saved position', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const firstVerse = BIBLE_BOOKS[0].chaptersData[0].verses[0].text;
  expect(renderer!.root.findByProps({ children: firstVerse })).toBeTruthy();
});

test('bible reader does not show the Book of Life translation on plain verse press', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onPress();
  });

  expect(
    renderer!.root.findAllByProps({ testID: 'life-translation-1' }),
  ).toHaveLength(0);
});

test('bible reader actions strip diacritics and show the Book of Life side by side', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'reader-actions-menu' }),
  ).toBeTruthy();

  const backdrop = renderer!.root.findByProps({
    testID: 'reader-actions-backdrop',
  });
  await ReactTestRenderer.act(async () => {
    backdrop.props.onPress();
  });
  expect(
    renderer!.root.findAllByProps({ testID: 'reader-actions-menu' }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const toggleDiacriticsButton = renderer!.root.findByProps({
    testID: 'toggle-diacritics-button',
  });
  await ReactTestRenderer.act(async () => {
    toggleDiacriticsButton.props.onPress();
  });

  const firstVerse = BIBLE_BOOKS[0].chaptersData[0].verses[0].text;
  const firstVerseWithoutDiacritics = firstVerse.replace(
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,
    '',
  );
  expect(
    renderer!.root.findByProps({ children: firstVerseWithoutDiacritics }),
  ).toBeTruthy();

  const toggleParallelButton = renderer!.root.findByProps({
    testID: 'toggle-parallel-life-button',
  });
  await ReactTestRenderer.act(async () => {
    toggleParallelButton.props.onPress();
  });

  const lifeBooks = getBibleBooksForTranslation('arb_nav');
  const lifeVerseWithoutDiacritics =
    lifeBooks[0].chaptersData[0].verses[0].text.replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,
      '',
    );

  expect(
    renderer!.root.findByProps({ testID: 'parallel-verse-1' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ testID: 'parallel-life-header' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ children: lifeVerseWithoutDiacritics }),
  ).toBeTruthy();
});

test('bible reader persists reading settings', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const increaseFontButton = renderer!.root.findByProps({
    testID: 'increase-font-button',
  });
  const cycleTextColorButton = renderer!.root.findByProps({
    testID: 'cycle-text-color-button',
  });
  const toggleDiacriticsButton = renderer!.root.findByProps({
    testID: 'toggle-diacritics-button',
  });
  const toggleParallelButton = renderer!.root.findByProps({
    testID: 'toggle-parallel-life-button',
  });

  await ReactTestRenderer.act(async () => {
    increaseFontButton.props.onPress();
    cycleTextColorButton.props.onPress();
    toggleDiacriticsButton.props.onPress();
    toggleParallelButton.props.onPress();
  });

  await ReactTestRenderer.act(async () => {});

  await expect(AsyncStorage.getItem(READING_SETTINGS_KEY)).resolves.toEqual(
    JSON.stringify({
      verseFontSize: 18,
      verseTextColor: '#0A1124',
      stripDiacritics: true,
      parallelLifeTranslation: true,
      inlineLifeTranslation: false,
      isNightMode: false,
    }),
  );
});

test('bible reader can show Book of Life for a pressed verse when enabled', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const inlineLifeButton = renderer!.root.findByProps({
    testID: 'toggle-inline-life-button',
  });
  await ReactTestRenderer.act(async () => {
    inlineLifeButton.props.onPress();
  });

  const lifeBooks = getBibleBooksForTranslation('arb_nav');
  const lifeVerse = lifeBooks[0].chaptersData[0].verses[0].text;

  expect(
    renderer!.root.findAllByProps({ testID: 'inline-life-translation-1' }),
  ).toHaveLength(0);

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'inline-life-translation-1' }),
  ).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'ترجمة الحياة' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: lifeVerse })).toBeTruthy();

  await expect(AsyncStorage.getItem(READING_SETTINGS_KEY)).resolves.toContain(
    '"inlineLifeTranslation":true',
  );
});

test('bible reader searches offline and opens a matching verse', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const searchButton = renderer!.root.findByProps({
    testID: 'open-search-button',
  });
  await ReactTestRenderer.act(async () => {
    searchButton.props.onPress();
  });

  const searchInput = renderer!.root.findByProps({
    testID: 'bible-search-input',
  });
  await ReactTestRenderer.act(async () => {
    searchInput.props.onChangeText('السماوات');
  });

  const searchResult = renderer!.root.findByProps({
    testID: 'search-result-1:1:1',
  });
  await ReactTestRenderer.act(async () => {
    searchResult.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'bible-search-panel' }),
  ).toBeTruthy();

  const closeSearchButton = renderer!.root.findByProps({
    testID: 'close-search-button',
  });
  await ReactTestRenderer.act(async () => {
    closeSearchButton.props.onPress();
  });
  expect(
    renderer!.root.findAllByProps({ testID: 'bible-search-panel' }),
  ).toHaveLength(0);

  await expect(
    AsyncStorage.getItem(LAST_READING_POSITION_KEY),
  ).resolves.toEqual(
    JSON.stringify({
      testament: 'old',
      bookId: '1',
      chapter: 1,
    }),
  );
});

test('bible reader favorites verses and restores saved highlights', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onLongPress();
  });

  const favoriteSelectedButton = renderer!.root.findByProps({
    testID: 'favorite-selected-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    favoriteSelectedButton.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'verse-selection-toolbar' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ children: 'إزالة من المفضلة' }),
  ).toBeTruthy();

  await ReactTestRenderer.act(async () => {});

  await expect(AsyncStorage.getItem(FAVORITE_VERSES_KEY)).resolves.toEqual(
    JSON.stringify({ '1:1:1': { favorite: true } }),
  );

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  await ReactTestRenderer.act(async () => {});

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const savedVersesButton = renderer!.root.findByProps({
    testID: 'open-favorite-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    savedVersesButton.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'favorites-saved-verse-1:1:1' }),
  ).toBeTruthy();
});

test('bible reader long press selects verses for copy and highlighting', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onLongPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'verse-selection-toolbar' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ testID: 'selected-verse-check-1' }),
  ).toBeTruthy();

  const secondVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-2',
  });
  await ReactTestRenderer.act(async () => {
    secondVerseButton.props.onPress();
  });

  const copyButton = renderer!.root.findByProps({
    testID: 'copy-selected-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    copyButton.props.onPress();
  });

  expect(Clipboard.setString).toHaveBeenCalledWith(
    expect.stringContaining('سفر التكوين 1 : 1'),
  );
  expect(Clipboard.setString).toHaveBeenCalledWith(
    expect.stringContaining('سفر التكوين 1 : 2'),
  );

  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onLongPress();
  });

  const highlightButton = renderer!.root.findByProps({
    testID: 'highlight-selected-#FFF1A8',
  });
  await ReactTestRenderer.act(async () => {
    highlightButton.props.onPress();
  });

  await ReactTestRenderer.act(async () => {});

  await expect(AsyncStorage.getItem(FAVORITE_VERSES_KEY)).resolves.toContain(
    '"highlightColor":"#FFF1A8"',
  );

  const removeHighlightButton = renderer!.root.findByProps({
    testID: 'remove-highlight-selected-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    removeHighlightButton.props.onPress();
  });

  await ReactTestRenderer.act(async () => {});

  await expect(
    AsyncStorage.getItem(FAVORITE_VERSES_KEY),
  ).resolves.not.toContain('"highlightColor":"#FFF1A8"');
});

test('bible reader sends selected verses to the design screen', async () => {
  const navigation = { navigate: jest.fn() };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <BibleReaderScreen navigation={navigation} />,
    );
  });

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onLongPress();
  });

  const secondVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-2',
  });
  await ReactTestRenderer.act(async () => {
    secondVerseButton.props.onPress();
  });

  const designButton = renderer!.root.findByProps({
    testID: 'design-selected-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    designButton.props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('LockScreenVerse', {
    designedVerse: {
      text: expect.stringContaining(
        BIBLE_BOOKS[0].chaptersData[0].verses[0].text,
      ),
      reference: 'سفر التكوين 1 : 1، 2',
    },
  });
});

test('bible reader sends selected verses to the reflection screen', async () => {
  const navigation = { navigate: jest.fn() };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <BibleReaderScreen navigation={navigation} />,
    );
  });

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onLongPress();
  });

  const reflectButton = renderer!.root.findByProps({
    testID: 'reflect-selected-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    reflectButton.props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('SpiritualReflection', {
    initialReflectionText: expect.stringContaining('سفر التكوين 1 : 1'),
  });
  expect(navigation.navigate).toHaveBeenCalledWith('SpiritualReflection', {
    initialReflectionText: expect.stringContaining(
      BIBLE_BOOKS[0].chaptersData[0].verses[0].text,
    ),
  });
});

test('bible reader opens saved favorite and highlighted verses', async () => {
  await AsyncStorage.setItem(
    FAVORITE_VERSES_KEY,
    JSON.stringify({
      '1:1:1': { favorite: true },
      '1:1:2': { highlightColor: '#FFF1A8' },
    }),
  );

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  await ReactTestRenderer.act(async () => {});

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const savedVersesButton = renderer!.root.findByProps({
    testID: 'open-highlighted-verses-button',
  });
  await ReactTestRenderer.act(async () => {
    savedVersesButton.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'saved-verses-panel' }),
  ).toBeTruthy();
  const savedVerseButton = renderer!.root.findByProps({
    testID: 'highlighted-saved-verse-1:1:2',
  });
  await ReactTestRenderer.act(async () => {
    savedVerseButton.props.onPress();
  });

  expect(
    renderer!.root.findAllByProps({ testID: 'saved-verses-panel' }),
  ).toHaveLength(0);

  await expect(
    AsyncStorage.getItem(LAST_READING_POSITION_KEY),
  ).resolves.toEqual(
    JSON.stringify({
      testament: 'old',
      bookId: '1',
      chapter: 1,
    }),
  );
});

test('bible reader word meanings mode shows saved word meanings for a verse', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const actionsButton = renderer!.root.findByProps({
    testID: 'header-action-dots-vertical',
  });
  await ReactTestRenderer.act(async () => {
    actionsButton.props.onPress();
  });

  const wordMeaningsButton = renderer!.root.findByProps({
    testID: 'toggle-word-meanings-button',
  });
  await ReactTestRenderer.act(async () => {
    wordMeaningsButton.props.onPress();
  });

  const firstVerseButton = renderer!.root.findByProps({
    testID: 'verse-row-1',
  });
  await ReactTestRenderer.act(async () => {
    firstVerseButton.props.onPress();
  });

  expect(
    renderer!.root.findByProps({ testID: 'word-meanings-1' }),
  ).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'בראשׁית' })).toBeTruthy();
  expect(
    renderer!.root.findByProps({ children: 'רֵאשִׁית (rêʼshîyth)' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({
      children:
        'الأول أو البداية، من جهة المكان أو الزمن أو الترتيب أو الرتبة.',
    }),
  ).toBeTruthy();
});

test('bible reader opens a saved chapter directly', async () => {
  await AsyncStorage.setItem(
    LAST_READING_POSITION_KEY,
    JSON.stringify({ testament: 'old', bookId: '2', chapter: 2 }),
  );

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  await ReactTestRenderer.act(async () => {});

  const savedVerse = BIBLE_BOOKS[1].chaptersData[1].verses[0].text;
  expect(renderer!.root.findByProps({ children: savedVerse })).toBeTruthy();
});

test('bible reader selection persists the last opened chapter', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const currentReadingButton = renderer!.root.findByProps({
    testID: 'chapter-nav-current-button',
  });
  await ReactTestRenderer.act(async () => {
    currentReadingButton.props.onPress();
  });

  const bookDropdown = renderer!.root.findByProps({ testID: 'book-dropdown' });
  await ReactTestRenderer.act(async () => {
    bookDropdown.props.onPress();
  });

  const bookButton = renderer!.root.findByProps({ testID: 'book-2' });
  await ReactTestRenderer.act(async () => {
    bookButton.props.onPress();
  });

  const chapterDropdown = renderer!.root.findByProps({
    testID: 'chapter-dropdown',
  });
  await ReactTestRenderer.act(async () => {
    chapterDropdown.props.onPress();
  });

  const chapterButton = renderer!.root.findByProps({ testID: 'chapter-2' });
  await ReactTestRenderer.act(async () => {
    chapterButton.props.onPress();
  });

  const startReadingButton = renderer!.root.findByProps({
    testID: 'start-reading-button',
  });
  await ReactTestRenderer.act(async () => {
    startReadingButton.props.onPress();
  });

  const selectedVerse = BIBLE_BOOKS[1].chaptersData[1].verses[0].text;
  expect(renderer!.root.findByProps({ children: selectedVerse })).toBeTruthy();
  await expect(
    AsyncStorage.getItem(LAST_READING_POSITION_KEY),
  ).resolves.toEqual(
    JSON.stringify({
      testament: 'old',
      bookId: '2',
      chapter: 2,
    }),
  );
});

test('bible reader horizontal swipes move between chapters and persist position', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const screen = renderer!.root.findByProps({ testID: 'bible-reader-screen' });

  await ReactTestRenderer.act(async () => {
    swipeScreen(screen, 72);
  });

  const secondChapterVerse = BIBLE_BOOKS[0].chaptersData[1].verses[0].text;
  expect(
    renderer!.root.findByProps({ children: secondChapterVerse }),
  ).toBeTruthy();
  await expect(
    AsyncStorage.getItem(LAST_READING_POSITION_KEY),
  ).resolves.toEqual(
    JSON.stringify({
      testament: 'old',
      bookId: '1',
      chapter: 2,
    }),
  );

  const updatedScreen = renderer!.root.findByProps({
    testID: 'bible-reader-screen',
  });
  await ReactTestRenderer.act(async () => {
    swipeScreen(updatedScreen, -72);
  });

  const firstChapterVerse = BIBLE_BOOKS[0].chaptersData[0].verses[0].text;
  expect(
    renderer!.root.findByProps({ children: firstChapterVerse }),
  ).toBeTruthy();
  await expect(
    AsyncStorage.getItem(LAST_READING_POSITION_KEY),
  ).resolves.toEqual(
    JSON.stringify({
      testament: 'old',
      bookId: '1',
      chapter: 1,
    }),
  );
});

test('bible reader next button moves to the next book after the last chapter', async () => {
  await AsyncStorage.setItem(
    LAST_READING_POSITION_KEY,
    JSON.stringify({ testament: 'old', bookId: '1', chapter: 50 }),
  );

  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  await ReactTestRenderer.act(async () => {});

  const nextChapterButton = renderer!.root.findByProps({
    testID: 'next-chapter-button',
  });
  await ReactTestRenderer.act(async () => {
    nextChapterButton.props.onPress();
  });

  const exodusFirstVerse = BIBLE_BOOKS[1].chaptersData[0].verses[0].text;
  expect(
    renderer!.root.findByProps({ children: exodusFirstVerse }),
  ).toBeTruthy();
  await expect(
    AsyncStorage.getItem(LAST_READING_POSITION_KEY),
  ).resolves.toEqual(
    JSON.stringify({
      testament: 'old',
      bookId: '2',
      chapter: 1,
    }),
  );
});

test('bible reader chapter nav current opens the selection page', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<BibleReaderScreen />);
  });

  const currentChapterButton = renderer!.root.findByProps({
    testID: 'chapter-nav-current-button',
  });
  await ReactTestRenderer.act(async () => {
    currentChapterButton.props.onPress();
  });

  expect(renderer!.root.findByProps({ testID: 'book-dropdown' })).toBeTruthy();
});
