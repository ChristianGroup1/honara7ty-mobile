import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
import {
  buildMonthCells,
  getMonthKey,
  startOfMonth,
  toIsoDate,
} from './utils';

const DevotionCalendarScreen = ({ navigation }: any) => {
  const strings = getStrings().devotionCalendar;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(toIsoDate(new Date()));
  const [selectedCompleted, setSelectedCompleted] = useState(true);
  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[0].bookName);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedChaptersRead, setSelectedChaptersRead] = useState(1);
  const [devotionLogsByDate, setDevotionLogsByDate] = useState<Record<string, DevotionDayLog>>({});
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const testamentOptions: TestamentOption[] = useMemo(
    () => [
      { key: 'old', label: strings.oldTestament, icon: 'book-open-page-variant-outline' },
      { key: 'new', label: strings.newTestament, icon: 'cross' },
    ],
    [strings.newTestament, strings.oldTestament],
  );

  const loadDevotionDays = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setDevotionLogsByDate({});
        return;
      }

      const { data, error } = await supabase
        .from('devotion_log')
        .select('date, completed, reading_book, reading_chapter, chapters_read')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        setAlertConfig({
          visible: true,
          title: strings.errorTitle,
          message: error.message,
          type: 'error',
        });
        return;
      }

      const logsMap: Record<string, DevotionDayLog> = {};
      (data ?? []).forEach(item => {
        logsMap[item.date as string] = {
          completed: Boolean(item.completed),
          reading_book: (item as any).reading_book,
          reading_chapter: (item as any).reading_chapter,
          chapters_read: (item as any).chapters_read,
        };
      });
      setDevotionLogsByDate(logsMap);
    } finally {
      setLoading(false);
    }
  }, [strings.errorTitle]);

  useFocusEffect(
    useCallback(() => {
      loadDevotionDays();
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
  const currentStreak = useMemo(() => computeStreak(completedDates), [completedDates]);
  const monthCompletedCount = useMemo(() => {
    const prefix = getMonthKey(visibleMonth);
    return completedDates.filter(date => date.startsWith(prefix)).length;
  }, [completedDates, visibleMonth]);
  const totalCompleted = completedDates.length;
  const todayIso = toIsoDate(new Date());

  const selectedBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === selectedBook) ?? BIBLE_BOOKS[0],
    [selectedBook],
  );
  const booksForTestament = useMemo(
    () => (selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS),
    [selectedTestament],
  );
  const chapterOptions = useMemo(
    () => Array.from({ length: selectedBookMeta.chapters }, (_, idx) => idx + 1),
    [selectedBookMeta.chapters],
  );

  useEffect(() => {
    if (selectedBookMeta.testament !== selectedTestament) {
      setSelectedBook(booksForTestament[0]?.bookName ?? BIBLE_BOOKS[0].bookName);
    }
  }, [booksForTestament, selectedBookMeta.testament, selectedTestament]);

  useEffect(() => {
    if (selectedChapter > selectedBookMeta.chapters) {
      setSelectedChapter(selectedBookMeta.chapters);
    }
    if (selectedChaptersRead > selectedBookMeta.chapters) {
      setSelectedChaptersRead(selectedBookMeta.chapters);
    }
  }, [selectedChapter, selectedChaptersRead, selectedBookMeta.chapters]);

  const hydrateDayForm = useCallback(
    (isoDate: string) => {
      const log = devotionLogsByDate[isoDate];
      if (log) {
        const nextBook = log.reading_book || BIBLE_BOOKS[0].bookName;
        const nextMeta =
          BIBLE_BOOKS.find(book => book.bookName === nextBook) ?? BIBLE_BOOKS[0];
        setSelectedCompleted(log.completed);
        setSelectedTestament(nextMeta.testament);
        setSelectedBook(nextBook);
        setSelectedChapter(Math.max(1, Number(log.reading_chapter ?? 1)));
        setSelectedChaptersRead(Math.max(1, Number(log.chapters_read ?? 1)));
        return;
      }

      setSelectedCompleted(true);
      setSelectedTestament('old');
      setSelectedBook(OLD_TESTAMENT_BOOKS[0]?.bookName ?? BIBLE_BOOKS[0].bookName);
      setSelectedChapter(1);
      setSelectedChaptersRead(1);
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
    const firstBook =
      value === 'old' ? OLD_TESTAMENT_BOOKS[0]?.bookName : NEW_TESTAMENT_BOOKS[0]?.bookName;
    if (firstBook) {
      setSelectedBook(firstBook);
      setSelectedChapter(1);
      setSelectedChaptersRead(1);
    }
  };

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        return;
      }

      const payload = {
        user_id: userId,
        date: selectedDate,
        completed: selectedCompleted,
        reading_book: selectedCompleted ? selectedBook : null,
        reading_chapter: selectedCompleted ? selectedChapter : null,
        chapters_read: selectedCompleted ? selectedChaptersRead : null,
      };

      const { error } = await supabase
        .from('devotion_log')
        .upsert(payload, { onConflict: 'user_id,date' });

      if (error) {
        setAlertConfig({
          visible: true,
          title: strings.errorTitle,
          message: error.message,
          type: 'error',
        });
        return;
      }

      setAlertConfig({
        visible: true,
        title: strings.saveSuccessTitle,
        message: strings.saveSuccessMessage,
        type: 'success',
      });
      await loadDevotionDays();
      setEditorVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={[styles.topInset, { height: insets.top }]} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{strings.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
            onPrevMonth={() =>
              setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))
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
        selectedChapter={selectedChapter}
        selectedChaptersRead={selectedChaptersRead}
        selectedTestament={selectedTestament}
        saving={saving}
        books={booksForTestament}
        chapterOptions={chapterOptions}
        testamentOptions={testamentOptions}
        onClose={() => setEditorVisible(false)}
        onSetCompleted={setSelectedCompleted}
        onSetTestament={handleChangeTestament}
        onSetBook={setSelectedBook}
        onSetChapter={setSelectedChapter}
        onSetChaptersRead={setSelectedChaptersRead}
        onSave={handleSaveDay}
      />

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default DevotionCalendarScreen;
