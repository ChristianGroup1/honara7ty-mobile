import React, { useCallback, useEffect, useState } from 'react';
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
import { NAVY, NO_MESSAGE, YES_MESSAGE } from './constants';
import DailyQuestionCard from './DailyQuestionCard';
import FeatureCard from './FeatureCard';
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
  chaptersFromLegacy,
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
  refreshDevotionLogs,
  saveDevotionLog,
} from '../../lib/offlineSync';

const HomeScreen = ({ route, navigation }: any) => {
  const strings = getStrings().home;
  const insets = useSafeAreaInsets();
  const userFromParams = route?.params?.user;
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);
  /** null = not yet answered today, true = answered yes, false = answered no */
  const [devotionAnswer, setDevotionAnswer] = useState<boolean | null>(null);
  const [answerSheetVisible, setAnswerSheetVisible] = useState(false);
  const [pendingCompleted, setPendingCompleted] = useState(true);
  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');
  const [readingBook, setReadingBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
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

  const showAlert = (
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
    });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const clearDevotionState = useCallback(() => {
    setDevotionAnswer(null);
    setReadingBook('');
    setSelectedChapters([]);
    setSelectedTestament('old');
  }, []);

  const refreshNotificationPermission = useCallback(async () => {
    try {
      const nextState = await getNotificationPermissionState();
      setNotificationPermissionState(nextState);
    } catch {
      setNotificationPermissionState('not_determined');
    }
  }, []);

  /* ── Load user once ── */
  useEffect(() => {
    if (!userFromParams) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          setUser(data.session.user);
        } else {
          setUser(null);
          clearDevotionState();
        }
        setLoading(false);
      });
    }
  }, [clearDevotionState, userFromParams]);

  /* ── Check today's devotion answer whenever screen is focused ── */
  useFocusEffect(
    useCallback(() => {
      const checkDevotion = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const userId = sessionUser?.id;

        if (!userId) {
          setUser(null);
          clearDevotionState();
          return;
        }

        setUser(sessionUser);

        // One-time silent migration: encrypt any legacy plaintext content.
        migrateContentEncryption(userId);

        const { data: devotionLogs } = await refreshDevotionLogs(userId);
        const data = devotionLogs[getTodayDate()];

        setDevotionAnswer(data ? (data.completed as boolean) : null);
        if (data?.reading_book) {
          setReadingBook(data.reading_book);
          const matchedBook = BIBLE_BOOKS.find(
            book => book.bookName === data.reading_book,
          );
          if (matchedBook) {
            setSelectedTestament(matchedBook.testament);
            const nextSelectedChapters = Array.isArray(
              (data as any).selected_chapters,
            )
              ? normalizeSelectedChapters(
                  (data as any).selected_chapters.map(Number),
                  matchedBook.chapters,
                )
              : chaptersFromLegacy(
                  (data as any).reading_chapter,
                  (data as any).chapters_read,
                  matchedBook.chapters,
                );
            setSelectedChapters(nextSelectedChapters);
          }
        }

        await syncDevotionReminderSchedule(userId, {
          startTomorrow: Boolean(data),
        });
      };
      checkDevotion();
      refreshNotificationPermission();
    }, [clearDevotionState, refreshNotificationPermission]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshNotificationPermission();
      }
    });

    return () => subscription.remove();
  }, [refreshNotificationPermission]);

  const handleNotificationPermissionAction = async () => {
    setPermissionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
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
  const handleDevotionAnswer = async (completed: boolean) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      return;
    }

    const normalizedChapters = normalizeSelectedChapters(
      selectedChapters,
      selectedBook?.chapters ?? 0,
    );

    if (completed && (!readingBook || normalizedChapters.length === 0)) {
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
      reading_book: completed ? readingBook : null,
      reading_chapter: completed
        ? firstSelectedChapter(normalizedChapters)
        : null,
      chapters_read: completed ? normalizedChapters.length || null : null,
      selected_chapters: completed ? normalizedChapters : null,
    };

    const { offline } = await saveDevotionLog({
      userId,
      date: getTodayDate(),
      payload,
    });

    await syncDevotionReminderSchedule(userId, { startTomorrow: true });

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
  };

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
  const handleAnswerNow = () => {
    setPendingCompleted(devotionAnswer ?? true);
    const matchedBook = BIBLE_BOOKS.find(book => book.bookName === readingBook);
    if (matchedBook) {
      setSelectedTestament(matchedBook.testament);
    }
    setAnswerSheetVisible(true);
  };

  const selectedBook = BIBLE_BOOKS.find(book => book.bookName === readingBook);
  const selectedTestamentBooks =
    selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;
  const chapterOptions = Array.from(
    { length: selectedBook?.chapters ?? 0 },
    (_, idx) => idx + 1,
  );

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
    !pendingCompleted || (!!readingBook && selectedChapters.length > 0);

  const saveDevotionSheet = async () => {
    setAnswerSheetVisible(false);
    await handleDevotionAnswer(pendingCompleted);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <QuickActionsGrid navigation={navigation} />
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
        <FeatureCard
          title={strings.featureCalendarTitle}
          subtitle={strings.featureCalendarSubtitle}
          icon="calendar-check-outline"
          onPress={() => navigation.navigate('DevotionCalendar')}
        />
        <FeatureCard
          title={strings.featurePrayerNotesTitle}
          subtitle={strings.featurePrayerNotesSubtitle}
          icon="hands-pray"
          onPress={() => navigation.navigate('PrayerNotes')}
        />
        <FeatureCard
          title={strings.featureReflectionTitle}
          subtitle={strings.featureReflectionSubtitle}
          icon="notebook-outline"
          onPress={() => navigation.navigate('SpiritualReflection')}
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
        canSaveReading={canSaveReading}
        onClose={() => setAnswerSheetVisible(false)}
        onSetPendingCompleted={setPendingCompleted}
        onSetSelectedTestament={value => {
          setSelectedTestament(value);
          const nextBooks =
            value === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;
          const nextBook = nextBooks[0];
          if (!nextBook) {
            return;
          }
          setReadingBook('');
          setSelectedChapters([]);
        }}
        onSetReadingBook={setReadingBook}
        onToggleChapter={chapter =>
          setSelectedChapters(current =>
            toggleChapterSelection(
              current,
              chapter,
              selectedBook?.chapters ?? 0,
            ),
          )
        }
        onSave={saveDevotionSheet}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
