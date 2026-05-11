import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, ScrollView, StatusBar, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertConfig } from '../shared/CustomAlert';
import { computeStreak } from '../badges/utils';
import { getStrings } from '../../localization';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../data/bibleMetadata';
import DevotionCalendarSummary from './DevotionCalendarSummary';
import DevotionCalendarGrid from './DevotionCalendarGrid';
import DevotionDayEditor from './DevotionDayEditor';
import { devotionCalendarStyles as styles, NAVY } from './styles';
import { DevotionDayLog, TestamentOption } from './types';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import { buildMonthCells, getMonthKey, startOfMonth, toIsoDate } from './utils';
import {
  chaptersFromLegacy,
  firstSelectedChapter,
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import { syncDevotionReminderSchedule } from '../../lib/devotionReminder';
import { refreshDevotionLogs, saveDevotionLog } from '../../lib/offlineSync';

const DevotionCalendarScreen = ({ navigation }: any) => {
  const strings = getStrings().devotionCalendar;
  const insets = useSafeAreaInsets();
  const hasLoadedCalendarRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    toIsoDate(new Date()),
  );
  const [selectedCompleted, setSelectedCompleted] = useState(true);
  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [devotionLogsByDate, setDevotionLogsByDate] = useState<
    Record<string, DevotionDayLog>
  >({});
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const testamentOptions: TestamentOption[] = useMemo(
    () => [
      {
        key: 'old',
        label: strings.oldTestament,
        icon: 'book-open-page-variant-outline',
      },
      { key: 'new', label: strings.newTestament, icon: 'cross' },
    ],
    [strings.newTestament, strings.oldTestament],
  );

  const loadDevotionDays = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setDevotionLogsByDate({});
        return;
      }

      const { data: logsMap } = await refreshDevotionLogs(userId);
      setDevotionLogsByDate(logsMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedCalendarRef.current;
      hasLoadedCalendarRef.current = true;
      loadDevotionDays(shouldShowLoader);
    }, [loadDevotionDays]),
  );

  const completedDates = useMemo(
    () =>
      Object.entries(devotionLogsByDate)
        .filter(([, value]) => value.completed)
        .map(([date]) => date),
    [devotionLogsByDate],
  );
  const completedSet = useMemo(() => new Set(completedDates), [completedDates]);
  const monthCells = useMemo(
    () => buildMonthCells(visibleMonth, completedSet),
    [completedSet, visibleMonth],
  );
  const currentStreak = useMemo(
    () => computeStreak(completedDates),
    [completedDates],
  );
  const monthCompletedCount = useMemo(() => {
    const prefix = getMonthKey(visibleMonth);
    return completedDates.filter(date => date.startsWith(prefix)).length;
  }, [completedDates, visibleMonth]);
  const totalCompleted = completedDates.length;
  const todayIso = toIsoDate(new Date());

  const selectedBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === selectedBook),
    [selectedBook],
  );
  const booksForTestament = useMemo(
    () =>
      selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS,
    [selectedTestament],
  );
  const chapterOptions = useMemo(
    () =>
      Array.from(
        { length: selectedBookMeta?.chapters ?? 0 },
        (_, idx) => idx + 1,
      ),
    [selectedBookMeta],
  );

  useEffect(() => {
    if (selectedBook && selectedBookMeta?.testament !== selectedTestament) {
      setSelectedBook('');
    }
  }, [selectedBook, selectedBookMeta, selectedTestament]);

  useEffect(() => {
    const normalized = normalizeSelectedChapters(
      selectedChapters,
      selectedBookMeta?.chapters ?? 0,
    );
    if (
      normalized.length !== selectedChapters.length ||
      normalized.some((chapter, index) => chapter !== selectedChapters[index])
    ) {
      setSelectedChapters(normalized);
    }
  }, [selectedBookMeta, selectedChapters]);

  const hydrateDayForm = useCallback(
    (isoDate: string) => {
      const log = devotionLogsByDate[isoDate];
      if (log) {
        const nextBook = log.reading_book || '';
        const nextMeta = BIBLE_BOOKS.find(book => book.bookName === nextBook);
        setSelectedCompleted(log.completed);
        setSelectedTestament(nextMeta?.testament ?? 'old');
        setSelectedBook(nextBook);
        setSelectedChapters(
          nextMeta && Array.isArray(log.selected_chapters)
            ? normalizeSelectedChapters(
                log.selected_chapters.map(Number),
                nextMeta.chapters,
              )
            : nextMeta
            ? chaptersFromLegacy(
                log.reading_chapter,
                log.chapters_read,
                nextMeta.chapters,
              )
            : [],
        );
        return;
      }

      setSelectedCompleted(true);
      setSelectedTestament('old');
      setSelectedBook('');
      setSelectedChapters([]);
    },
    [devotionLogsByDate],
  );

  const handlePickDay = (isoDate: string) => {
    if (isoDate > todayIso) {
      setAlertConfig({
        visible: true,
        title: strings.futureDateTitle,
        message: strings.futureDateMessage,
        type: 'warning',
      });
      return;
    }

    setSelectedDate(isoDate);
    hydrateDayForm(isoDate);
    setEditorVisible(true);
  };

  const handleChangeTestament = (value: Testament) => {
    setSelectedTestament(value);
    setSelectedBook('');
    setSelectedChapters([]);
  };

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        return;
      }

      const normalizedChapters = normalizeSelectedChapters(
        selectedChapters,
        selectedBookMeta?.chapters ?? 0,
      );

      if (
        selectedCompleted &&
        (!selectedBook || normalizedChapters.length === 0)
      ) {
        setAlertConfig({
          visible: true,
          title: strings.readingSelectionRequiredTitle,
          message: strings.readingSelectionRequiredMessage,
          type: 'warning',
        });
        return;
      }

      const payload = {
        completed: selectedCompleted,
        reading_book: selectedCompleted ? selectedBook : null,
        reading_chapter: selectedCompleted
          ? firstSelectedChapter(normalizedChapters)
          : null,
        chapters_read: selectedCompleted
          ? normalizedChapters.length || null
          : null,
        selected_chapters: selectedCompleted ? normalizedChapters : null,
      };

      const result = await saveDevotionLog({
        userId,
        date: selectedDate,
        payload,
      });

      if (selectedDate === todayIso) {
        await syncDevotionReminderSchedule(userId, { startTomorrow: true });
      }

      setDevotionLogsByDate(result.data);
      setAlertConfig({
        visible: true,
        title: strings.saveSuccessTitle,
        message: result.offline
          ? strings.savedOfflineMessage
          : strings.saveSuccessMessage,
        type: 'success',
      });
      setEditorVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets?.top ?? 0}
        title={strings.title}
        leading={
          <AppHeaderAction
            icon="arrow-right"
            onPress={() => navigation.goBack()}
            size={24}
          />
        }
      />

      {loading && Object.keys(devotionLogsByDate).length === 0 ? (
        <View style={[styles.loadingWrap, { backgroundColor: '#F8F9FB' }]}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <DevotionCalendarSummary
            strings={strings}
            currentStreak={currentStreak}
            monthCompletedCount={monthCompletedCount}
            totalCompleted={totalCompleted}
          />

          <DevotionCalendarGrid
            strings={strings}
            visibleMonth={visibleMonth}
            monthCells={monthCells}
            selectedDate={selectedDate}
            onNextMonth={() =>
              setVisibleMonth(
                current =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            onPrevMonth={() =>
              setVisibleMonth(
                current =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            onPickDay={handlePickDay}
          />
        </ScrollView>
      )}

      <DevotionDayEditor
        strings={strings}
        visible={editorVisible}
        selectedDate={selectedDate}
        selectedCompleted={selectedCompleted}
        selectedBook={selectedBook}
        selectedChapters={selectedChapters}
        selectedTestament={selectedTestament}
        saving={saving}
        books={booksForTestament}
        chapterOptions={chapterOptions}
        testamentOptions={testamentOptions}
        canSaveReading={!!selectedBook && selectedChapters.length > 0}
        onClose={() => setEditorVisible(false)}
        onSetCompleted={setSelectedCompleted}
        onSetTestament={handleChangeTestament}
        onSetBook={setSelectedBook}
        onToggleChapter={chapter =>
          setSelectedChapters(current =>
            toggleChapterSelection(
              current,
              chapter,
              selectedBookMeta?.chapters ?? 0,
            ),
          )
        }
        onSave={handleSaveDay}
      />

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default DevotionCalendarScreen;
