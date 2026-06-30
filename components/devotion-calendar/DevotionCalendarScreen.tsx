import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
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
import DevotionCalendarSelectedDayCard from './DevotionCalendarSelectedDayCard';
import DevotionDayEditor from './DevotionDayEditor';
import { createDevotionCalendarStyles } from './styles';
import { DevotionDayLog } from './types';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import { useNightMode } from '../../lib/nightMode';
import { buildMonthCells, getMonthKey, startOfMonth, toIsoDate } from './utils';
import {
  firstSelectedChapter,
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import { syncDevotionReminderSchedule } from '../../lib/devotionReminder';
import {
  readCachedDevotionLogs,
  refreshDevotionLogs,
  saveDevotionLog,
} from '../../lib/offlineSync';
import {
  formatReadingEntries,
  mergeReadingDraft,
  ReadingEntry,
  readingEntriesFromLegacy,
} from '../../lib/readingEntries';

const DevotionCalendarScreen = ({ navigation }: any) => {
  const strings = getStrings().devotionCalendar;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const styles = useMemo(() => createDevotionCalendarStyles(colors), [colors]);
  const hasLoadedCalendarRef = useRef(false);
  const sessionUserRef = useRef<any>(null);
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
  const [readingEntries, setReadingEntries] = useState<ReadingEntry[]>([]);
  const [devotionLogsByDate, setDevotionLogsByDate] = useState<
    Record<string, DevotionDayLog>
  >({});
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const loadDevotionDays = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
      }
      const userId = sessionUser?.id;
      if (!userId) {
        setDevotionLogsByDate({});
        return;
      }

      sessionUserRef.current = sessionUser;
      const cachedLogs = await readCachedDevotionLogs(userId);
      setDevotionLogsByDate(cachedLogs);
      setLoading(false);

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
  const missedDates = useMemo(
    () =>
      Object.entries(devotionLogsByDate)
        .filter(([, value]) => !value.completed)
        .map(([date]) => date),
    [devotionLogsByDate],
  );
  const missedSet = useMemo(() => new Set(missedDates), [missedDates]);
  const monthCells = useMemo(
    () => buildMonthCells(visibleMonth, completedSet, missedSet),
    [completedSet, missedSet, visibleMonth],
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
  const selectedLog = devotionLogsByDate[selectedDate];
  const canRecordSelectedDate = selectedDate <= todayIso;
  const selectedReadingText = selectedLog
    ? selectedLog.completed
      ? formatReadingEntries(
          selectedLog.reading_entries ??
            readingEntriesFromLegacy({
              readingBook: selectedLog.reading_book,
              readingChapter: selectedLog.reading_chapter,
              chaptersRead: selectedLog.chapters_read,
              selectedChapters: selectedLog.selected_chapters,
            }),
        ) || strings.noReadingDetails
      : strings.notCompletedDetail
    : strings.noRecordForDay;

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
        const nextEntries = Array.isArray(log.reading_entries)
          ? log.reading_entries
          : readingEntriesFromLegacy({
              readingBook: log.reading_book,
              readingChapter: log.reading_chapter,
              chaptersRead: log.chapters_read,
              selectedChapters: log.selected_chapters,
            });
        const firstEntry = nextEntries[0];
        const nextBook = firstEntry?.reading_book || log.reading_book || '';
        const nextMeta = BIBLE_BOOKS.find(book => book.bookName === nextBook);
        setSelectedCompleted(log.completed);
        setSelectedTestament(nextMeta?.testament ?? 'old');
        setSelectedBook(nextBook);
        setSelectedChapters(firstEntry?.selected_chapters ?? []);
        setReadingEntries(nextEntries);
        return;
      }

      setSelectedCompleted(true);
      setSelectedTestament('old');
      setSelectedBook('');
      setSelectedChapters([]);
      setReadingEntries([]);
    },
    [devotionLogsByDate],
  );

  const handlePickDay = (isoDate: string) => {
    setSelectedDate(isoDate);
  };

  const openSelectedDayEditor = () => {
    if (selectedDate > todayIso) {
      return;
    }
    hydrateDayForm(selectedDate);
    setEditorVisible(true);
  };

  const handleChangeTestament = (value: Testament) => {
    setSelectedTestament(value);
    setSelectedBook('');
    setSelectedChapters([]);
  };

  const handleAddReadingEntry = () => {
    const normalizedChapters = normalizeSelectedChapters(
      selectedChapters,
      selectedBookMeta?.chapters ?? 0,
    );
    if (!selectedBook || normalizedChapters.length === 0) {
      return;
    }
    setReadingEntries(current =>
      mergeReadingDraft(current, selectedBook, normalizedChapters),
    );
    setSelectedBook('');
    setSelectedChapters([]);
  };

  const handleRemoveReadingEntry = (index: number) => {
    setReadingEntries(current => {
      const removed = current[index];
      if (removed?.reading_book === selectedBook) {
        setSelectedBook('');
        setSelectedChapters([]);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
        sessionUserRef.current = sessionUser;
      }
      const userId = sessionUser?.id;
      if (!userId) {
        return;
      }

      const normalizedChapters = normalizeSelectedChapters(
        selectedChapters,
        selectedBookMeta?.chapters ?? 0,
      );
      const nextReadingEntries = selectedCompleted
        ? mergeReadingDraft(readingEntries, selectedBook, normalizedChapters)
        : [];
      const firstEntry = nextReadingEntries[0];

      if (selectedCompleted && nextReadingEntries.length === 0) {
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
        reading_book: selectedCompleted
          ? firstEntry?.reading_book ?? null
          : null,
        reading_chapter: selectedCompleted
          ? firstSelectedChapter(firstEntry?.selected_chapters ?? [])
          : null,
        chapters_read: selectedCompleted
          ? firstEntry?.selected_chapters.length || null
          : null,
        selected_chapters: selectedCompleted
          ? firstEntry?.selected_chapters ?? null
          : null,
        reading_entries: selectedCompleted ? nextReadingEntries : null,
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
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
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
        <View style={[styles.loadingWrap, styles.loadingWrapMuted]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <DevotionCalendarSummary
            styles={styles}
            colors={colors}
            strings={strings}
            currentStreak={currentStreak}
            monthCompletedCount={monthCompletedCount}
            totalCompleted={totalCompleted}
          />

          <DevotionCalendarGrid
            styles={styles}
            colors={colors}
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

          <DevotionCalendarSelectedDayCard
            styles={styles}
            strings={strings}
            selectedDateLabel={selectedDate}
            readingText={selectedReadingText}
            completed={selectedLog?.completed ?? null}
            canRecordSelectedDate={canRecordSelectedDate}
            saving={saving}
            onRecord={openSelectedDayEditor}
          />
        </ScrollView>
      )}

      <DevotionDayEditor
        styles={styles}
        strings={strings}
        visible={editorVisible}
        selectedDate={selectedDate}
        selectedCompleted={selectedCompleted}
        selectedBook={selectedBook}
        selectedChapters={selectedChapters}
        readingEntries={readingEntries}
        selectedTestament={selectedTestament}
        saving={saving}
        books={booksForTestament}
        chapterOptions={chapterOptions}
        canSaveReading={
          readingEntries.length > 0 ||
          (!!selectedBook && selectedChapters.length > 0)
        }
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
        onAddReadingEntry={handleAddReadingEntry}
        onRemoveReadingEntry={handleRemoveReadingEntry}
        onSave={handleSaveDay}
      />

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default DevotionCalendarScreen;
