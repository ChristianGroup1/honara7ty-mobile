import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
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
import {
  Difficulty,
  MemorizationStackParamList,
  VerseSelectionMode,
} from './types';
import { DIFFICULTY_LEVELS } from './utils';

type Props = StackScreenProps<MemorizationStackParamList, 'Pick'>;
type PickerType = 'chapter' | 'verseStart' | 'verseEnd' | null;

interface VerseOption {
  value: number;
}

const PickScreen = ({ navigation }: Props) => {
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 360;
  const bookCardWidth = isCompactWidth ? width * 0.42 : width * 0.36;
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(
    BIBLE_BOOKS[0] ?? null,
  );
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verseMode, setVerseMode] = useState<VerseSelectionMode>('single');
  const [selectedVerseStart, setSelectedVerseStart] = useState(1);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [activeTestament, setActiveTestament] = useState<Testament>(
    BIBLE_BOOKS[0]?.testament ?? 'old',
  );
  const [activePicker, setActivePicker] = useState<PickerType>(null);
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

  const verseEndOptions = useMemo<VerseOption[]>(
    () => verseOptions.filter(option => option.value >= selectedVerseStart),
    [selectedVerseStart, verseOptions],
  );

  const visibleBooks =
    activeTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;

  const pickerTitle = useMemo(() => {
    switch (activePicker) {
      case 'chapter':
        return 'اختر الإصحاح';
      case 'verseStart':
        return verseMode === 'single' ? 'اختر العدد' : 'من عدد';
      case 'verseEnd':
        return 'إلى عدد';
      default:
        return '';
    }
  }, [activePicker, verseMode]);

  const pickerOptions = useMemo(() => {
    switch (activePicker) {
      case 'chapter':
        return chapterOptions;
      case 'verseStart':
        return verseOptions;
      case 'verseEnd':
        return verseEndOptions;
      default:
        return [];
    }
  }, [activePicker, chapterOptions, verseEndOptions, verseOptions]);

  const handleBookSelect = (book: BibleBook) => {
    const firstVerse = book.chaptersData[0]?.verses[0]?.verse ?? 1;
    setActiveTestament(book.testament);
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerseStart(firstVerse);
    setSelectedVerseEnd(firstVerse);
  };

  const handleModeChange = (mode: VerseSelectionMode) => {
    setVerseMode(mode);
    if (mode === 'single') {
      setSelectedVerseEnd(selectedVerseStart);
    } else if (selectedVerseEnd < selectedVerseStart) {
      setSelectedVerseEnd(selectedVerseStart);
    }
  };

  const handlePickerSelect = (value: number) => {
    if (!selectedBook) {
      return;
    }

    if (activePicker === 'chapter') {
      const chapterData = selectedBook.chaptersData[value - 1];
      const firstVerse = chapterData?.verses[0]?.verse ?? 1;
      setSelectedChapter(value);
      setSelectedVerseStart(firstVerse);
      setSelectedVerseEnd(firstVerse);
    }

    if (activePicker === 'verseStart') {
      setSelectedVerseStart(value);
      if (verseMode === 'single' || selectedVerseEnd < value) {
        setSelectedVerseEnd(value);
      }
    }

    if (activePicker === 'verseEnd') {
      setSelectedVerseEnd(value);
    }

    setActivePicker(null);
  };

  const startMemorization = () => {
    if (!selectedBook || !selectedChapterData) {
      showAlert('تنبيه', 'اختر السفر والإصحاح أولاً.', undefined, 'warning');
      return;
    }

    const start = selectedVerseStart;
    const end = verseMode === 'range' ? selectedVerseEnd : selectedVerseStart;

    if (end < start) {
      showAlert(
        'تنبيه',
        'آخر عدد يجب أن يكون بعد أول عدد.',
        undefined,
        'warning',
      );
      return;
    }

    const selectedTexts = selectedChapterData.verses
      .filter(verse => verse.verse >= start && verse.verse <= end)
      .map(verse => verse.text.trim())
      .filter(Boolean);

    if (selectedTexts.length === 0) {
      showAlert(
        'تنبيه',
        'لم يتم العثور على الأعداد المطلوبة.',
        undefined,
        'warning',
      );
      return;
    }

    navigation.navigate('Recite', {
      selectedBook,
      selectedChapter,
      selectedVerseStart: start,
      selectedVerseEnd: end,
      verseMode,
      difficulty,
      verseOriginal: selectedTexts.join(' '),
      bookLabel: selectedBook.bookName,
      chapterLabel:
        start === end
          ? `إصحاح ${selectedChapter}، عدد ${start}`
          : `إصحاح ${selectedChapter}، الأعداد ${start}-${end}`,
    });
  };

  const renderPickerButton = (
    label: string,
    value: string,
    picker: Exclude<PickerType, null>,
    disabled = false,
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.selectButtonDisabled]}
        onPress={() => !disabled && setActivePicker(picker)}
        disabled={disabled}
      >
        <MaterialCommunityIcons
          name="chevron-down"
          size={22}
          color={disabled ? '#AAA' : '#0A1124'}
        />
        <Text
          style={[
            styles.selectButtonText,
            disabled && styles.selectButtonTextDisabled,
          ]}
        >
          {value}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title="حفظ الكتاب المقدس"
        onBack={() => navigation.getParent()?.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={24}
                color="#FFF"
              />
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Memorization Flow</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>ابدأ من هنا</Text>
          <Text style={styles.heroTitle}>اختر المرجع الذي تريد حفظه</Text>
          <Text style={styles.heroText}>
            حدّد السفر والإصحاح والأعداد، ثم اختر مستوى التحدي المناسب لك.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons
                name="library-shelves"
                size={18}
                color="#0A1124"
              />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionLabel}>اختر السفر</Text>
              <Text style={styles.sectionCaption}>
                تنقّل بين أسفار العهدين واختر المرجع المناسب.
              </Text>
            </View>
          </View>
          <View style={styles.testamentTabs}>
            <TouchableOpacity
              style={[
                styles.testamentTab,
                activeTestament === 'old' && styles.testamentTabActive,
              ]}
              onPress={() => setActiveTestament('old')}
            >
              <Text
                style={[
                  styles.testamentTabText,
                  activeTestament === 'old' && styles.testamentTabTextActive,
                ]}
              >
                العهد القديم
              </Text>
              <Text
                style={[
                  styles.testamentTabCount,
                  activeTestament === 'old' && styles.testamentTabCountActive,
                ]}
              >
                {OLD_TESTAMENT_BOOKS.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.testamentTab,
                activeTestament === 'new' && styles.testamentTabActive,
              ]}
              onPress={() => setActiveTestament('new')}
            >
              <Text
                style={[
                  styles.testamentTabText,
                  activeTestament === 'new' && styles.testamentTabTextActive,
                ]}
              >
                العهد الجديد
              </Text>
              <Text
                style={[
                  styles.testamentTabCount,
                  activeTestament === 'new' && styles.testamentTabCountActive,
                ]}
              >
                {NEW_TESTAMENT_BOOKS.length}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subSectionLabel}>
            {activeTestament === 'old'
              ? 'أسفار العهد القديم'
              : 'أسفار العهد الجديد'}
          </Text>
          <FlatList
            data={visibleBooks}
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.bookID}
            contentContainerStyle={styles.bookSliderContent}
            snapToInterval={bookCardWidth + 10}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.bookCard,
                  isCompactWidth ? styles.bookCardCompact : null,
                  selectedBook?.bookID === item.bookID && styles.bookCardActive,
                ]}
                onPress={() => handleBookSelect(item)}
              >
                <View style={styles.bookCardTop}>
                  {selectedBook?.bookID === item.bookID ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color="#C9A84C"
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.bookCardTitle,
                    isCompactWidth ? styles.bookCardTitleCompact : null,
                    selectedBook?.bookID === item.bookID &&
                      styles.bookCardTitleActive,
                  ]}
                >
                  {item.shortName}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Text style={styles.sliderHint}>
            اسحب يمينًا ويسارًا للتنقل بين الأسفار
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons
                name="map-marker-radius-outline"
                size={18}
                color="#0A1124"
              />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionLabel}>اختر المكان</Text>
              <Text style={styles.sectionCaption}>
                حدّد الإصحاح والعدد أو مدى الأعداد التي تريد تسميعها.
              </Text>
            </View>
          </View>

          {renderPickerButton(
            'الإصحاح',
            `إصحاح ${selectedChapter}`,
            'chapter',
            !selectedBook,
          )}

          <Text style={styles.sectionLabel}>نوع التحديد</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeChip,
                isCompactWidth ? styles.modeChipCompact : null,
                verseMode === 'single' && styles.modeChipActive,
              ]}
              onPress={() => handleModeChange('single')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  isCompactWidth ? styles.modeChipTextCompact : null,
                  verseMode === 'single' && styles.modeChipTextActive,
                ]}
              >
                عدد واحد
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeChip,
                isCompactWidth ? styles.modeChipCompact : null,
                verseMode === 'range' && styles.modeChipActive,
              ]}
              onPress={() => handleModeChange('range')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  isCompactWidth ? styles.modeChipTextCompact : null,
                  verseMode === 'range' && styles.modeChipTextActive,
                ]}
              >
                كذا عدد
              </Text>
            </TouchableOpacity>
          </View>

          {renderPickerButton(
            verseMode === 'single' ? 'العدد' : 'من عدد',
            `عدد ${selectedVerseStart}`,
            'verseStart',
            !selectedChapterData,
          )}

          {verseMode === 'range'
            ? renderPickerButton(
                'إلى عدد',
                `عدد ${selectedVerseEnd}`,
                'verseEnd',
                !selectedChapterData,
              )
            : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="brain" size={18} color="#0A1124" />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionLabel}>مستوى الحفظ</Text>
              <Text style={styles.sectionCaption}>
                كل مستوى يغيّر عدد الكلمات المخفية أثناء التسميع.
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
              ? 'سيتم إخفاء كلمات قليلة لتبدأ بسهولة.'
              : difficulty === 'medium'
              ? 'سيتم إخفاء عدد متوسط من الكلمات.'
              : 'سيتم إخفاء عدد أكبر من الكلمات لتحدي أقوى.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={startMemorization}>
          <MaterialCommunityIcons name="brain" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>ابدأ التسميع</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActivePicker(null)}
          />
          <View
            style={[
              styles.modalSheet,
              isCompactWidth ? styles.modalSheetCompact : null,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color="#0A1124"
                />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.optionGrid}>
              {pickerOptions.map(option => (
                <TouchableOpacity
                  key={`${activePicker}-${option.value}`}
                  style={styles.optionChip}
                  onPress={() => handlePickerSelect(option.value)}
                >
                  <Text style={styles.optionChipText}>{option.value}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </View>
  );
};

export default PickScreen;
