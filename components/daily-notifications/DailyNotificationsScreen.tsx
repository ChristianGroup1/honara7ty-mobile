import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  chaptersFromLegacy,
  firstSelectedChapter,
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import { ensureDefaultDevotionTime } from '../../lib/ensureDefaultDevotionTime';
import { refreshProfileRecord, saveProfileRecord } from '../../lib/offlineSync';

const DailyNotificationsScreen = ({ navigation }: any) => {
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

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }
      const { data } = await refreshProfileRecord(userId);
      if (!isActive) {
        return;
      }
      if (data?.devotion_time) {
        const [h, m] = (data.devotion_time as string).split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setDevotionTime(d);
      } else {
        const d = new Date();
        d.setHours(7, 0, 0, 0);
        setDevotionTime(d);

        await saveProfileRecord({
          userId,
          profile: {
            devotion_time: '07:00',
            updated_at: new Date().toISOString(),
          },
        });
      }
      if (data?.reading_book) {
        setReadingBook(data.reading_book);
        const matchedBook =
          BIBLE_BOOKS.find(book => book.bookName === data.reading_book) ??
          BIBLE_BOOKS[0];
        setSelectedChapters(
          Array.isArray((data as any).selected_chapters)
            ? normalizeSelectedChapters(
                (data as any).selected_chapters.map(Number),
                matchedBook.chapters,
              )
            : chaptersFromLegacy(
                (data as any).reading_chapter,
                (data as any).daily_chapters_target,
                matchedBook.chapters,
              ),
        );
      }
      if (isActive) {
        setLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

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

  const testamentOptions = useMemo(
    () => [
      {
        key: 'old' as const,
        label: strings.oldTestament,
        icon: 'book-open-page-variant-outline',
      },
      { key: 'new' as const, label: strings.newTestament, icon: 'cross' },
    ],
    [strings.newTestament, strings.oldTestament],
  );

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
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

    if (!readingBook || normalizedChapters.length === 0) {
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
        reading_book: readingBook,
        reading_chapter: firstSelectedChapter(normalizedChapters),
        daily_chapters_target: normalizedChapters.length || null,
        selected_chapters: normalizedChapters,
      },
    });

    try {
      await scheduleDailyDevotionReminder(hours, minutes);
    } catch {}

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

      const { data: sessionData } = await supabase.auth.getSession();
      await ensureDefaultDevotionTime(sessionData?.session?.user?.id, {
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
          testamentOptions={testamentOptions}
          booksForTestament={booksForTestament}
          readingBook={readingBook}
          chapterOptions={chapterOptions}
          selectedChapters={selectedChapters}
          timeDisplay={timeDisplay}
          saving={saving}
          saved={saved}
          canSaveReading={!!readingBook && selectedChapters.length > 0}
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
