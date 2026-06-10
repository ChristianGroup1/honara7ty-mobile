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
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import supabase from '../../lib/supbase';
import {
  getNotificationPermissionState,
  openAppNotificationSettings,
  requestNotificationPermission,
  scheduleDailyDevotionReminder,
} from '../../lib/notifications';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../data/bibleMetadata';
import DailyNotificationsHero from './DailyNotificationsHero';
import DailyReadingPlanCard from './DailyReadingPlanCard';
import DailyTipsList from './DailyTipsList';
import { dailyNotificationStyles as styles, NAVY } from './styles';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import NotificationPermissionCard from '../shared/NotificationPermissionCard';
import {
  firstSelectedChapter,
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import { ensureDefaultDevotionTime } from '../../lib/ensureDefaultDevotionTime';
import {
  readCachedDevotionLogs,
  readCachedProfileRecord,
  refreshDevotionLogs,
  refreshProfileRecord,
  saveProfileRecord,
} from '../../lib/offlineSync';
import {
  mergeReadingDraft,
  ReadingEntry,
  readingEntriesFromLegacy,
} from '../../lib/readingEntries';
import {
  buildReadingPlanSuggestions,
} from '../../lib/readingPlanSuggestions';
import type { ReadingPlanSuggestion } from '../../lib/readingPlanSuggestions';

const DailyNotificationsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().dailyNotifications;
  const insets = useSafeAreaInsets();
  const tips = useMemo(
    () => [
      { icon: 'weather-sunset-up', text: strings.tips[0] },
      { icon: 'map-marker-outline', text: strings.tips[1] },
      { icon: 'book-open-outline', text: strings.tips[2] },
      { icon: 'cellphone-off', text: strings.tips[3] },
      { icon: 'timer-outline', text: strings.tips[4] },
    ],
    [strings.tips],
  );
  const [devotionTime, setDevotionTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [pendingDevotionTime, setPendingDevotionTime] =
    useState<Date>(devotionTime);
  const [showPicker, setShowPicker] = useState(false);
  const [readingBook, setReadingBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [readingEntries, setReadingEntries] = useState<ReadingEntry[]>([]);
  const [devotionLogsForSuggestions, setDevotionLogsForSuggestions] = useState<
    Record<string, any>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<'allowed' | 'denied' | 'not_determined'>('not_determined');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });
  const sessionUserRef = useRef<any>(null);

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const refreshNotificationPermission = useCallback(async () => {
    try {
      const nextState = await getNotificationPermissionState();
      setNotificationPermissionState(nextState);
    } catch {
      setNotificationPermissionState('not_determined');
    }
  }, []);

  const applyReminderData = useCallback(
    async (
      userId: string,
      profile: any,
      devotionLogs: Record<string, any> | null | undefined,
      shouldPersistDefaultTime = false,
    ) => {
      if (profile?.devotion_time) {
        const [h, m] = (profile.devotion_time as string).split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setDevotionTime(d);
      } else {
        const d = new Date();
        d.setHours(7, 0, 0, 0);
        setDevotionTime(d);

        if (shouldPersistDefaultTime) {
          await saveProfileRecord({
            userId,
            profile: {
              devotion_time: '07:00',
              updated_at: new Date().toISOString(),
            },
          });
        }
      }

      const latestCompletedLog = Object.entries(devotionLogs ?? {})
        .filter(([, log]) => log.completed)
        .sort(([leftDate], [rightDate]) =>
          rightDate.localeCompare(leftDate),
        )[0]?.[1];
      const latestEntries =
        latestCompletedLog?.reading_book || latestCompletedLog?.reading_entries
          ? Array.isArray(latestCompletedLog.reading_entries)
            ? latestCompletedLog.reading_entries
            : readingEntriesFromLegacy({
                readingBook: latestCompletedLog.reading_book,
                readingChapter: latestCompletedLog.reading_chapter,
                chaptersRead: latestCompletedLog.chapters_read,
                selectedChapters: latestCompletedLog.selected_chapters,
              })
          : [];
      const profileEntries =
        profile?.reading_book || profile?.reading_entries
          ? Array.isArray(profile.reading_entries)
            ? profile.reading_entries
            : readingEntriesFromLegacy({
                readingBook: profile.reading_book,
                readingChapter: profile.reading_chapter,
                chaptersRead: profile.daily_chapters_target,
                selectedChapters: profile.selected_chapters,
              })
          : [];
      const nextEntries = latestEntries.length ? latestEntries : profileEntries;
      setDevotionLogsForSuggestions(devotionLogs ?? {});

      if (nextEntries.length > 0) {
        const firstEntry = nextEntries[0];
        setReadingEntries(nextEntries);
        setReadingBook(firstEntry?.reading_book ?? '');
        setSelectedChapters(firstEntry?.selected_chapters ?? []);
      } else if (profile?.reading_book || profile?.reading_entries) {
        const fallbackEntries = Array.isArray(profile.reading_entries)
          ? profile.reading_entries
          : readingEntriesFromLegacy({
              readingBook: profile.reading_book,
              readingChapter: profile.reading_chapter,
              chaptersRead: profile.daily_chapters_target,
              selectedChapters: profile.selected_chapters,
            });
        const firstEntry = fallbackEntries[0];
        setReadingEntries(fallbackEntries);
        setReadingBook(firstEntry?.reading_book ?? profile.reading_book ?? '');
        setSelectedChapters(firstEntry?.selected_chapters ?? []);
      }
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
      }
      const userId = sessionUser?.id;
      if (!userId) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }

      sessionUserRef.current = sessionUser;

      const [cachedProfile, cachedDevotionLogs] = await Promise.all([
        readCachedProfileRecord(userId),
        readCachedDevotionLogs(userId),
      ]);
      if (!isActive) {
        return;
      }
      await applyReminderData(userId, cachedProfile, cachedDevotionLogs);
      setLoading(false);

      const [{ data: profile }, { data: devotionLogs }] = await Promise.all([
        refreshProfileRecord(userId),
        refreshDevotionLogs(userId),
      ]);
      if (!isActive) {
        return;
      }
      await applyReminderData(userId, profile, devotionLogs, true);
      setLoading(false);
    };

    load();

    return () => {
      isActive = false;
    };
  }, [applyReminderData]);

  useFocusEffect(
    useCallback(() => {
      refreshNotificationPermission();
    }, [refreshNotificationPermission]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshNotificationPermission();
      }
    });

    return () => subscription.remove();
  }, [refreshNotificationPermission]);

  const openTimePicker = () => {
    setPendingDevotionTime(devotionTime);
    setShowPicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (selected) {
      if (Platform.OS === 'ios') {
        setPendingDevotionTime(selected);
      } else {
        setDevotionTime(selected);
      }
    }
  };

  const confirmIosTime = () => {
    setDevotionTime(pendingDevotionTime);
    setShowPicker(false);
  };

  const selectedBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === readingBook),
    [readingBook],
  );

  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');

  useEffect(() => {
    if (selectedBookMeta) {
      setSelectedTestament(selectedBookMeta.testament);
    }
  }, [selectedBookMeta]);

  const booksForTestament = useMemo(
    () =>
      selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS,
    [selectedTestament],
  );

  useEffect(() => {
    if (readingBook && selectedBookMeta?.testament !== selectedTestament) {
      setReadingBook('');
      setSelectedChapters([]);
    }
  }, [selectedBookMeta, selectedTestament, readingBook]);

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

  const chapterOptions = useMemo(
    () =>
      Array.from(
        { length: selectedBookMeta?.chapters ?? 0 },
        (_, idx) => idx + 1,
      ),
    [selectedBookMeta],
  );

  const handleAddReadingEntry = () => {
    const normalizedChapters = normalizeSelectedChapters(
      selectedChapters,
      selectedBookMeta?.chapters ?? 0,
    );
    if (!readingBook || normalizedChapters.length === 0) {
      return;
    }
    setReadingEntries(current =>
      mergeReadingDraft(current, readingBook, normalizedChapters),
    );
    setReadingBook('');
    setSelectedChapters([]);
  };

  const handleRemoveReadingEntry = (index: number) => {
    setReadingEntries(current => {
      const removed = current[index];
      if (removed?.reading_book === readingBook) {
        setReadingBook('');
        setSelectedChapters([]);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const readingPlanSuggestions = useMemo(
    () =>
      buildReadingPlanSuggestions(
        strings.readingPlanSuggestions,
        devotionLogsForSuggestions,
      ),
    [devotionLogsForSuggestions, strings.readingPlanSuggestions],
  );

  const handleApplySuggestion = useCallback(
    (suggestion: ReadingPlanSuggestion) => {
      const firstEntry = suggestion.entries[0];
      setReadingEntries(suggestion.entries);
      setReadingBook(firstEntry?.reading_book ?? '');
      setSelectedChapters(firstEntry?.selected_chapters ?? []);
      setSaved(false);
    },
    [],
  );

  useEffect(() => {
    const selectedPlanKey = route?.params?.selectedReadingPlanKey;
    if (!selectedPlanKey) {
      return;
    }

    const suggestion = readingPlanSuggestions.find(
      item => item.key === selectedPlanKey,
    );
    if (suggestion) {
      handleApplySuggestion(suggestion);
      navigation.setParams({ selectedReadingPlanKey: undefined });
    }
  }, [
    handleApplySuggestion,
    navigation,
    readingPlanSuggestions,
    route?.params?.selectedReadingPlanKey,
  ]);

  const openReadingPlanSuggestions = useCallback(() => {
    navigation.navigate('ReadingPlanSuggestions');
  }, [navigation]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    let sessionUser = sessionUserRef.current;
    if (!sessionUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      sessionUser = sessionData?.session?.user;
      sessionUserRef.current = sessionUser;
    }
    const userId = sessionUser?.id;
    if (!userId) {
      setSaving(false);
      return;
    }

    const hours = devotionTime.getHours();
    const minutes = devotionTime.getMinutes();
    const timeString = `${String(hours).padStart(2, '0')}:${String(
      minutes,
    ).padStart(2, '0')}`;

    const normalizedChapters = normalizeSelectedChapters(
      selectedChapters,
      selectedBookMeta?.chapters ?? 0,
    );
    const nextReadingEntries = mergeReadingDraft(
      readingEntries,
      readingBook,
      normalizedChapters,
    );
    const firstEntry = nextReadingEntries[0];

    if (nextReadingEntries.length === 0) {
      showAlert(
        strings.readingSelectionRequiredTitle,
        strings.readingSelectionRequiredMessage,
        undefined,
        'warning',
      );
      setSaving(false);
      return;
    }

    const result = await saveProfileRecord({
      userId,
      profile: {
        devotion_time: timeString,
        reading_book: firstEntry?.reading_book ?? null,
        reading_chapter: firstSelectedChapter(
          firstEntry?.selected_chapters ?? [],
        ),
        daily_chapters_target: firstEntry?.selected_chapters.length || null,
        selected_chapters: firstEntry?.selected_chapters ?? null,
        reading_entries: nextReadingEntries,
      },
    });

    try {
      await scheduleDailyDevotionReminder(hours, minutes);
    } catch {
      showAlert(
        strings.scheduleErrorTitle,
        strings.scheduleErrorMessage,
        undefined,
        'warning',
      );
      setSaving(false);
      return;
    }

    setSaved(true);
    showAlert(
      strings.saveSuccessTitle,
      result.offline
        ? strings.saveOfflineMessage(timeString)
        : strings.saveSuccessMessage(timeString),
      undefined,
      'success',
    );
    setSaving(false);
  };

  const handlePermissionAction = async () => {
    setPermissionLoading(true);
    try {
      if (notificationPermissionState === 'denied') {
        await openAppNotificationSettings();
        return;
      }

      const allowed = await requestNotificationPermission();
      if (!allowed) {
        return;
      }

      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
        sessionUserRef.current = sessionUser;
      }
      await ensureDefaultDevotionTime(sessionUser?.id, {
        scheduleReminder: true,
      });
    } finally {
      setPermissionLoading(false);
      await refreshNotificationPermission();
    }
  };

  const timeDisplay = devotionTime.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

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
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DailyNotificationsHero
          strings={strings}
          timeDisplay={timeDisplay}
          onEditTime={openTimePicker}
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
            onPress={handlePermissionAction}
            loading={permissionLoading}
          />
        )}

        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={devotionTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        <DailyReadingPlanCard
          strings={strings}
          selectedTestament={selectedTestament}
          booksForTestament={booksForTestament}
          readingBook={readingBook}
          chapterOptions={chapterOptions}
          selectedChapters={selectedChapters}
          readingEntries={readingEntries}
          timeDisplay={timeDisplay}
          saving={saving}
          saved={saved}
          canSaveReading={
            readingEntries.length > 0 ||
            (!!readingBook && selectedChapters.length > 0)
          }
          onSetTestament={setSelectedTestament}
          onSetReadingBook={setReadingBook}
          onToggleChapter={chapter =>
            setSelectedChapters(current =>
              toggleChapterSelection(
                current,
                chapter,
                selectedBookMeta?.chapters ?? 0,
              ),
            )
          }
          onSelectAllChapters={() => {
            if (selectedBookMeta) {
              setSelectedChapters(
                Array.from(
                  { length: selectedBookMeta.chapters },
                  (_, i) => i + 1,
                ),
              );
            }
          }}
          onClearChapters={() => setSelectedChapters([])}
          onAddReadingEntry={handleAddReadingEntry}
          onRemoveReadingEntry={handleRemoveReadingEntry}
          onOpenSuggestions={openReadingPlanSuggestions}
          onEditTime={openTimePicker}
          onSave={handleSave}
        />

        <DailyTipsList strings={strings} tips={tips} />
      </ScrollView>

      {showPicker && Platform.OS === 'ios' ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHandle} />
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerActionSecondary}>إلغاء</Text>
                </TouchableOpacity>
                <View style={styles.pickerTitleWrap}>
                  <Text style={styles.pickerTitle}>{strings.editTime}</Text>
                  <Text style={styles.pickerSubtitle}>
                    {strings.editTimeSubtitle}
                  </Text>
                </View>
                <TouchableOpacity onPress={confirmIosTime}>
                  <Text style={styles.pickerActionPrimary}>تأكيد</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDevotionTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                locale="ar"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default DailyNotificationsScreen;
