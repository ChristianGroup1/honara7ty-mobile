import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BiblePassagePicker from '../shared/BiblePassagePicker';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomAlert, { AlertButton, AlertConfig } from '../shared/CustomAlert';
import {
  BIBLE_BOOKS,
  BibleBook,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../data/bibleMetadata';
import MemorizationHeader from './MemorizationHeader';
import { memorizationStyles as styles } from './styles';
import { Difficulty, MemorizationStackParamList } from './types';
import { DIFFICULTY_LEVELS } from './utils';
import { getStrings } from '../../localization';
import MemorizationStatsPanel from './MemorizationStatsPanel';

type Props = StackScreenProps<MemorizationStackParamList, 'Pick'>;

interface VerseOption {
  value: number;
}

const PickScreen = ({ navigation }: Props) => {
  const memorizationStrings = getStrings().bibleMemorization;
  const strings = memorizationStrings.pick;
  const [activeTab, setActiveTab] = useState<'pick' | 'stats'>('pick');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(
    BIBLE_BOOKS[0] ?? null,
  );
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([1]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [activeTestament, setActiveTestament] = useState<Testament>(
    BIBLE_BOOKS[0]?.testament ?? 'old',
  );
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const selectedChapterData = useMemo(() => {
    if (!selectedBook) {
      return null;
    }
    return selectedBook.chaptersData[selectedChapter - 1] ?? null;
  }, [selectedBook, selectedChapter]);

  const chapterOptions = useMemo<VerseOption[]>(
    () =>
      selectedBook
        ? Array.from({ length: selectedBook.chapters }, (_, index) => ({
            value: index + 1,
          }))
        : [],
    [selectedBook],
  );

  const verseOptions = useMemo<VerseOption[]>(
    () =>
      selectedChapterData
        ? selectedChapterData.verses.map(verse => ({
            value: verse.verse,
          }))
        : [],
    [selectedChapterData],
  );

  const visibleBooks = useMemo(
    () =>
      activeTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS,
    [activeTestament],
  );

  const verseValues = useMemo(
    () => verseOptions.map(o => o.value),
    [verseOptions],
  );

  const handleTestamentChange = useCallback((testament: Testament) => {
    setActiveTestament(testament);
    setSelectedBook(null);
    setSelectedChapter(1);
    setSelectedVerses([]);
  }, []);

  const handleBookSelect = useCallback((book: BibleBook) => {
    const firstVerse = book.chaptersData[0]?.verses[0]?.verse ?? 1;
    setActiveTestament(book.testament);
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerses([firstVerse]);
  }, []);

  const handleBookSelectByName = useCallback(
    (bookName: string) => {
      const book = BIBLE_BOOKS.find(b => b.bookName === bookName);
      if (book) {
        handleBookSelect(book);
      }
    },
    [handleBookSelect],
  );

  const startMemorization = () => {
    if (!selectedBook || !selectedChapterData) {
      showAlert(
        strings.alerts.title,
        strings.alerts.selectBookAndChapter,
        undefined,
        'warning',
      );
      return;
    }

    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    const start = sortedVerses[0];
    const end = sortedVerses[sortedVerses.length - 1];

    const selectedTexts = selectedChapterData.verses
      .filter(verse => selectedVerses.includes(verse.verse))
      .map(verse => verse.text.trim())
      .filter(Boolean);

    if (selectedTexts.length === 0) {
      showAlert(
        strings.alerts.title,
        strings.alerts.versesNotFound,
        undefined,
        'warning',
      );
      return;
    }

    navigation.navigate('Recite', {
      selectedBook,
      selectedChapter,
      selectedVerses: sortedVerses,
      verseMode: sortedVerses.length === 1 ? 'single' : 'multi',
      difficulty,
      verseOriginal: selectedTexts.join(' '),
      bookLabel: selectedBook.bookName,
      chapterLabel:
        sortedVerses.length === 1
          ? strings.chapterLabelSingle(selectedChapter, start)
          : sortedVerses.length === end - start + 1
          ? strings.chapterLabelRange(selectedChapter, start, end)
          : `${selectedBook.bookName} ${selectedChapter}:${sortedVerses.join(
              ',',
            )}`,
    });
  };

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title={strings.title}
        onBack={() => navigation.getParent()?.goBack()}
      />

      <View style={styles.segmentedWrap}>
        <TouchableOpacity
          style={[
            styles.segmentedOption,
            activeTab === 'pick' && styles.segmentedOptionActive,
          ]}
          onPress={() => setActiveTab('pick')}
        >
          <Text
            style={[
              styles.segmentedOptionText,
              activeTab === 'pick' && styles.segmentedOptionTextActive,
            ]}
          >
            {memorizationStrings.tabs.pick}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentedOption,
            activeTab === 'stats' && styles.segmentedOptionActive,
          ]}
          onPress={() => setActiveTab('stats')}
        >
          <Text
            style={[
              styles.segmentedOptionText,
              activeTab === 'stats' && styles.segmentedOptionTextActive,
            ]}
          >
            {memorizationStrings.tabs.stats}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stats' ? (
        <MemorizationStatsPanel
          contentContainerStyle={styles.tabPanelContent}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons
                  name="book-open-page-variant"
                  size={24}
                  color="#FFF"
                />
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{strings.heroBadge}</Text>
              </View>
            </View>
            <Text style={styles.heroEyebrow}>{strings.heroEyebrow}</Text>
            <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
            <Text style={styles.heroText}>{strings.heroText}</Text>
          </View>

          <View style={styles.sectionCard}>
            <BiblePassagePicker
              labels={{
                bookTitle: strings.chooseBook,
                chapterTitle: strings.chapter,
                chapterHint: strings.choosePlaceCaption,
                selectBookFirst: strings.chooseBookCaption,
                oldTestament: strings.oldTestament,
                newTestament: strings.newTestament,
                verseTitle: strings.verse,
                fromVerseTitle: strings.fromVerse,
                toVerseTitle: strings.toVerse,
              }}
              selectedTestament={activeTestament}
              books={visibleBooks}
              selectedBook={selectedBook?.bookName || ''}
              chapterOptions={chapterOptions.map(o => o.value)}
              selectedChapters={[selectedChapter]}
              selectedVerses={selectedVerses}
              multiSelectChapters={false}
              verseMode="multi"
              verseOptions={verseValues}
              onSetTestament={handleTestamentChange}
              onSetBook={handleBookSelectByName}
              onToggleChapter={chapter => {
                const chapterData = selectedBook?.chaptersData[chapter - 1];
                const firstVerse = chapterData?.verses[0]?.verse ?? 1;
                setSelectedChapter(chapter);
                setSelectedVerses([firstVerse]);
              }}
              onToggleVerse={verse => {
                setSelectedVerses(current =>
                  current.includes(verse)
                    ? current.length > 1
                      ? current.filter(v => v !== verse)
                      : current
                    : [...current, verse],
                );
              }}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIconWrap}>
                <MaterialCommunityIcons
                  name="brain"
                  size={18}
                  color="#0A1124"
                />
              </View>
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionLabel}>{strings.levelTitle}</Text>
                <Text style={styles.sectionCaption}>
                  {strings.levelCaption}
                </Text>
              </View>
            </View>
            <View style={styles.levelRow}>
              {(Object.keys(DIFFICULTY_LEVELS) as Difficulty[]).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelChip,
                    difficulty === level && styles.levelChipActive,
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text
                    style={[
                      styles.levelChipText,
                      difficulty === level && styles.levelChipTextActive,
                    ]}
                  >
                    {DIFFICULTY_LEVELS[level].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.helperText}>
              {difficulty === 'easy'
                ? strings.easyHint
                : difficulty === 'medium'
                ? strings.mediumHint
                : difficulty === 'hard'
                ? strings.hardHint
                : strings.fullTextHint}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={startMemorization}
          >
            <MaterialCommunityIcons name="brain" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>{strings.start}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </View>
  );
};

export default PickScreen;
