import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import CustomAlert, { AlertConfig } from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import HomeAnswerSheet from '../home/HomeAnswerSheet';
import DevotionCalendarGrid from '../devotion-calendar/DevotionCalendarGrid';
import DevotionCalendarSelectedDayCard from '../devotion-calendar/DevotionCalendarSelectedDayCard';
import { createDevotionCalendarStyles } from '../devotion-calendar/styles';
import { AppTheme, useNightMode } from '../../lib/nightMode';
import {
  DevotionGroupMember,
  fetchGroupMemberDevotionHistory,
  GroupMemberDevotionHistoryItem,
} from '../../lib/devotionGroups';
import {
  mergeReadingDraft,
  ReadingEntry,
  formatReadingEntries,
  readingEntriesFromLegacy,
} from '../../lib/readingEntries';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../data/bibleMetadata';
import {
  buildMonthCells,
  startOfMonth,
  toIsoDate,
} from '../devotion-calendar/utils';
import {
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import { saveDevotionLog } from '../../lib/offlineSync';
import { syncDevotionReminderSchedule } from '../../lib/devotionReminder';

import { BG, GOLD, NAVY } from '../shared/designTokens';

const formatDate = (date: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
};

const formatTime = (createdAt: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(createdAt));
  } catch {
    return createdAt;
  }
};

const formatReading = (log: GroupMemberDevotionHistoryItem) => {
  const strings = getStrings().devotionGroups;

  if (!log.completed) {
    return strings.notCompleted;
  }

  const entriesText = formatReadingEntries(
    log.reading_entries ??
      readingEntriesFromLegacy({
        readingBook: log.reading_book,
        readingChapter: log.reading_chapter,
        chaptersRead: log.chapters_read,
        selectedChapters: log.selected_chapters,
      }),
  );

  if (entriesText) {
    return entriesText;
  }

  if (!log.reading_book) {
    return strings.noReadingDetails;
  }

  const chapters = Array.isArray(log.selected_chapters)
    ? log.selected_chapters.join(', ')
    : log.reading_chapter;

  return chapters ? `${log.reading_book} ${chapters}` : log.reading_book;
};

const roleLabels = (role: DevotionGroupMember['role']) => {
  const strings = getStrings().devotionGroups;
  if (role === 'owner') {
    return strings.owner;
  }
  if (role === 'leader') {
    return strings.leader;
  }
  return strings.member;
};

const DevotionGroupMemberDetailsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().devotionGroups;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const calendarStyles = useMemo(
    () => createDevotionCalendarStyles(colors),
    [colors],
  );
  const themedStyles = useMemo(() => createThemedStyles(colors), [colors]);
  const { groupId, userId, displayName } = route?.params ?? {};
  const homeStrings = getStrings().home;
  const [member, setMember] = useState<DevotionGroupMember | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<GroupMemberDevotionHistoryItem[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answerSheetVisible, setAnswerSheetVisible] = useState(false);
  const [pendingCompleted, setPendingCompleted] = useState(true);
  const [answerTestament, setAnswerTestament] = useState<Testament>('old');
  const [answerBook, setAnswerBook] = useState('');
  const [answerChapters, setAnswerChapters] = useState<number[]>([]);
  const [answerReadingEntries, setAnswerReadingEntries] = useState<
    ReadingEntry[]
  >([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });
  const requestIdRef = useRef(0);
  const hasLoadedHistoryRef = useRef(false);

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const loadHistory = useCallback(
    async ({
      showLoader = false,
      showRefreshing = false,
    }: { showLoader?: boolean; showRefreshing?: boolean } = {}) => {
      if (!groupId || !userId) {
        navigation.goBack();
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      if (showLoader) {
        setLoading(true);
        setMember(null);
        setLogs([]);
        setSelectedDate(toIsoDate(new Date()));
        setVisibleMonth(startOfMonth(new Date()));
      }
      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setCurrentUserId(sessionData?.session?.user?.id ?? null);

        const { data, error } = await fetchGroupMemberDevotionHistory({
          groupId,
          userId,
        });

        if (error || !data) {
          throw error;
        }

        if (requestId !== requestIdRef.current) {
          return;
        }
        setMember(data.member);
        setLogs(data.logs);
        setSelectedDate(toIsoDate(new Date()));
        setVisibleMonth(startOfMonth(new Date()));
      } catch (error) {
        if (__DEV__) {
          console.warn(
            '[devotion-groups] failed to load member history',
            error,
          );
        }
        setAlertConfig({
          visible: true,
          title: strings.genericErrorTitle,
          message: strings.genericErrorMessage,
          type: 'error',
        });
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      groupId,
      navigation,
      strings.genericErrorMessage,
      strings.genericErrorTitle,
      userId,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedHistoryRef.current;
      hasLoadedHistoryRef.current = true;
      loadHistory({ showLoader: shouldShowLoader });
    }, [loadHistory]),
  );

  const completedCount = logs.filter(log => log.completed).length;
  const latestLog = logs[0] ?? null;
  const latestCompletedLog = logs.find(log => log.completed) ?? null;
  const title =
    member?.display_name ?? displayName ?? strings.memberDetailsTitle;
  const logsByDate = useMemo(
    () => new Map(logs.map(log => [log.date, log])),
    [logs],
  );
  const completedDates = useMemo(
    () => new Set(logs.filter(log => log.completed).map(log => log.date)),
    [logs],
  );
  const missedDates = useMemo(
    () => new Set(logs.filter(log => !log.completed).map(log => log.date)),
    [logs],
  );
  const monthCells = useMemo(
    () => buildMonthCells(visibleMonth, completedDates, missedDates),
    [completedDates, missedDates, visibleMonth],
  );
  const selectedLog = logsByDate.get(selectedDate);
  const calendarStrings = getStrings().devotionCalendar;
  const selectedReadingText = selectedLog
    ? selectedLog.completed
      ? formatReading(selectedLog)
      : calendarStrings.notCompletedDetail
    : calendarStrings.noRecordForDay;
  const canEditSelectedMember = Boolean(
    currentUserId && currentUserId === userId,
  );
  const canEditSelectedDate =
    canEditSelectedMember && selectedDate <= toIsoDate(new Date());
  const shouldShowCalendar = logs.length > 0 || canEditSelectedMember;
  const answerBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === answerBook),
    [answerBook],
  );
  const answerBooks = useMemo(
    () =>
      answerTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS,
    [answerTestament],
  );
  const answerChapterOptions = useMemo(
    () =>
      Array.from(
        { length: answerBookMeta?.chapters ?? 0 },
        (_, index) => index + 1,
      ),
    [answerBookMeta],
  );
  const canSaveAnswer =
    !pendingCompleted ||
    answerReadingEntries.length > 0 ||
    Boolean(answerBook && answerChapters.length > 0);

  const goToPrevMonth = () => {
    setVisibleMonth(
      current => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      current => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

  const openSelectedDayEditor = () => {
    if (!canEditSelectedMember || selectedDate > toIsoDate(new Date())) {
      return;
    }

    const entries = selectedLog
      ? selectedLog.reading_entries ??
        readingEntriesFromLegacy({
          readingBook: selectedLog.reading_book,
          readingChapter: selectedLog.reading_chapter,
          chaptersRead: selectedLog.chapters_read,
          selectedChapters: selectedLog.selected_chapters,
        })
      : [];
    const firstEntry = entries[0];
    const nextBookMeta = BIBLE_BOOKS.find(
      book => book.bookName === firstEntry?.reading_book,
    );

    setPendingCompleted(selectedLog ? Boolean(selectedLog.completed) : true);
    setAnswerReadingEntries(entries);
    setAnswerBook(firstEntry?.reading_book ?? '');
    setAnswerChapters(firstEntry?.selected_chapters ?? []);
    setAnswerTestament(nextBookMeta?.testament ?? 'old');
    setAnswerSheetVisible(true);
  };

  const handleSetAnswerTestament = (value: Testament) => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    if (answerBook && normalizedChapters.length > 0) {
      setAnswerReadingEntries(current =>
        mergeReadingDraft(current, answerBook, normalizedChapters),
      );
    }
    setAnswerTestament(value);
    setAnswerBook('');
    setAnswerChapters([]);
  };

  const handleSetAnswerBook = (nextBook: string) => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    if (answerBook && normalizedChapters.length > 0) {
      setAnswerReadingEntries(current =>
        mergeReadingDraft(current, answerBook, normalizedChapters),
      );
    }
    const existingEntry = answerReadingEntries.find(
      entry => entry.reading_book === nextBook,
    );
    setAnswerBook(nextBook);
    setAnswerChapters(existingEntry?.selected_chapters ?? []);
  };

  const handleAddAnswerReading = () => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    if (!answerBook || normalizedChapters.length === 0) {
      return;
    }
    setAnswerReadingEntries(current =>
      mergeReadingDraft(current, answerBook, normalizedChapters),
    );
    setAnswerBook('');
    setAnswerChapters([]);
  };

  const handleRemoveAnswerReading = (index: number) => {
    setAnswerReadingEntries(current => {
      const removed = current[index];
      if (removed?.reading_book === answerBook) {
        setAnswerBook('');
        setAnswerChapters([]);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSaveSelectedDay = async () => {
    if (!canEditSelectedMember || !currentUserId) {
      return;
    }

    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    const nextEntries = pendingCompleted
      ? mergeReadingDraft(answerReadingEntries, answerBook, normalizedChapters)
      : [];
    const firstEntry = pendingCompleted ? nextEntries[0] : null;

    setSaving(true);
    try {
      const { offline } = await saveDevotionLog({
        userId: currentUserId,
        date: selectedDate,
        payload: {
          completed: pendingCompleted,
          reading_book: firstEntry?.reading_book ?? null,
          reading_chapter: pendingCompleted
            ? firstEntry?.selected_chapters[0] ?? null
            : null,
          chapters_read: pendingCompleted
            ? firstEntry?.selected_chapters.length || null
            : null,
          selected_chapters: pendingCompleted
            ? firstEntry?.selected_chapters ?? null
            : null,
          reading_entries: pendingCompleted ? nextEntries : null,
        },
      });
      if (selectedDate === toIsoDate(new Date())) {
        await syncDevotionReminderSchedule(currentUserId, {
          startTomorrow: true,
        });
      }
      setAnswerSheetVisible(false);
      await loadHistory();
      setAlertConfig({
        visible: true,
        title: calendarStrings.saveSuccessTitle,
        message: offline
          ? calendarStrings.savedOfflineMessage
          : calendarStrings.saveSuccessMessage,
        type: 'success',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader
        topInsetHeight={insets.top}
        title={title}
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
        titleNumberOfLines={2}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHistory({ showRefreshing: true })}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {member ? (
          <View style={[styles.memberSummary, themedStyles.card]}>
            <View style={[styles.avatar, themedStyles.avatar]}>
              <Text style={[styles.avatarText, themedStyles.avatarText]}>
                {member.display_name.trim()[0] ?? 'م'}
              </Text>
            </View>
            <View style={styles.memberBody}>
              <Text style={[styles.memberName, themedStyles.primaryText]}>
                {member.display_name}
              </Text>
              <Text style={[styles.memberMeta, themedStyles.mutedText]}>
                {roleLabels(member.role)}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, themedStyles.card]}>
            <Text style={[styles.statNumber, themedStyles.primaryText]}>
              {logs.length}
            </Text>
            <Text style={[styles.statLabel, themedStyles.mutedText]}>
              {strings.recordedDays}
            </Text>
          </View>
          <View style={[styles.statCard, themedStyles.card]}>
            <Text style={[styles.statNumber, themedStyles.primaryText]}>
              {completedCount}
            </Text>
            <Text style={[styles.statLabel, themedStyles.mutedText]}>
              {strings.completedDays}
            </Text>
          </View>
        </View>

        {latestLog ? (
          <View style={[styles.latestCard, themedStyles.card]}>
            <View style={styles.latestHeader}>
              <View>
                <Text style={[styles.latestTitle, themedStyles.primaryText]}>
                  {strings.latestDevotionTitle}
                </Text>
                <Text style={[styles.latestDate, themedStyles.mutedText]}>
                  {formatDate(latestLog.date)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  latestLog.completed
                    ? styles.statusPillDone
                    : styles.statusPillPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    latestLog.completed
                      ? styles.statusPillTextDone
                      : styles.statusPillTextPending,
                  ]}
                >
                  {latestLog.completed
                    ? strings.completed
                    : strings.notCompleted}
                </Text>
              </View>
            </View>
            <Text style={[styles.latestMeta, themedStyles.mutedText]}>
              {strings.recordedAt} {formatTime(latestLog.created_at)}
            </Text>
            <View style={styles.readingRow}>
              <MaterialCommunityIcons
                name="book-open-page-variant-outline"
                size={18}
                color={colors.accent}
              />
              <Text style={[styles.readingText, themedStyles.secondaryText]}>
                {formatReading(latestLog)}
              </Text>
            </View>
            {latestCompletedLog &&
            latestCompletedLog.date !== latestLog.date ? (
              <Text style={[styles.latestMeta, themedStyles.mutedText]}>
                {strings.latestCompletedDevotionPrefix}{' '}
                {formatDate(latestCompletedLog.date)} -{' '}
                {formatTime(latestCompletedLog.created_at)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {loading && logs.length === 0 ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : shouldShowCalendar ? (
          <>
            <DevotionCalendarGrid
              styles={calendarStyles}
              colors={colors}
              strings={calendarStrings}
              visibleMonth={visibleMonth}
              monthCells={monthCells}
              selectedDate={selectedDate}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onPickDay={setSelectedDate}
            />

            <DevotionCalendarSelectedDayCard
              styles={calendarStyles}
              strings={calendarStrings}
              selectedDateLabel={selectedDate}
              readingText={selectedReadingText}
              completed={selectedLog?.completed ?? null}
              canRecordSelectedDate={canEditSelectedDate}
              saving={saving}
              onRecord={openSelectedDayEditor}
            />
          </>
        ) : (
          <Text style={[styles.emptyText, themedStyles.mutedText]}>
            {strings.emptyMemberHistory}
          </Text>
        )}
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        dismissOnBackdrop={alertConfig.dismissOnBackdrop}
        onDismiss={hideAlert}
      />
      <HomeAnswerSheet
        visible={answerSheetVisible}
        strings={homeStrings}
        pendingCompleted={pendingCompleted}
        selectedTestament={answerTestament}
        books={answerBooks}
        readingBook={answerBook}
        chapterOptions={answerChapterOptions}
        selectedChapters={answerChapters}
        readingEntries={answerReadingEntries}
        canSaveReading={canSaveAnswer}
        onClose={() => setAnswerSheetVisible(false)}
        onSetPendingCompleted={setPendingCompleted}
        onSetSelectedTestament={handleSetAnswerTestament}
        onSetReadingBook={handleSetAnswerBook}
        onToggleChapter={chapter =>
          setAnswerChapters(current =>
            toggleChapterSelection(
              current,
              chapter,
              answerBookMeta?.chapters ?? 0,
            ),
          )
        }
        onAddReadingEntry={handleAddAnswerReading}
        onRemoveReadingEntry={handleRemoveAnswerReading}
        onSave={handleSaveSelectedDay}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 36 },
  memberSummary: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: NAVY, fontSize: 20, fontWeight: '900' },
  memberBody: { flex: 1, marginHorizontal: 12 },
  memberName: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'left',
  },
  memberMeta: { color: '#7A818B', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: { color: NAVY, fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#7A818B', fontSize: 12, fontWeight: '700' },
  latestCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  latestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  latestTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'left',
  },
  latestDate: {
    color: '#7A818B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'left',
  },
  latestMeta: {
    color: '#7A818B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'left',
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'left',
  },
  sectionCaption: {
    color: '#7A818B',
    fontSize: 13,
    textAlign: 'left',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#F6F8FC',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  monthNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  monthTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendSwatchCompleted: {
    backgroundColor: 'rgba(120,161,189,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(18,30,52,0.48)',
  },
  legendSwatchPending: {
    backgroundColor: 'rgba(217,123,41,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,123,41,0.32)',
  },
  legendSwatchDefault: {
    backgroundColor: '#F6F8FB',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  legendText: {
    color: '#6F7782',
    fontSize: 12,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#8A9098',
    fontSize: 12,
    fontWeight: '800',
  },
  grid: { gap: 9 },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '13.2%',
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#FBFCFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
    paddingVertical: 8,
  },
  dayCellCompleted: {
    backgroundColor: '#FFF7E2',
    borderColor: 'rgba(18,30,52,0.42)',
  },
  dayCellPending: {
    backgroundColor: '#FFF4EA',
    borderColor: 'rgba(217,123,41,0.28)',
  },
  dayCellToday: {
    borderColor: 'rgba(10,17,36,0.3)',
    borderWidth: 1.5,
  },
  dayCellSelected: {
    borderColor: GOLD,
    borderWidth: 2,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  dayText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '900',
  },
  dayTextCompleted: { color: NAVY },
  dayTextPending: { color: '#B45B12' },
  dayMetaWrap: {
    minHeight: 12,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#78A1BD',
  },
  loadingBlock: { paddingVertical: 28, alignItems: 'center' },
  logCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  logDateBlock: { flex: 1 },
  logDate: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'left',
  },
  logTime: {
    color: '#7A818B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'left',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillDone: { backgroundColor: 'rgba(46,139,87,0.12)' },
  statusPillPending: { backgroundColor: 'rgba(217,123,41,0.12)' },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  statusPillTextDone: { color: '#2E8B57' },
  statusPillTextPending: { color: '#B45B12' },
  readingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readingText: {
    flex: 1,
    color: '#5F6874',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },
  emptyText: {
    color: '#7A818B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginVertical: 20,
  },
  editDayButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#78A1BD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
  },
  editDayButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
});

const createThemedStyles = (colors: AppTheme['colors']) => ({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  avatar: {
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.accent,
  },
  primaryText: {
    color: colors.text,
  },
  secondaryText: {
    color: colors.mutedText,
  },
  mutedText: {
    color: colors.mutedText,
  },
});

export default DevotionGroupMemberDetailsScreen;
