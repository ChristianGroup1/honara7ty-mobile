import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
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
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import { BG, NAVY, NO_MESSAGE, YES_MESSAGE } from './constants';
import DailyQuestionCard from './DailyQuestionCard';
import FeatureCard from './FeatureCard';
import FocusModeBanner from '../shared/FocusModeBanner';
import HomeHeader from './HomeHeader';
import HomeAnswerSheet from './HomeAnswerSheet';
import QuickActionsGrid from './QuickActionsGrid';
import { homeStyles as styles } from './styles';
import { getDisplayName, getInitials, getTodayDate } from './utils';
import { getStrings } from '../../localization';
import {
  getNotificationPermissionState,
  openAppNotificationSettings,
  requestNotificationPermission,
} from '../../lib/notifications';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../data/bibleMetadata';
import {
  firstSelectedChapter,
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import NotificationPermissionCard from '../shared/NotificationPermissionCard';
import { ensureDefaultDevotionTime } from '../../lib/ensureDefaultDevotionTime';
import { syncDevotionReminderSchedule } from '../../lib/devotionReminder';

import { logoutCurrentUser } from '../../lib/logout';
import { hasSeenNotificationPermissionPrompt } from '../../lib/notificationPermissionFlow';
import {
  migrateContentEncryption,
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
import { refreshAndPersistProfileXp } from '../../lib/xp';
import { buildReadingPlanSuggestions } from '../../lib/readingPlanSuggestions';
import {
  getActiveReadingPlan,
  resolveTodayPlanEntries,
} from '../../lib/activeReadingPlan';

const HomeScreen = ({ route, navigation }: any) => {
  const strings = getStrings().home;
  const insets = useSafeAreaInsets();
  const userFromParams = route?.params?.user;
  const hasLoadedRef = useRef(Boolean(userFromParams));
  const sessionUserRef = useRef<any>(userFromParams || null);
  const migratedUserIdsRef = useRef(new Set<string>());
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);
  /** null = not yet answered today, true = answered yes, false = answered no */
  const [devotionAnswer, setDevotionAnswer] = useState<boolean | null>(null);
  const [answerSheetVisible, setAnswerSheetVisible] = useState(false);
  const [pendingCompleted, setPendingCompleted] = useState(true);
  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');
  const [readingBook, setReadingBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [readingEntries, setReadingEntries] = useState<ReadingEntry[]>([]);
  const [todayPlanEntries, setTodayPlanEntries] = useState<ReadingEntry[]>([]);
  const [todayPlanDay, setTodayPlanDay] = useState(0);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<'allowed' | 'denied' | 'not_determined'>('not_determined');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
    dismissOnBackdrop?: boolean;
  }>({ visible: false, title: '' });

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type: 'error' | 'warning' | 'success' | 'info' = 'info',
      dismissOnBackdrop = false,
    ) =>
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons,
        type,
        dismissOnBackdrop,
      }),
    [],
  );

  const hideAlert = useCallback(
    () => setAlertConfig(prev => ({ ...prev, visible: false })),
    [],
  );

  const clearDevotionState = useCallback(() => {
    setDevotionAnswer(null);
    setReadingBook('');
    setSelectedChapters([]);
    setReadingEntries([]);
    setSelectedTestament('old');
    setTodayPlanEntries([]);
    setTodayPlanDay(0);
  }, []);

  const resolveTodayPlan = useCallback(
    async (userId: string, logs: Record<string, any>) => {
      const plan = await getActiveReadingPlan(userId);
      if (!plan) {
        setTodayPlanEntries([]);
        setTodayPlanDay(0);
        return;
      }
      const suggestions = buildReadingPlanSuggestions(
        getStrings().dailyNotifications.readingPlanSuggestions,
        logs,
      );
      const today = resolveTodayPlanEntries({
        plan,
        suggestions,
        devotionLogs: logs,
      });
      setTodayPlanEntries(today?.entries ?? []);
      setTodayPlanDay(today?.dayNumber ?? 0);
    },
    [],
  );

  const refreshNotificationPermission = useCallback(async () => {
    try {
      const nextState = await getNotificationPermissionState();
      setNotificationPermissionState(nextState);
    } catch {
      setNotificationPermissionState('not_determined');
    }
  }, []);

  const applyTodayDevotionLog = useCallback((data: any) => {
    setDevotionAnswer(data ? (data.completed as boolean) : null);
    if (data?.reading_book || data?.reading_entries) {
      const nextEntries = Array.isArray(data.reading_entries)
        ? data.reading_entries
        : readingEntriesFromLegacy({
            readingBook: data.reading_book,
            readingChapter: (data as any).reading_chapter,
            chaptersRead: (data as any).chapters_read,
            selectedChapters: (data as any).selected_chapters,
          });
      setReadingEntries(nextEntries);
      const firstEntry = nextEntries[0];
      setReadingBook(firstEntry?.reading_book ?? data.reading_book ?? '');
      const matchedBook = BIBLE_BOOKS.find(
        book => book.bookName === firstEntry?.reading_book,
      );
      if (matchedBook) {
        setSelectedTestament(matchedBook.testament);
        setSelectedChapters(firstEntry?.selected_chapters ?? []);
      }
      return;
    }

    setReadingEntries([]);
  }, []);

  /* ── Check today's devotion answer whenever screen is focused ── */
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkDevotion = async () => {
        if (!hasLoadedRef.current && !userFromParams) {
          setLoading(true);
        }

        try {
          let sessionUser = sessionUserRef.current;
          if (!sessionUser) {
            const { data: sessionData } = await supabase.auth.getSession();
            sessionUser = sessionData?.session?.user;
          }
          const userId = sessionUser?.id;

          if (!isActive) {
            return;
          }

          if (!userId) {
            setUser(null);
            clearDevotionState();
            return;
          }

          sessionUserRef.current = sessionUser;
          setUser(sessionUser);

          // One-time silent migration: encrypt any legacy plaintext content.
          if (!migratedUserIdsRef.current.has(userId)) {
            migratedUserIdsRef.current.add(userId);
            migrateContentEncryption(userId).catch(err => {
              if (__DEV__) {
                console.warn('[encryption] migration error:', err);
              }
            });
          }

          const cachedDevotionLogs = await readCachedDevotionLogs(userId);
          if (isActive) {
            applyTodayDevotionLog(cachedDevotionLogs[getTodayDate()]);
            hasLoadedRef.current = true;
            setLoading(false);
            resolveTodayPlan(userId, cachedDevotionLogs).catch(() => undefined);
          }

          const { data: devotionLogs } = await refreshDevotionLogs(userId);

          if (!isActive) {
            return;
          }

          applyTodayDevotionLog(devotionLogs[getTodayDate()]);
          resolveTodayPlan(userId, devotionLogs).catch(() => undefined);
        } finally {
          if (isActive) {
            hasLoadedRef.current = true;
            setLoading(false);
          }
        }
      };

      checkDevotion();
      refreshNotificationPermission();

      return () => {
        isActive = false;
      };
    }, [
      applyTodayDevotionLog,
      clearDevotionState,
      refreshNotificationPermission,
      resolveTodayPlan,
      userFromParams,
    ]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshNotificationPermission();
      }
    });

    return () => subscription.remove();
  }, [refreshNotificationPermission]);

  const selectedBook = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === readingBook),
    [readingBook],
  );
  const selectedTestamentBooks = useMemo(
    () =>
      selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS,
    [selectedTestament],
  );
  const chapterOptions = useMemo(
    () =>
      Array.from({ length: selectedBook?.chapters ?? 0 }, (_, idx) => idx + 1),
    [selectedBook],
  );

  const handleNotificationPermissionAction = async () => {
    setPermissionLoading(true);
    try {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
        sessionUserRef.current = sessionUser;
      }
      const userId = sessionUser?.id;
      const seenPrompt = await hasSeenNotificationPermissionPrompt(userId);

      if (notificationPermissionState === 'denied' && seenPrompt) {
        await openAppNotificationSettings();
        return;
      }

      const allowed = await requestNotificationPermission();
      if (!allowed) {
        return;
      }

      await ensureDefaultDevotionTime(userId, {
        scheduleReminder: true,
      });
    } finally {
      setPermissionLoading(false);
      await refreshNotificationPermission();
    }
  };

  /* ── Save devotion answer + show smart response ── */
  const handleDevotionAnswer = useCallback(
    async (completed: boolean) => {
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
        selectedBook?.chapters ?? 0,
      );
      const nextReadingEntries = completed
        ? mergeReadingDraft(readingEntries, readingBook, normalizedChapters)
        : [];
      const firstEntry = nextReadingEntries[0];

      if (completed && nextReadingEntries.length === 0) {
        showAlert(
          strings.readingSelectionRequiredTitle,
          strings.readingSelectionRequiredMessage,
          undefined,
          'warning',
        );
        return;
      }

      const payload = {
        completed,
        reading_book: completed ? firstEntry?.reading_book ?? null : null,
        reading_chapter: completed
          ? firstSelectedChapter(firstEntry?.selected_chapters ?? [])
          : null,
        chapters_read: completed
          ? firstEntry?.selected_chapters.length || null
          : null,
        selected_chapters: completed
          ? firstEntry?.selected_chapters ?? null
          : null,
        reading_entries: completed ? nextReadingEntries : null,
      };

      const { offline } = await saveDevotionLog({
        userId,
        date: getTodayDate(),
        payload,
      });

      await syncDevotionReminderSchedule(userId, { startTomorrow: true });

      refreshAndPersistProfileXp(userId).catch(() => undefined);

      setDevotionAnswer(completed);
      if (completed) {
        showAlert(
          strings.correctStreakTitle,
          offline ? strings.savedOfflineMessage : YES_MESSAGE,
          undefined,
          'success',
        );
      } else {
        showAlert(
          strings.startNowTitle,
          offline ? strings.savedOfflineMessage : NO_MESSAGE,
          [{ text: strings.later, style: 'cancel' }],
          'info',
          true,
        );
      }
    },
    [
      readingBook,
      readingEntries,
      selectedBook,
      selectedChapters,
      showAlert,
      strings,
    ],
  );

  /* ── Logout ── */
  const handleLogout = () => {
    showAlert(
      strings.logoutTitle,
      strings.logoutMessage,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              clearDevotionState();
              sessionUserRef.current = null;
              setUser(null);
              await logoutCurrentUser();
              const parentNavigation = navigation.getParent?.();
              if (parentNavigation) {
                parentNavigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              } else {
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              }
            } catch (err: any) {
              showAlert('خطأ', err.message, undefined, 'error');
            }
          },
        },
      ],
      'warning',
    );
  };

  /* ── Show question dialog ── */
  const handleAnswerNow = useCallback(() => {
    setPendingCompleted(devotionAnswer ?? true);
    const matchedBook = BIBLE_BOOKS.find(book => book.bookName === readingBook);
    if (matchedBook) {
      setSelectedTestament(matchedBook.testament);
    }
    setAnswerSheetVisible(true);
  }, [devotionAnswer, readingBook]);

  const closeAnswerSheet = useCallback(() => {
    setAnswerSheetVisible(false);
  }, []);

  const navigatePrayerNotes = useCallback(() => {
    navigation.navigate('PrayerNotes');
  }, [navigation]);

  const navigateSpiritualReflection = useCallback(() => {
    navigation.navigate('SpiritualReflection');
  }, [navigation]);

  const navigateWeeklyReport = useCallback(() => {
    navigation.navigate('WeeklyReport');
  }, [navigation]);

  useEffect(() => {
    const normalized = normalizeSelectedChapters(
      selectedChapters,
      selectedBook?.chapters ?? 0,
    );
    if (
      normalized.length !== selectedChapters.length ||
      normalized.some((chapter, index) => chapter !== selectedChapters[index])
    ) {
      setSelectedChapters(normalized);
    }
  }, [selectedBook, selectedChapters]);

  const canSaveReading =
    !pendingCompleted ||
    readingEntries.length > 0 ||
    (!!readingBook && selectedChapters.length > 0);

  const saveDevotionSheet = useCallback(async () => {
    setAnswerSheetVisible(false);
    await handleDevotionAnswer(pendingCompleted);
  }, [handleDevotionAnswer, pendingCompleted]);

  const handleSetAnswerSheetTestament = useCallback((value: Testament) => {
    setSelectedTestament(value);
    setReadingBook('');
    setSelectedChapters([]);
  }, []);

  const handleToggleAnswerSheetChapter = useCallback(
    (chapter: number) =>
      setSelectedChapters(current =>
        toggleChapterSelection(current, chapter, selectedBook?.chapters ?? 0),
      ),
    [selectedBook],
  );

  const todayPlanLabel = useMemo(
    () => formatReadingEntries(todayPlanEntries),
    [todayPlanEntries],
  );

  const todayPlanApplied = useMemo(
    () =>
      todayPlanEntries.length > 0 &&
      formatReadingEntries(readingEntries) === todayPlanLabel,
    [readingEntries, todayPlanEntries, todayPlanLabel],
  );

  const handleApplyTodayPlan = useCallback(() => {
    if (todayPlanEntries.length === 0) {
      return;
    }
    setReadingEntries(todayPlanEntries);
    setReadingBook('');
    setSelectedChapters([]);
  }, [todayPlanEntries]);

  const handleAddAnswerSheetReading = useCallback(() => {
    const normalizedChapters = normalizeSelectedChapters(
      selectedChapters,
      selectedBook?.chapters ?? 0,
    );
    if (!readingBook || normalizedChapters.length === 0) {
      return;
    }
    setReadingEntries(current =>
      mergeReadingDraft(current, readingBook, normalizedChapters),
    );
    setReadingBook('');
    setSelectedChapters([]);
  }, [readingBook, selectedBook, selectedChapters]);

  const handleRemoveAnswerSheetReading = useCallback(
    (index: number) => {
      setReadingEntries(current => {
        const removed = current[index];
        if (removed?.reading_book === readingBook) {
          setReadingBook('');
          setSelectedChapters([]);
        }
        return current.filter((_, itemIndex) => itemIndex !== index);
      });
    },
    [readingBook],
  );

  if (loading && !user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={NAVY}
        translucent={false}
      />
      <HomeHeader
        topInsetHeight={insets.top}
        displayName={displayName}
        initials={initials}
        onLogout={handleLogout}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FocusModeBanner />
        <DailyQuestionCard
          devotionAnswer={devotionAnswer}
          onAnswerNow={handleAnswerNow}
          onEditAnswer={handleAnswerNow}
        />
        {notificationPermissionState !== 'allowed' && (
          <NotificationPermissionCard
            title={strings.permissionNoticeTitle}
            body={strings.permissionNoticeBody}
            actionLabel={
              notificationPermissionState === 'denied'
                ? strings.permissionOpenSettings
                : strings.permissionEnable
            }
            onPress={handleNotificationPermissionAction}
            compact
            loading={permissionLoading}
          />
        )}
        <QuickActionsGrid navigation={navigation} />
        <FeatureCard
          title={strings.featurePrayerNotesTitle}
          subtitle={strings.featurePrayerNotesSubtitle}
          icon="hands-pray"
          onPress={navigatePrayerNotes}
        />
        <FeatureCard
          title={strings.featureReflectionTitle}
          subtitle={strings.featureReflectionSubtitle}
          icon="notebook-outline"
          onPress={navigateSpiritualReflection}
        />
        <FeatureCard
          title={strings.featureWeeklyReportTitle}
          subtitle={strings.featureWeeklyReportSubtitle}
          icon="chart-box-outline"
          onPress={navigateWeeklyReport}
        />
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
      <HomeAnswerSheet
        visible={answerSheetVisible}
        strings={strings}
        pendingCompleted={pendingCompleted}
        selectedTestament={selectedTestament}
        books={selectedTestamentBooks}
        readingBook={readingBook}
        chapterOptions={chapterOptions}
        selectedChapters={selectedChapters}
        readingEntries={readingEntries}
        canSaveReading={canSaveReading}
        planLabel={todayPlanLabel}
        planDayNumber={todayPlanDay}
        planApplied={todayPlanApplied}
        onApplyPlan={handleApplyTodayPlan}
        onClose={closeAnswerSheet}
        onSetPendingCompleted={setPendingCompleted}
        onSetSelectedTestament={handleSetAnswerSheetTestament}
        onSetReadingBook={setReadingBook}
        onToggleChapter={handleToggleAnswerSheetChapter}
        onAddReadingEntry={handleAddAnswerSheetReading}
        onRemoveReadingEntry={handleRemoveAnswerSheetReading}
        onSave={saveDevotionSheet}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
