import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import { scheduleDailyDevotionReminder } from '../../lib/notifications';
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

const DailyNotificationsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().dailyNotifications;
  const insets = useSafeAreaInsets();
  const tips = [
    { icon: 'weather-sunset-up', text: strings.tips[0] },
    { icon: 'map-marker-outline', text: strings.tips[1] },
    { icon: 'book-open-outline', text: strings.tips[2] },
    { icon: 'cellphone-off', text: strings.tips[3] },
    { icon: 'timer-outline', text: strings.tips[4] },
  ];
  const isTab = route?.name === 'DailyNotifications';
  const [devotionTime, setDevotionTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [readingBook, setReadingBook] = useState(BIBLE_BOOKS[0].bookName);
  const [readingChapter, setReadingChapter] = useState(1);
  const [dailyChaptersTarget, setDailyChaptersTarget] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('devotion_time, reading_book, reading_chapter, daily_chapters_target')
        .eq('id', userId)
        .single();
      if (data?.devotion_time) {
        const [h, m] = (data.devotion_time as string).split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setDevotionTime(d);
      }
      if (data?.reading_book) {
        setReadingBook(data.reading_book);
      }
      if (data?.reading_chapter) {
        setReadingChapter(Math.max(1, Number(data.reading_chapter)));
      }
      if (data?.daily_chapters_target) {
        setDailyChaptersTarget(Math.max(1, Number(data.daily_chapters_target)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (selected) {
      setDevotionTime(selected);
    }
  };

  const selectedBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === readingBook) ?? BIBLE_BOOKS[0],
    [readingBook],
  );

  const [selectedTestament, setSelectedTestament] = useState<Testament>(
    selectedBookMeta.testament,
  );

  useEffect(() => {
    setSelectedTestament(selectedBookMeta.testament);
  }, [selectedBookMeta.testament]);

  const booksForTestament = useMemo(
    () => (selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS),
    [selectedTestament],
  );

  useEffect(() => {
    if (selectedBookMeta.testament !== selectedTestament) {
      setReadingBook(booksForTestament[0]?.bookName ?? BIBLE_BOOKS[0].bookName);
      setReadingChapter(1);
      setDailyChaptersTarget(1);
    }
  }, [booksForTestament, selectedBookMeta.testament, selectedTestament]);

  useEffect(() => {
    if (readingChapter > selectedBookMeta.chapters) {
      setReadingChapter(selectedBookMeta.chapters);
    }
    if (dailyChaptersTarget > selectedBookMeta.chapters) {
      setDailyChaptersTarget(selectedBookMeta.chapters);
    }
  }, [dailyChaptersTarget, readingChapter, selectedBookMeta.chapters]);

  const chapterOptions = useMemo(
    () => Array.from({ length: selectedBookMeta.chapters }, (_, idx) => idx + 1),
    [selectedBookMeta.chapters],
  );

  const testamentOptions = useMemo(
    () => [
      { key: 'old' as const, label: strings.oldTestament, icon: 'book-open-page-variant-outline' },
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

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          devotion_time: timeString,
          reading_book: readingBook,
          reading_chapter: readingChapter,
          daily_chapters_target: dailyChaptersTarget,
        },
        { onConflict: 'id' },
      );

    if (error) {
      showAlert(strings.saveErrorTitle, error.message);
    } else {
      try {
        await scheduleDailyDevotionReminder(hours, minutes);
      } catch {}

      setSaved(true);
      showAlert(
        strings.saveSuccessTitle,
        strings.saveSuccessMessage(timeString),
        undefined,
        'success',
      );
    }
    setSaving(false);
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
        topInsetHeight={insets.top}
        title={strings.title}
        leading={
          !isTab ? (
            <AppHeaderAction
              icon="arrow-right"
              onPress={() => navigation.goBack()}
              size={24}
            />
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DailyNotificationsHero
          strings={strings}
          timeDisplay={timeDisplay}
          onEditTime={() => setShowPicker(true)}
        />

        {Platform.OS === 'ios' && (
          <View style={styles.pickerCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{strings.editTime}</Text>
              <Text style={styles.sectionSubtitle}>
                {strings.editTimeSubtitle}
              </Text>
            </View>
            <DateTimePicker
              value={devotionTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              locale="ar"
              style={styles.iosPicker}
            />
          </View>
        )}

        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={devotionTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={saved ? 'check-bold' : 'content-save-outline'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.saveBtnText}>{strings.saveTime}</Text>
            </>
          )}
        </TouchableOpacity>

        <DailyReadingPlanCard
          strings={strings}
          selectedTestament={selectedTestament}
          testamentOptions={testamentOptions}
          booksForTestament={booksForTestament}
          readingBook={readingBook}
          chapterOptions={chapterOptions}
          readingChapter={readingChapter}
          dailyChaptersTarget={dailyChaptersTarget}
          onSetTestament={setSelectedTestament}
          onSetReadingBook={setReadingBook}
          onSetReadingChapter={setReadingChapter}
          onSetDailyTarget={setDailyChaptersTarget}
        />

        <DailyTipsList strings={strings} tips={tips} />
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default DailyNotificationsScreen;
