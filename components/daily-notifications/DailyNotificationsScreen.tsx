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
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
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
import { dailyNotificationStyles as styles } from './styles';
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
import { setActiveReadingPlan } from '../../lib/activeReadingPlan';
import { AppTheme, useNightMode } from '../../lib/nightMode';

const DailyNotificationsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().dailyNotifications;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const themedStyles = useMemo(
    () => createThemedStyles(colors),
    [colors],
  );
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
  const [refreshing, setRefreshing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
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
  const hasLoadedNotificationsRef = useRef(false);

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

  const loadNotifications = useCallback(
    async ({
      showLoader = false,
      showRefreshing = false,
    }: { showLoader?: boolean; showRefreshing?: boolean } = {}) => {
      if (showLoader) {
        setLoading(true);
      }
      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        let sessionUser = sessionUserRef.current;
        if (!sessionUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        }
        const userId = sessionUser?.id;
        if (!userId) {
          return;
        }

        sessionUserRef.current = sessionUser;

        const [cachedProfile, cachedDevotionLogs] = await Promise.all([
          readCachedProfileRecord(userId),
          readCachedDevotionLogs(userId),
        ]);
        await applyReminderData(userId, cachedProfile, cachedDevotionLogs);
        setHasContent(true);
        setLoading(false);

        const [{ data: profile }, { data: devotionLogs }] = await Promise.all([
          refreshProfileRecord(userId),
          refreshDevotionLogs(userId),
        ]);
        await applyReminderData(userId, profile, devotionLogs, true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyReminderData],
  );

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedNotificationsRef.current;
      hasLoadedNotificationsRef.current = true;
      loadNotifications({ showLoader: shouldShowLoader });
    }, [loadNotifications]),
  );

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
      // Persist the active plan so the Home screen can auto-fill today's reading.
      (async () => {
        let sessionUser = sessionUserRef.current;
        if (!sessionUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        }
        if (sessionUser?.id) {
          await setActiveReadingPlan(sessionUser.id, selectedPlanKey);
        }
      })().catch(() => undefined);
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

  if (loading && !hasContent) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
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
        contentContainerStyle={themedStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications({ showRefreshing: true })}
          />
        }
      >
        <DailyNotificationsHero
          strings={strings}
          timeDisplay={timeDisplay}
          onEditTime={openTimePicker}
          styles={themedStyles}
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
          styles={themedStyles}
          accentColor={colors.accent}
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

        <DailyTipsList
          strings={strings}
          tips={tips}
          styles={themedStyles}
          iconColor={colors.accent}
        />
      </ScrollView>

      {showPicker && Platform.OS === 'ios' ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={themedStyles.modalOverlay}>
            <View style={themedStyles.pickerSheet}>
              <View style={themedStyles.pickerHandle} />
              <View style={themedStyles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={themedStyles.pickerActionSecondary}>إلغاء</Text>
                </TouchableOpacity>
                <View style={themedStyles.pickerTitleWrap}>
                  <Text style={themedStyles.pickerTitle}>{strings.editTime}</Text>
                  <Text style={themedStyles.pickerSubtitle}>
                    {strings.editTimeSubtitle}
                  </Text>
                </View>
                <TouchableOpacity onPress={confirmIosTime}>
                  <Text style={themedStyles.pickerActionPrimary}>تأكيد</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDevotionTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                locale="ar"
                style={themedStyles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const mergeStyle = (...style: any[]) => StyleSheet.flatten(style);

const createThemedStyles = (colors: AppTheme['colors']) => ({
  ...styles,
  container: mergeStyle(styles.container, {
    backgroundColor: colors.background,
  }),
  loadingContainer: mergeStyle(styles.loadingContainer, {
    backgroundColor: colors.background,
  }),
  content: styles.content,
  pickerCard: mergeStyle(styles.pickerCard, {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
  }),
  inlineTimeCard: mergeStyle(styles.inlineTimeCard, {
    backgroundColor: colors.cardMuted,
    borderColor: colors.border,
  }),
  inlineTimeLabel: mergeStyle(styles.inlineTimeLabel, {
    color: colors.mutedText,
  }),
  inlineTimeValue: mergeStyle(styles.inlineTimeValue, {
    color: colors.text,
  }),
  sectionTitle: mergeStyle(styles.sectionTitle, {
    color: colors.text,
  }),
  sectionSubtitle: mergeStyle(styles.sectionSubtitle, {
    color: colors.mutedText,
  }),
  fieldLabel: mergeStyle(styles.fieldLabel, {
    color: colors.text,
  }),
  rangeHint: mergeStyle(styles.rangeHint, {
    color: colors.mutedText,
  }),
  multiReadingHint: mergeStyle(styles.multiReadingHint, {
    color: colors.mutedText,
  }),
  openSuggestionsCard: mergeStyle(styles.openSuggestionsCard, {
    backgroundColor: colors.cardMuted,
    borderColor: colors.border,
  }),
  openSuggestionsTitle: mergeStyle(styles.openSuggestionsTitle, {
    color: colors.text,
  }),
  openSuggestionsText: mergeStyle(styles.openSuggestionsText, {
    color: colors.mutedText,
  }),
  readingEntryRow: mergeStyle(styles.readingEntryRow, {
    backgroundColor: colors.cardMuted,
    borderColor: colors.border,
  }),
  readingEntryText: mergeStyle(styles.readingEntryText, {
    color: colors.text,
  }),
  tipCard: mergeStyle(styles.tipCard, {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
  }),
  tipIconWrap: mergeStyle(styles.tipIconWrap, {
    backgroundColor: colors.cardMuted,
  }),
  tipText: mergeStyle(styles.tipText, {
    color: colors.text,
  }),
  pickerSheet: mergeStyle(styles.pickerSheet, {
    backgroundColor: colors.card,
  }),
  pickerHandle: mergeStyle(styles.pickerHandle, {
    backgroundColor: colors.border,
  }),
  pickerHeader: styles.pickerHeader,
  pickerTitle: mergeStyle(styles.pickerTitle, {
    color: colors.text,
  }),
  pickerSubtitle: mergeStyle(styles.pickerSubtitle, {
    color: colors.mutedText,
  }),
  pickerActionSecondary: mergeStyle(styles.pickerActionSecondary, {
    color: colors.mutedText,
  }),
  pickerActionPrimary: mergeStyle(styles.pickerActionPrimary, {
    color: colors.accent,
  }),
});

export default DailyNotificationsScreen;
