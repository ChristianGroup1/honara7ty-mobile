import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNightMode } from '../../lib/nightMode';
import { getTabBarLayout, SELECTION_BAR_HEIGHT } from '../../lib/tabBarLayout';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import {
  BIBLE_BOOKS,
  BibleBook,
  Testament,
  getBibleBooksForTranslation,
} from '../data/bibleMetadata';
import { getStrongsEntry } from '../data/strongs/lexicon';
import { getStrongRefsForVerse } from '../data/strongs/verseMappings';
import { palette, spacing } from '../shared/designTokens';
import {
  DEFAULT_VERSE_FONT_SIZE,
  FAVORITE_VERSES_KEY,
  LAST_READING_POSITION_KEY,
  MAX_SEARCH_RESULTS,
  MAX_VERSE_FONT_SIZE,
  MIN_VERSE_FONT_SIZE,
  READING_SETTINGS_KEY,
  testamentLabels,
  VERSE_TEXT_COLORS,
} from './constants';
import type {
  BibleSearchResult,
  HighlightColor,
  OpenDropdown,
  SavedReadingPosition,
  SavedReadingSettings,
  SavedVersesModalKind,
  VerseAnnotation,
  VerseTextColor,
} from './types';
import { createStyles } from './styles';
import SelectionHighlightRow from './SelectionHighlightRow';

