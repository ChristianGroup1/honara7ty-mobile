import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
} from '../data/bibleMetadata';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const IVORY = '#F7F2E8';
const SKY = '#EEF3F8';
const SLATE = '#5C6676';
const INK = '#1F2A3A';

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
  /** When opened as a bottom tab there is no stack to go back to. */
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

  // Load saved devotion time from Supabase profiles table
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

  useEffect(() => {
    if (readingChapter > selectedBookMeta.chapters) {
      setReadingChapter(selectedBookMeta.chapters);
    }
  }, [readingChapter, selectedBookMeta.chapters]);

  const chapterOptions = useMemo(
    () => Array.from({ length: selectedBookMeta.chapters }, (_, idx) => idx + 1),
    [selectedBookMeta.chapters],
  );

  const dailyTargetOptions = chapterOptions;

  const renderChoiceChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderBookSection = (
    title: string,
    books: Array<(typeof BIBLE_BOOKS)[number]>,
  ) => (
    <View>
      <Text style={styles.groupLabel}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.choiceRow}
      >
        {books.map(book =>
          renderChoiceChip(
            book.bookName,
            readingBook === book.bookName,
            () => setReadingBook(book.bookName),
          ),
        )}
      </ScrollView>
    </View>
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

    // Upsert into profiles table
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
      // Schedule the daily reminder notification
      try {
        await scheduleDailyDevotionReminder(hours, minutes);
      } catch {
        // Notification scheduling is best-effort; don't block saving on failure.
      }

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
  const topInsetStyle = { height: insets.top };
  const saveButtonStyle = saving ? styles.saveBtnDisabled : null;
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
      <View style={[styles.topInset, topInsetStyle]} />

      <View style={styles.header}>
        {!isTab && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        {isTab && <View style={styles.headerSpacer} />}
        <Text style={styles.headerTitle}>{strings.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={16}
                color={NAVY}
              />
              <Text style={styles.heroBadgeText}>{strings.badge}</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="book-heart-outline"
                size={24}
                color={GOLD}
              />
            </View>
          </View>

          <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{strings.heroSubtitle}</Text>

          <TouchableOpacity
            style={styles.timePanel}
            onPress={() => setShowPicker(true)}
          >
            <View style={styles.timePanelIcon}>
              <MaterialCommunityIcons
                name="clock-time-four-outline"
                size={26}
                color="#FFF"
              />
            </View>
            <View style={styles.timePanelBody}>
              <Text style={styles.timeLabel}>{strings.selectedTime}</Text>
              <Text style={styles.timeText}>{timeDisplay}</Text>
            </View>
          </TouchableOpacity>
        </View>

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
          style={[styles.saveBtn, saveButtonStyle]}
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

        <View style={styles.pickerCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{strings.readingPlanTitle}</Text>
            <Text style={styles.sectionSubtitle}>
              {strings.readingPlanSubtitle}
            </Text>
          </View>

          <Text style={styles.fieldLabel}>{strings.selectBook}</Text>
          {renderBookSection(strings.oldTestament, OLD_TESTAMENT_BOOKS)}
          {renderBookSection(strings.newTestament, NEW_TESTAMENT_BOOKS)}

          <Text style={styles.fieldLabel}>{strings.selectChapter}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.choiceRow}
          >
            {chapterOptions.map(chapter =>
              renderChoiceChip(
                `اصحاح ${chapter}`,
                readingChapter === chapter,
                () => setReadingChapter(chapter),
              ),
            )}
          </ScrollView>

          <Text style={styles.fieldLabel}>{strings.chaptersPerDay}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.choiceRow}
          >
            {dailyTargetOptions.map(value =>
              renderChoiceChip(
                `${value}`,
                dailyChaptersTarget === value,
                () => setDailyChaptersTarget(value),
              ),
            )}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{strings.tipsTitle}</Text>
          <Text style={styles.sectionSubtitle}>
            {strings.tipsSubtitle}
          </Text>
        </View>
        {tips.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <View style={styles.tipBody}>
              <Text style={styles.tipIndex}>0{i + 1}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
            <View style={styles.tipIconWrap}>
              <MaterialCommunityIcons name={tip.icon} size={24} color={NAVY} />
            </View>
          </View>
        ))}
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SKY },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topInset: { backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  headerTitle: { color: '#FFF', fontSize: 19, fontWeight: '800' },

  content: { padding: 18, paddingBottom: 40 },

  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(201,168,76,0.14)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: IVORY,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '800',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'left',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'left',
    marginBottom: 18,
  },
  timePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  timePanelIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  timePanelBody: {
    flex: 1,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'left',
  },
  editChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: IVORY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#FFF',
    fontSize: 30,

    fontWeight: '800',
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metaValue: {
    color: IVORY,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 11,
    fontWeight: '700',
  },
  pickerCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  iosPicker: { alignSelf: 'center' },
  quickActionCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EFF3F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  quickActionBody: {
    flex: 1,
  },
  quickActionTitle: {
    color: INK,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 4,
  },
  quickActionText: {
    color: SLATE,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },

  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
    elevation: 5,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  sectionHeader: {
    textAlign: 'left',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    textAlign: 'left',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: SLATE,
    fontSize: 13,
    textAlign: 'left',
  },
  fieldLabel: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
    textAlign: 'left',
  },
  groupLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'left',
  },
  choiceRow: {
    gap: 8,
    paddingBottom: 8,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: '#D6DEEA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFD',
  },
  choiceChipSelected: {
    borderColor: NAVY,
    backgroundColor: NAVY,
  },
  choiceChipText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '600',
  },
  choiceChipTextSelected: {
    color: '#FFF',
  },
  tipCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 12,
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  tipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F2F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tipBody: {
    flex: 1,
  },
  tipIndex: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'left',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: INK,
    textAlign: 'left',
    lineHeight: 24,
  },
});

export default DailyNotificationsScreen;