const BibleReaderScreen = ({ navigation }: any = {}) => {
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = getTabBarLayout(insets.bottom);
  const { colors, isNightMode, setNightMode } = useNightMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollViewRef = useRef<ScrollView>(null);
  const readerCardYRef = useRef(0);
  const verseLayoutYRef = useRef<Record<string, number>>({});
  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');
  const [selectedBookId, setSelectedBookId] = useState(BIBLE_BOOKS[0].bookID);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedLifeVerseNumber, setSelectedLifeVerseNumber] = useState<
    number | null
  >(null);
  const [readerMenuOpen, setReaderMenuOpen] = useState(false);
  const [verseFontSize, setVerseFontSize] = useState(DEFAULT_VERSE_FONT_SIZE);
  const [verseTextColor, setVerseTextColor] =
    useState<VerseTextColor>('default');
  const [stripDiacritics, setStripDiacritics] = useState(false);
  const [parallelLifeTranslation, setParallelLifeTranslation] = useState(false);
  const [inlineLifeTranslation, setInlineLifeTranslation] = useState(false);
  const [wordMeaningsEnabled, setWordMeaningsEnabled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [savedVersesKind, setSavedVersesKind] =
    useState<SavedVersesModalKind | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verseAnnotations, setVerseAnnotations] = useState<
    Record<string, VerseAnnotation>
  >({});
  const [selectedVerseKeys, setSelectedVerseKeys] = useState<
    Record<string, true>
  >({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pendingSearchVerseKey, setPendingSearchVerseKey] = useState<
    string | null
  >(null);

  const bibleBooks = BIBLE_BOOKS;
  const lifeBibleBooks = useMemo(
    () => getBibleBooksForTranslation('arb_nav'),
    [],
  );
  const oldTestamentBooks = useMemo(
    () => bibleBooks.filter(book => book.testament === 'old'),
    [bibleBooks],
  );
  const newTestamentBooks = useMemo(
    () => bibleBooks.filter(book => book.testament === 'new'),
    [bibleBooks],
  );
  const books =
    selectedTestament === 'old' ? oldTestamentBooks : newTestamentBooks;
  const selectedBook =
    bibleBooks.find(book => book.bookID === selectedBookId) ?? books[0];
  const chapter =
    selectedBook.chaptersData.find(item => item.chapter === selectedChapter) ??
    selectedBook.chaptersData[0];
  const lifeSelectedBook =
    lifeBibleBooks.find(book => book.bookID === selectedBook.bookID) ??
    lifeBibleBooks[selectedBook.localBookIndex];
  const lifeChapter = lifeSelectedBook?.chaptersData.find(
    item => item.chapter === selectedChapter,
  );
  const wordMeaningsForSelectedVerse =
    selectedLifeVerseNumber === null
      ? []
      : getStrongRefsForVerse(
          selectedBook.bookID,
          selectedChapter,
          selectedLifeVerseNumber,
        );
  const selectedBookIndex = bibleBooks.findIndex(
    book => book.bookID === selectedBook.bookID,
  );
  const hasPreviousChapter = selectedBookIndex > 0 || selectedChapter > 1;
  const hasNextChapter =
    selectedBookIndex < bibleBooks.length - 1 ||
    selectedChapter < selectedBook.chapters;
  const resolvedVerseTextColor =
    verseTextColor === 'default' ? colors.text : verseTextColor;

  const getVerseKey = useCallback(
    (bookId: string, chapterNumber: number, verseNumber: number) =>
      `${bookId}:${chapterNumber}:${verseNumber}`,
    [],
  );

  const stripArabicDiacritics = useCallback(
    (value: string) =>
      value.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
    [],
  );

  const formatVerseText = useCallback(
    (value: string) => (stripDiacritics ? stripArabicDiacritics(value) : value),
    [stripArabicDiacritics, stripDiacritics],
  );

  const normalizeSearchText = useCallback(
    (value: string) => stripArabicDiacritics(value).trim().toLowerCase(),
    [stripArabicDiacritics],
  );

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    if (normalizedQuery.length < 2) {
      return [];
    }

    const results: BibleSearchResult[] = [];

    for (const book of bibleBooks) {
      for (const item of book.chaptersData) {
        for (const verse of item.verses) {
          if (normalizeSearchText(verse.text).includes(normalizedQuery)) {
            results.push({
              key: getVerseKey(book.bookID, item.chapter, verse.verse),
              book,
              chapter: item.chapter,
              verse: verse.verse,
              text: verse.text,
            });

            if (results.length >= MAX_SEARCH_RESULTS) {
              return results;
            }
          }
        }
      }
    }

    return results;
  }, [bibleBooks, getVerseKey, normalizeSearchText, searchQuery]);

  const selectedVerseKeyList = useMemo(
    () => Object.keys(selectedVerseKeys),
    [selectedVerseKeys],
  );
  const selectionMode = selectedVerseKeyList.length > 0;

  const findVerseByKey = useCallback(
    (verseKey: string): BibleSearchResult | null => {
      const [bookId, chapterValue, verseValue] = verseKey.split(':');
      const book = bibleBooks.find(item => item.bookID === bookId);
      const chapterNumber = Number(chapterValue);
      const verseNumber = Number(verseValue);
      const chapterData = book?.chaptersData.find(
        item => item.chapter === chapterNumber,
      );
      const verseData = chapterData?.verses.find(
        item => item.verse === verseNumber,
      );

      if (!book || !chapterData || !verseData) {
        return null;
      }

      return {
        key: verseKey,
        book,
        chapter: chapterNumber,
        verse: verseNumber,
        text: verseData.text,
      };
    },
    [bibleBooks],
  );

  const selectedVerseItems = useMemo(
    () =>
      selectedVerseKeyList
        .map(findVerseByKey)
        .filter((item): item is BibleSearchResult => Boolean(item)),
    [findVerseByKey, selectedVerseKeyList],
  );
  const selectedVersesAllFavorited =
    selectedVerseKeyList.length > 0 &&
    selectedVerseKeyList.every(
      verseKey => verseAnnotations[verseKey]?.favorite,
    );
  const selectedVersesHighlightColor = useMemo<HighlightColor | null>(() => {
    if (!selectedVerseKeyList.length) {
      return null;
    }

    const firstColor = verseAnnotations[selectedVerseKeyList[0]]?.highlightColor;

    if (!firstColor) {
      return null;
    }

    const allSame = selectedVerseKeyList.every(
      verseKey => verseAnnotations[verseKey]?.highlightColor === firstColor,
    );

    return allSame ? firstColor : null;
  }, [selectedVerseKeyList, verseAnnotations]);

  const favoriteVerseItems = useMemo(
    () =>
      Object.entries(verseAnnotations)
        .filter(([, annotation]) => annotation.favorite)
        .map(([verseKey]) => findVerseByKey(verseKey))
        .filter((item): item is BibleSearchResult => Boolean(item)),
    [findVerseByKey, verseAnnotations],
  );

  const highlightedVerseItems = useMemo(
    () =>
      Object.entries(verseAnnotations)
        .filter(([, annotation]) => annotation.highlightColor)
        .map(([verseKey]) => findVerseByKey(verseKey))
        .filter((item): item is BibleSearchResult => Boolean(item)),
    [findVerseByKey, verseAnnotations],
  );
  const activeSavedVerseItems =
    savedVersesKind === 'favorites'
      ? favoriteVerseItems
      : highlightedVerseItems;
  const savedVersesTitle =
    savedVersesKind === 'favorites' ? 'الآيات المفضلة' : 'الآيات المظللة';
  const savedVersesEmptyText =
    savedVersesKind === 'favorites'
      ? 'لا توجد آيات مفضلة.'
      : 'لا توجد آيات مظللة.';

  const cycleVerseTextColor = () => {
    setVerseTextColor(current => {
      const currentIndex = VERSE_TEXT_COLORS.indexOf(current);
      return VERSE_TEXT_COLORS[(currentIndex + 1) % VERSE_TEXT_COLORS.length];
    });
  };

  const increaseVerseFontSize = () => {
    setVerseFontSize(current => Math.min(MAX_VERSE_FONT_SIZE, current + 1));
  };

  const decreaseVerseFontSize = () => {
    setVerseFontSize(current => Math.max(MIN_VERSE_FONT_SIZE, current - 1));
  };

  const persistReadingPosition = useCallback(
    async (book: BibleBook, chapterNumber: number) => {
      const position: SavedReadingPosition = {
        testament: book.testament,
        bookId: book.bookID,
        chapter: chapterNumber,
      };

      try {
        await AsyncStorage.setItem(
          LAST_READING_POSITION_KEY,
          JSON.stringify(position),
        );
      } catch {
        // Reading should continue even if saving the last position fails.
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const loadReadingSettings = async () => {
      try {
        const [rawSettings, rawFavorites] = await Promise.all([
          AsyncStorage.getItem(READING_SETTINGS_KEY),
          AsyncStorage.getItem(FAVORITE_VERSES_KEY),
        ]);

        if (!mounted) {
          return;
        }

        if (rawSettings) {
          const savedSettings = JSON.parse(
            rawSettings,
          ) as Partial<SavedReadingSettings>;
          const savedFontSize = savedSettings.verseFontSize;

          if (
            typeof savedFontSize === 'number' &&
            Number.isInteger(savedFontSize) &&
            savedFontSize >= MIN_VERSE_FONT_SIZE &&
            savedFontSize <= MAX_VERSE_FONT_SIZE
          ) {
            setVerseFontSize(savedFontSize);
          }

          if (
            savedSettings.verseTextColor &&
            VERSE_TEXT_COLORS.includes(savedSettings.verseTextColor)
          ) {
            setVerseTextColor(savedSettings.verseTextColor);
          }

          if (typeof savedSettings.stripDiacritics === 'boolean') {
            setStripDiacritics(savedSettings.stripDiacritics);
          }

          if (typeof savedSettings.parallelLifeTranslation === 'boolean') {
            setParallelLifeTranslation(savedSettings.parallelLifeTranslation);
          }

          if (typeof savedSettings.inlineLifeTranslation === 'boolean') {
            setInlineLifeTranslation(savedSettings.inlineLifeTranslation);
          }

          if (typeof savedSettings.isNightMode === 'boolean') {
            setNightMode(savedSettings.isNightMode);
          }
        }

        if (rawFavorites) {
          const savedFavorites = JSON.parse(rawFavorites);
          if (savedFavorites && typeof savedFavorites === 'object') {
            setVerseAnnotations(
              Object.fromEntries(
                Object.entries(savedFavorites).map(([verseKey, value]) => [
                  verseKey,
                  value === true ? { favorite: true } : value,
                ]),
              ) as Record<string, VerseAnnotation>,
            );
          }
        }
      } catch {
        // Keep default reading settings if local storage is unavailable.
      } finally {
        if (mounted) {
          setSettingsLoaded(true);
        }
      }
    };

    loadReadingSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    const settings: SavedReadingSettings = {
      verseFontSize,
      verseTextColor,
      stripDiacritics,
      parallelLifeTranslation,
      inlineLifeTranslation,
      isNightMode,
    };

    void AsyncStorage.setItem(READING_SETTINGS_KEY, JSON.stringify(settings));
  }, [
    inlineLifeTranslation,
    isNightMode,
    parallelLifeTranslation,
    settingsLoaded,
    stripDiacritics,
    verseFontSize,
    verseTextColor,
  ]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    void AsyncStorage.setItem(
      FAVORITE_VERSES_KEY,
      JSON.stringify(verseAnnotations),
    );
  }, [settingsLoaded, verseAnnotations]);

  useEffect(() => {
    let mounted = true;

    const loadLastReadingPosition = async () => {
      try {
        const rawPosition = await AsyncStorage.getItem(
          LAST_READING_POSITION_KEY,
        );

        if (!rawPosition || !mounted) {
          return;
        }

        const savedPosition = JSON.parse(
          rawPosition,
        ) as Partial<SavedReadingPosition>;
        const savedBook = bibleBooks.find(
          book => book.bookID === savedPosition.bookId,
        );
        const savedChapter = Number(savedPosition.chapter);

        if (
          !savedBook ||
          !Number.isInteger(savedChapter) ||
          savedChapter < 1 ||
          savedChapter > savedBook.chapters
        ) {
          return;
        }

        setSelectedTestament(savedBook.testament);
        setSelectedBookId(savedBook.bookID);
        setSelectedChapter(savedChapter);
      } catch {
        // Keep the default Genesis 1 position if local storage is unavailable.
      }
    };

    loadLastReadingPosition();

    return () => {
      mounted = false;
    };
  }, []);

  const selectTestament = (testament: Testament) => {
    const nextBooks =
      testament === 'old' ? oldTestamentBooks : newTestamentBooks;
    setSelectedLifeVerseNumber(null);
    setSelectedTestament(testament);
    setSelectedBookId(nextBooks[0].bookID);
    setSelectedChapter(1);
    setOpenDropdown(null);
  };

  const toggleDropdown = (dropdown: Exclude<OpenDropdown, null>) => {
    setReaderMenuOpen(false);
    setSearchOpen(false);
    setOpenDropdown(current => (current === dropdown ? null : dropdown));
  };

  const openSelectionPage = () => {
    setReaderMenuOpen(false);
    setOpenDropdown(null);
    setSearchOpen(false);
    setSelecting(true);
  };

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    });
  };

  const scrollToVerseKey = useCallback((verseKey: string) => {
    const verseY = verseLayoutYRef.current[verseKey];

    if (typeof verseY !== 'number') {
      return false;
    }

    const y = Math.max(0, readerCardYRef.current + verseY - 72);

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    });

    return true;
  }, []);

  const registerVerseLayout = useCallback(
    (verseKey: string, event: LayoutChangeEvent) => {
      verseLayoutYRef.current[verseKey] = event.nativeEvent.layout.y;

      if (pendingSearchVerseKey === verseKey) {
        requestAnimationFrame(() => {
          if (scrollToVerseKey(verseKey)) {
            setPendingSearchVerseKey(null);
          }
        });
      }
    },
    [pendingSearchVerseKey, scrollToVerseKey],
  );

  useEffect(() => {
    if (pendingSearchVerseKey === null) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollToVerseKey(pendingSearchVerseKey)) {
          setPendingSearchVerseKey(null);
        }
      });
    });
  }, [
    pendingSearchVerseKey,
    scrollToVerseKey,
    selectedBook.bookID,
    selectedChapter,
  ]);

  const openAdjacentChapter = useCallback(
    (direction: 1 | -1) => {
      let nextBook = selectedBook;
      let nextChapter = selectedChapter + direction;

      if (nextChapter > selectedBook.chapters) {
        const followingBook = bibleBooks[selectedBookIndex + 1];

        if (!followingBook) {
          return;
        }

        nextBook = followingBook;
        nextChapter = 1;
      }

      if (nextChapter < 1) {
        const previousBook = bibleBooks[selectedBookIndex - 1];

        if (!previousBook) {
          return;
        }

        nextBook = previousBook;
        nextChapter = previousBook.chapters;
      }

      setSelectedTestament(nextBook.testament);
      setSelectedBookId(nextBook.bookID);
      setSelectedChapter(nextChapter);
      setSelectedLifeVerseNumber(null);
      void persistReadingPosition(nextBook, nextChapter);
    },
    [
      bibleBooks,
      persistReadingPosition,
      selectedBook,
      selectedBookIndex,
      selectedChapter,
    ],
  );

  const readerSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);

          return (
            !selecting &&
            horizontalMove > 28 &&
            horizontalMove > verticalMove * 1.25
          );
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);

          return (
            !selecting &&
            horizontalMove > 28 &&
            horizontalMove > verticalMove * 1.25
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 60) {
            openAdjacentChapter(1);
          }

          if (gestureState.dx < -60) {
            openAdjacentChapter(-1);
          }
        },
      }),
    [openAdjacentChapter, selecting],
  );

  const startReading = async () => {
    setOpenDropdown(null);
    setSelecting(false);
    setReaderMenuOpen(false);
    setSearchOpen(false);
    setSelectedLifeVerseNumber(null);
    scrollToTop();
    await persistReadingPosition(selectedBook, selectedChapter);
  };

  const openSearch = () => {
    setReaderMenuOpen(false);
    setOpenDropdown(null);
    setSelecting(false);
    setSavedVersesKind(null);
    setSearchOpen(current => !current);
  };

  const openSavedVerses = (kind: SavedVersesModalKind) => {
    setReaderMenuOpen(false);
    setOpenDropdown(null);
    setSelecting(false);
    setSearchOpen(false);
    setSavedVersesKind(kind);
  };

  const openSearchResult = async (
    result: BibleSearchResult,
    options?: { closeSavedVerses?: boolean; closeSearch?: boolean },
  ) => {
    setSelectedTestament(result.book.testament);
    setSelectedBookId(result.book.bookID);
    setSelectedChapter(result.chapter);
    setSelectedLifeVerseNumber(result.verse);
    setPendingSearchVerseKey(result.key);
    setParallelLifeTranslation(false);
    if (options?.closeSearch) {
      setSearchOpen(false);
    }
    if (options?.closeSavedVerses) {
      setSavedVersesKind(null);
    }
    setSelectedVerseKeys({});
    await persistReadingPosition(result.book, result.chapter);
  };

  const toggleSelectedVerse = (verseKey: string) => {
    setSelectedVerseKeys(current => {
      const next = { ...current };

      if (next[verseKey]) {
        delete next[verseKey];
      } else {
        next[verseKey] = true;
      }

      return next;
    });
  };

  const handleVersePress = (verseNumber: number, verseKey: string) => {
    if (selectionMode) {
      toggleSelectedVerse(verseKey);
      return;
    }

    if (!wordMeaningsEnabled && !inlineLifeTranslation) {
      return;
    }

    setSelectedLifeVerseNumber(current =>
      current === verseNumber ? null : verseNumber,
    );
  };

  const handleVerseLongPress = (verseKey: string) => {
    setSelectedLifeVerseNumber(null);
    setSelectedVerseKeys(current => ({ ...current, [verseKey]: true }));
  };

  const copySelectedVerses = () => {
    if (!selectedVerseItems.length) {
      return;
    }

    Clipboard.setString(
      selectedVerseItems
        .map(
          item =>
            `${item.book.bookName} ${item.chapter} : ${
              item.verse
            }\n${formatVerseText(item.text)}`,
        )
        .join('\n\n'),
    );
    setSelectedVerseKeys({});
  };

  const highlightSelectedVerses = (highlightColor: HighlightColor) => {
    setVerseAnnotations(current => {
      const next = { ...current };
      selectedVerseKeyList.forEach(verseKey => {
        next[verseKey] = { ...next[verseKey], highlightColor };
      });
      return next;
    });
  };

  const removeHighlightFromSelectedVerses = () => {
    setVerseAnnotations(current => {
      const next = { ...current };
      selectedVerseKeyList.forEach(verseKey => {
        const currentAnnotation = next[verseKey];

        if (!currentAnnotation) {
          return;
        }

        const { highlightColor, ...rest } = currentAnnotation;
        if (rest.favorite) {
          next[verseKey] = rest;
        } else {
          delete next[verseKey];
        }
      });
      return next;
    });
  };

  const toggleFavoriteForSelectedVerses = () => {
    setVerseAnnotations(current => {
      const next = { ...current };
      selectedVerseKeyList.forEach(verseKey => {
        const currentAnnotation = next[verseKey] ?? {};

        if (selectedVersesAllFavorited) {
          const { favorite, ...rest } = currentAnnotation;
          if (rest.highlightColor) {
            next[verseKey] = rest;
          } else {
            delete next[verseKey];
          }
        } else {
          next[verseKey] = { ...currentAnnotation, favorite: true };
        }
      });
      return next;
    });
  };

  const buildSelectedVersesPayload = () => {
    if (!selectedVerseItems.length) {
      return null;
    }

    const firstVerse = selectedVerseItems[0];
    const sameChapter = selectedVerseItems.every(
      item =>
        item.book.bookID === firstVerse.book.bookID &&
        item.chapter === firstVerse.chapter,
    );
    const verseReference = sameChapter
      ? `${firstVerse.book.bookName} ${
          firstVerse.chapter
        } : ${selectedVerseItems.map(item => item.verse).join('، ')}`
      : selectedVerseItems
          .map(item => `${item.book.bookName} ${item.chapter} : ${item.verse}`)
          .join('، ');

    return {
      text: selectedVerseItems
        .map(item => formatVerseText(item.text))
        .join(' '),
      reference: verseReference,
    };
  };

  const openSelectedVersesDesigner = () => {
    const payload = buildSelectedVersesPayload();
    if (!payload) {
      return;
    }

    navigation?.navigate?.('LockScreenVerse', {
      designedVerse: payload,
    });
  };

  const openSelectedVersesReflection = () => {
    const payload = buildSelectedVersesPayload();
    if (!payload) {
      return;
    }

    navigation?.navigate?.('SpiritualReflection', {
      initialReflectionText: `${payload.reference}\n${payload.text}\n\n`,
    });
  };

  return (
    <SafeAreaView
      testID="bible-reader-screen"
      style={styles.container}
      edges={[]}
      {...readerSwipeResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader
        topInsetHeight={insets.top}
        title={selecting ? 'اختيار القراءة' : 'قراءة الكتاب المقدس'}
        eyebrow="كلمة ليومك"
        trailing={
          !selecting ? (
            <AppHeaderAction
              icon="dots-vertical"
              onPress={() => setReaderMenuOpen(current => !current)}
            />
          ) : null
        }
      />

      <Modal
        visible={searchOpen && !selecting}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View testID="bible-search-modal" style={styles.searchModalOverlay}>
          <View
            testID="bible-search-backdrop"
            style={styles.searchModalBackdrop}
          />
          <View testID="bible-search-panel" style={styles.searchPanel}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>بحث في الكتاب</Text>
              <TouchableOpacity
                testID="close-search-button"
                style={styles.searchCloseButton}
                activeOpacity={0.82}
                onPress={() => setSearchOpen(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={21}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputRow}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.accent}
              />
              <TextInput
                testID="bible-search-input"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="اكتب كلمة أو جملة"
                placeholderTextColor={colors.mutedText}
                style={styles.searchInput}
                textAlign="right"
                autoFocus
              />
              {searchQuery ? (
                <TouchableOpacity
                  testID="clear-search-button"
                  activeOpacity={0.82}
                  onPress={() => setSearchQuery('')}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={colors.mutedText}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            {searchQuery.trim().length >= 2 ? (
              <Text style={styles.searchMeta}>
                {searchResults.length
                  ? `${searchResults.length} نتيجة`
                  : 'لا توجد نتائج'}
              </Text>
            ) : (
              <Text style={styles.searchMeta}>اكتب حرفين على الأقل للبحث</Text>
            )}
            {searchResults.length ? (
              <ScrollView
                style={styles.searchResultsScroll}
                contentContainerStyle={styles.searchResults}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {searchResults.map(result => (
                  <TouchableOpacity
                    key={result.key}
                    testID={`search-result-${result.key}`}
                    style={styles.searchResultRow}
                    activeOpacity={0.82}
                    onPress={() => openSearchResult(result)}
                  >
                    <Text style={styles.searchResultRef}>
                      {result.book.bookName} {result.chapter} : {result.verse}
                    </Text>
                    <Text style={styles.searchResultText} numberOfLines={2}>
                      {formatVerseText(result.text)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(savedVersesKind) && !selecting}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View testID="saved-verses-modal" style={styles.searchModalOverlay}>
          <View
            testID="saved-verses-backdrop"
            style={styles.searchModalBackdrop}
          />
          <View testID="saved-verses-panel" style={styles.searchPanel}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>{savedVersesTitle}</Text>
              <TouchableOpacity
                testID="close-saved-verses-button"
                style={styles.searchCloseButton}
                activeOpacity={0.82}
                onPress={() => setSavedVersesKind(null)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={21}
                  color={colors.mutedText}
                />
              </TouchableOpacity>
            </View>
            {activeSavedVerseItems.length ? (
              <ScrollView
                style={styles.searchResultsScroll}
                contentContainerStyle={styles.searchResults}
                showsVerticalScrollIndicator={false}
              >
                {activeSavedVerseItems.map(item => {
                  const annotation = verseAnnotations[item.key] ?? {};
                  return (
                    <TouchableOpacity
                      key={`${savedVersesKind}-${item.key}`}
                      testID={`${savedVersesKind}-saved-verse-${item.key}`}
                      style={styles.searchResultRow}
                      activeOpacity={0.82}
                      onPress={() =>
                        openSearchResult(item, { closeSavedVerses: true })
                      }
                    >
                      <View style={styles.savedVerseMetaRow}>
                        <Text style={styles.searchResultRef}>
                          {item.book.bookName} {item.chapter} : {item.verse}
                        </Text>
                        <View style={styles.savedVerseBadges}>
                          {annotation.highlightColor ? (
                            <View
                              style={[
                                styles.savedVerseColorDot,
                                { backgroundColor: annotation.highlightColor },
                              ]}
                            />
                          ) : null}
                          {annotation.favorite ? (
                            <MaterialCommunityIcons
                              name="star"
                              size={16}
                              color={palette.gold}
                            />
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.searchResultText} numberOfLines={2}>
                        {formatVerseText(item.text)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptySavedVersesText}>
                {savedVersesEmptyText}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {readerMenuOpen ? (
        <View pointerEvents="box-none" style={styles.readerActionsOverlay}>
          <TouchableOpacity
            testID="reader-actions-backdrop"
            style={styles.readerActionsBackdrop}
            activeOpacity={1}
            onPress={() => setReaderMenuOpen(false)}
          />
          <View testID="reader-actions-menu" style={styles.readerActionsMenu}>
            <TouchableOpacity
              testID="open-search-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={openSearch}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>بحث في الكتاب</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="open-favorite-verses-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={() => openSavedVerses('favorites')}
            >
              <MaterialCommunityIcons
                name="bookmark-star-outline"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>الآيات المفضلة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="open-highlighted-verses-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={() => openSavedVerses('highlighted')}
            >
              <MaterialCommunityIcons
                name="format-color-highlight"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>الآيات المظللة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="increase-font-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={increaseVerseFontSize}
            >
              <MaterialCommunityIcons
                name="format-font-size-increase"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>تكبير الخط</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="decrease-font-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={decreaseVerseFontSize}
            >
              <MaterialCommunityIcons
                name="format-font-size-decrease"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>تصغير الخط</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cycle-text-color-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={cycleVerseTextColor}
            >
              <MaterialCommunityIcons
                name="palette-outline"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>تغيير لون الكلام</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-night-mode-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={() => setNightMode(!isNightMode)}
            >
              <MaterialCommunityIcons
                name={isNightMode ? 'white-balance-sunny' : 'weather-night'}
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>
                {isNightMode ? 'إلغاء الدارك مود' : 'تفعيل الدارك مود'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-diacritics-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={() => setStripDiacritics(current => !current)}
            >
              <MaterialCommunityIcons
                name="format-clear"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>
                {stripDiacritics ? 'إظهار التشكيل' : 'إزالة التشكيل'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-parallel-life-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={() => {
                setSelectedLifeVerseNumber(null);
                setWordMeaningsEnabled(false);
                setInlineLifeTranslation(false);
                setParallelLifeTranslation(current => !current);
                setReaderMenuOpen(false);
              }}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant-outline"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>
                {parallelLifeTranslation
                  ? 'إغلاق كتاب الحياة الجانبي'
                  : 'فتح كتاب الحياة جنب النص'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-inline-life-button"
              style={[
                styles.readerActionRow,
                inlineLifeTranslation && styles.readerActionRowActive,
              ]}
              activeOpacity={0.82}
              onPress={() => {
                setSelectedLifeVerseNumber(null);
                setWordMeaningsEnabled(false);
                setParallelLifeTranslation(false);
                setInlineLifeTranslation(current => !current);
              }}
            >
              <MaterialCommunityIcons
                name="book-open-outline"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>ترجمة الحياة آية بآية</Text>
              {inlineLifeTranslation ? (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color={colors.accent}
                />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-word-meanings-button"
              style={styles.readerActionRow}
              activeOpacity={0.82}
              onPress={() => {
                setSelectedLifeVerseNumber(null);
                setParallelLifeTranslation(false);
                setInlineLifeTranslation(false);
                setWordMeaningsEnabled(current => !current);
                setReaderMenuOpen(false);
              }}
            >
              <MaterialCommunityIcons
                name="text-search"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.readerActionText}>
                {wordMeaningsEnabled ? 'إغلاق معاني الكلمات' : 'معاني الكلمات'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.content,
          !selecting &&
            selectionMode && {
              paddingBottom: tabBarHeight + SELECTION_BAR_HEIGHT,
            },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {selecting && (
          <View style={styles.selectionHero}>
            <View style={styles.selectionHeroIcon}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={28}
                color="#FFF"
              />
            </View>
            <Text style={styles.selectionHeroTitle}>
              اختار المكان اللي تحب تقرأ منه
            </Text>
            <Text style={styles.selectionHeroSubtitle}>
              حدد العهد والسفر والإصحاح، وبعدها افتح القراءة مباشرة.
            </Text>
          </View>
        )}

        {!selecting ? (
          <View style={styles.chapterNavCard}>
            <TouchableOpacity
              testID="previous-chapter-button"
              style={[
                styles.chapterNavButton,
                !hasPreviousChapter && styles.chapterNavButtonDisabled,
              ]}
              activeOpacity={0.84}
              disabled={!hasPreviousChapter}
              onPress={() => openAdjacentChapter(-1)}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={hasPreviousChapter ? '#FFF' : colors.mutedText}
              />
              <Text
                style={[
                  styles.chapterNavButtonText,
                  !hasPreviousChapter && styles.chapterNavButtonTextDisabled,
                ]}
              >
                السابق
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="chapter-nav-current-button"
              style={styles.chapterNavCurrent}
              activeOpacity={0.82}
              onPress={openSelectionPage}
            >
              <View style={styles.chapterNavCurrentValue}>
                <Text style={styles.chapterNavCurrentText}>
                  {selectedBook.bookName} {selectedChapter}{' '}
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={18}
                    style={styles.chapterNavCurrentChevron}
                    color={colors.mutedText}
                  />
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="next-chapter-button"
              style={[
                styles.chapterNavButton,
                !hasNextChapter && styles.chapterNavButtonDisabled,
              ]}
              activeOpacity={0.84}
              disabled={!hasNextChapter}
              onPress={() => openAdjacentChapter(1)}
            >
              <Text
                style={[
                  styles.chapterNavButtonText,
                  !hasNextChapter && styles.chapterNavButtonTextDisabled,
                ]}
              >
                التالي
              </Text>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={hasNextChapter ? '#FFF' : colors.mutedText}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {selecting ? (
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View style={styles.pickerIcon}>
                <MaterialCommunityIcons
                  name="tune-variant"
                  size={18}
                  color="#FFF"
                />
              </View>
              <View style={styles.pickerHeaderText}>
                <Text style={styles.pickerTitle}>اختار القراءة</Text>
                <Text style={styles.pickerSubtitle}>
                  {selectedBook.bookName} - إصحاح {selectedChapter}
                </Text>
              </View>
            </View>

            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>١</Text>
              </View>
              <Text style={styles.stepTitle}>العهد</Text>
            </View>
            <TouchableOpacity
              testID="testament-dropdown"
              style={[
                styles.dropdownTrigger,
                openDropdown === 'testament' && styles.dropdownTriggerOpen,
              ]}
              activeOpacity={0.84}
              onPress={() => toggleDropdown('testament')}
            >
              <MaterialCommunityIcons
                name={
                  openDropdown === 'testament' ? 'chevron-up' : 'chevron-down'
                }
                size={22}
                color={colors.accent}
              />
              <Text style={styles.dropdownValue}>
                {testamentLabels[selectedTestament]}
              </Text>
            </TouchableOpacity>
            {openDropdown === 'testament' ? (
              <View style={styles.dropdownMenu}>
                {(['old', 'new'] as Testament[]).map(testament => {
                  const selected = testament === selectedTestament;
                  return (
                    <TouchableOpacity
                      key={testament}
                      style={[
                        styles.dropdownOption,
                        selected && styles.dropdownOptionActive,
                      ]}
                      activeOpacity={0.82}
                      onPress={() => selectTestament(testament)}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          selected && styles.dropdownOptionTextActive,
                        ]}
                      >
                        {testamentLabels[testament]}
                      </Text>
                      {selected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={18}
                          color={colors.accent}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>٢</Text>
              </View>
              <Text style={styles.stepTitle}>السفر</Text>
            </View>
            <TouchableOpacity
              testID="book-dropdown"
              style={[
                styles.dropdownTrigger,
                openDropdown === 'book' && styles.dropdownTriggerOpen,
              ]}
              activeOpacity={0.84}
              onPress={() => toggleDropdown('book')}
            >
              <MaterialCommunityIcons
                name={openDropdown === 'book' ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={colors.accent}
              />
              <View style={styles.dropdownValueBlock}>
                <Text style={styles.dropdownValue}>
                  {selectedBook.bookName}
                </Text>
                <Text style={styles.dropdownMeta}>
                  {selectedBook.chapters} إصحاح
                </Text>
              </View>
            </TouchableOpacity>
            {openDropdown === 'book' ? (
              <View style={styles.dropdownMenu}>
                <ScrollView
                  nestedScrollEnabled
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {books.map(book => {
                    const selected = book.bookID === selectedBook.bookID;
                    return (
                      <TouchableOpacity
                        key={book.bookID}
                        testID={`book-${book.bookID}`}
                        style={[
                          styles.dropdownOption,
                          selected && styles.dropdownOptionActive,
                        ]}
                        activeOpacity={0.82}
                        onPress={() => {
                          setSelectedLifeVerseNumber(null);
                          setSelectedBookId(book.bookID);
                          setSelectedChapter(1);
                          setOpenDropdown(null);
                        }}
                      >
                        <View style={styles.optionTextBlock}>
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              selected && styles.dropdownOptionTextActive,
                            ]}
                          >
                            {book.bookName}
                          </Text>
                          <Text style={styles.dropdownOptionMeta}>
                            {book.chapters} إصحاح
                          </Text>
                        </View>
                        {selected ? (
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={18}
                            color={colors.accent}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>٣</Text>
              </View>
              <Text style={styles.stepTitle}>الإصحاح</Text>
            </View>
            <TouchableOpacity
              testID="chapter-dropdown"
              style={[
                styles.dropdownTrigger,
                openDropdown === 'chapter' && styles.dropdownTriggerOpen,
              ]}
              activeOpacity={0.84}
              onPress={() => toggleDropdown('chapter')}
            >
              <MaterialCommunityIcons
                name={
                  openDropdown === 'chapter' ? 'chevron-up' : 'chevron-down'
                }
                size={22}
                color={colors.accent}
              />
              <Text style={styles.dropdownValue}>إصحاح {selectedChapter}</Text>
            </TouchableOpacity>
            {openDropdown === 'chapter' ? (
              <View style={styles.chapterDropdownMenu}>
                {Array.from({ length: selectedBook.chapters }, (_, index) => {
                  const chapterNumber = index + 1;
                  const selected = chapterNumber === selectedChapter;
                  return (
                    <TouchableOpacity
                      key={chapterNumber}
                      testID={`chapter-${chapterNumber}`}
                      style={[
                        styles.chapterOption,
                        selected && styles.chapterOptionActive,
                      ]}
                      activeOpacity={0.82}
                      onPress={() => {
                        setSelectedLifeVerseNumber(null);
                        setSelectedChapter(chapterNumber);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.chapterOptionText,
                          selected && styles.chapterOptionTextActive,
                        ]}
                      >
                        {chapterNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
            <TouchableOpacity
              testID="start-reading-button"
              style={styles.startReadingButton}
              activeOpacity={0.86}
              onPress={startReading}
            >
              <MaterialCommunityIcons
                name="book-open-variant"
                size={19}
                color="#FFF"
              />
              <Text style={styles.startReadingText}>ابدأ القراءة</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!selecting ? (
          <View
            testID="reader-card"
            onLayout={event => {
              readerCardYRef.current = event.nativeEvent.layout.y;
            }}
            style={[
              styles.readerCard,
              parallelLifeTranslation && styles.readerCardParallel,
            ]}
          >
            {parallelLifeTranslation ? (
              <View style={styles.parallelHeaderRow}>
                <View style={styles.parallelHeaderSpacer} />
                <View style={styles.parallelHeaderColumns}>
                  <Text style={styles.parallelHeaderText}>النص الأساسي</Text>
                  <Text
                    testID="parallel-life-header"
                    style={styles.parallelHeaderText}
                  >
                    كتاب الحياة
                  </Text>
                </View>
              </View>
            ) : null}
            {chapter.verses.map(verse => {
              const verseKey = getVerseKey(
                selectedBook.bookID,
                selectedChapter,
                verse.verse,
              );
              const selected = selectedLifeVerseNumber === verse.verse;
              const annotation = verseAnnotations[verseKey] ?? {};
              const selectedForAction = Boolean(selectedVerseKeys[verseKey]);
              const lifeVerse = lifeChapter?.verses.find(
                item => item.verse === verse.verse,
              );
              const verseTextStyle = {
                color: annotation.highlightColor
                  ? '#000'
                  : resolvedVerseTextColor,
                fontSize: verseFontSize,
                lineHeight: Math.round(verseFontSize * 1.82),
              };
              const verseHighlightStyle = annotation.highlightColor
                ? { backgroundColor: annotation.highlightColor }
                : null;

              if (parallelLifeTranslation) {
                return (
                  <TouchableOpacity
                    key={verse.verse}
                    testID={`parallel-verse-${verse.verse}`}
                    onLayout={event => registerVerseLayout(verseKey, event)}
                    activeOpacity={0.82}
                    onPress={() => {
                      if (selectionMode) {
                        toggleSelectedVerse(verseKey);
                      }
                    }}
                    onLongPress={() => handleVerseLongPress(verseKey)}
                    style={[
                      styles.parallelVerseBlock,
                      verseHighlightStyle,
                      selectedForAction && styles.selectedVerseForAction,
                    ]}
                  >
                    <View style={styles.parallelVerseNumber}>
                      <Text style={styles.verseNumberText}>{verse.verse}</Text>
                    </View>
                    {selectedForAction ? (
                      <View
                        testID={`selected-verse-check-${verse.verse}`}
                        style={styles.selectedVerseCheck}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color="#FFF"
                        />
                      </View>
                    ) : null}
                    <View style={styles.parallelColumns}>
                      <View style={styles.parallelColumn}>
                        <Text style={[styles.verseText, verseTextStyle]}>
                          {formatVerseText(verse.text)}
                        </Text>
                      </View>
                      <View style={styles.parallelColumn}>
                        <Text style={[styles.verseText, verseTextStyle]}>
                          {formatVerseText(
                            lifeVerse?.text ?? 'الترجمة غير متاحة لهذه الآية.',
                          )}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View
                  key={verse.verse}
                  onLayout={event => registerVerseLayout(verseKey, event)}
                  style={styles.verseBlock}
                >
                  <TouchableOpacity
                    testID={`verse-row-${verse.verse}`}
                    style={[
                      styles.verseRow,
                      selected && styles.verseRowActive,
                      verseHighlightStyle,
                      selectedForAction && styles.selectedVerseForAction,
                    ]}
                    activeOpacity={0.82}
                    onPress={() => handleVersePress(verse.verse, verseKey)}
                    onLongPress={() => handleVerseLongPress(verseKey)}
                  >
                    <View style={styles.verseNumber}>
                      <Text style={styles.verseNumberText}>{verse.verse}</Text>
                    </View>
                    <Text style={[styles.verseText, verseTextStyle]}>
                      {formatVerseText(verse.text)}
                    </Text>
                    {selectedForAction ? (
                      <View
                        testID={`selected-verse-check-${verse.verse}`}
                        style={styles.selectedVerseCheck}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color="#FFF"
                        />
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  {selected && inlineLifeTranslation && !wordMeaningsEnabled ? (
                    <View
                      testID={`inline-life-translation-${verse.verse}`}
                      style={styles.inlineLifeTranslation}
                    >
                      <Text style={styles.inlineLifeTranslationLabel}>
                        ترجمة الحياة
                      </Text>
                      <Text style={styles.inlineLifeTranslationText}>
                        {formatVerseText(
                          lifeVerse?.text ?? 'الترجمة غير متاحة لهذه الآية.',
                        )}
                      </Text>
                    </View>
                  ) : null}

                  {selected && wordMeaningsEnabled ? (
                    <View
                      testID={`word-meanings-${verse.verse}`}
                      style={styles.wordMeaningsCard}
                    >
                      <Text style={styles.lifeTranslationLabel}>
                        معاني الكلمات
                      </Text>
                      {wordMeaningsForSelectedVerse.length ? (
                        wordMeaningsForSelectedVerse.map(item => {
                          const strongEntry = getStrongsEntry(item.strongId);
                          const originalLine = strongEntry
                            ? [
                                strongEntry.original,
                                strongEntry.transliteration
                                  ? `(${strongEntry.transliteration})`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' ')
                            : item.strongId;

                          return (
                            <View
                              key={`${item.displayWord}-${item.strongId}`}
                              style={styles.wordMeaningItem}
                            >
                              <Text style={styles.wordMeaningTitle}>
                                {item.displayWord}
                              </Text>
                              <Text style={styles.wordMeaningOriginal}>
                                {originalLine}
                              </Text>
                              <Text style={styles.wordMeaningText}>
                                {strongEntry?.definitionAr ||
                                  strongEntry?.definitionEn ||
                                  'لم يتم تحميل معنى هذا الرقم بعد.'}
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.wordMeaningText}>
                          لسه مفيش معاني محفوظة للآية دي.
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* ─── Selection Bar (bottom sheet) ─── */}
      {!selecting && selectionMode ? (
        <View
          testID="verse-selection-toolbar"
          style={[
            styles.selectionBar,
            {
              bottom: tabBarHeight,
              paddingBottom: spacing.sm,
            },
          ]}
        >
          <View style={styles.selectionBarHandle} />

          <View style={styles.selectionBarTop}>
            <View style={styles.selectionBarInfo}>
              <View style={styles.selectionBarCountBadge}>
                <Text style={styles.selectionBarCountText}>
                  {selectedVerseKeyList.length}
                </Text>
              </View>
              <Text style={styles.selectionBarLabel}>آية محددة</Text>
            </View>
            <TouchableOpacity
              testID="clear-verse-selection-button"
              style={styles.selectionBarCloseBtn}
              activeOpacity={0.82}
              onPress={() => setSelectedVerseKeys({})}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={colors.mutedText}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectionBarActions}
          >
            <TouchableOpacity
              testID="copy-selected-verses-button"
              style={styles.selectionChip}
              activeOpacity={0.82}
              onPress={copySelectedVerses}
            >
              <View style={styles.selectionChipIcon}>
                <MaterialCommunityIcons
                  name="content-copy"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.selectionChipText}>نسخ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="favorite-selected-verses-button"
              style={styles.selectionChip}
              activeOpacity={0.82}
              onPress={toggleFavoriteForSelectedVerses}
            >
              <View
                style={[
                  styles.selectionChipIcon,
                  selectedVersesAllFavorited && styles.selectionChipIconGold,
                ]}
              >
                <MaterialCommunityIcons
                  name={selectedVersesAllFavorited ? 'star' : 'star-outline'}
                  size={18}
                  color={selectedVersesAllFavorited ? palette.gold : colors.accent}
                />
              </View>
              <Text style={styles.selectionChipText}>
                {selectedVersesAllFavorited ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="design-selected-verses-button"
              style={styles.selectionChip}
              activeOpacity={0.82}
              onPress={openSelectedVersesDesigner}
            >
              <View style={styles.selectionChipIcon}>
                <MaterialCommunityIcons
                  name="image-edit-outline"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.selectionChipText}>تصميم</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="reflect-selected-verses-button"
              style={styles.selectionChip}
              activeOpacity={0.82}
              onPress={openSelectedVersesReflection}
            >
              <View style={styles.selectionChipIcon}>
                <MaterialCommunityIcons
                  name="notebook-edit-outline"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.selectionChipText}>تأمل</Text>
            </TouchableOpacity>

            <SelectionHighlightRow
              styles={styles}
              colors={colors}
              selectedHighlightColor={selectedVersesHighlightColor}
              onHighlight={highlightSelectedVerses}
              onRemoveHighlight={removeHighlightFromSelectedVerses}
            />
          </ScrollView>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default BibleReaderScreen;
