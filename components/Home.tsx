import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const CARD_DARK = '#152040';
const ACCENT_BLUE = '#2A7BBA';
const GOLD = '#C9A84C';

/* ── Activity cards – Hymns (ترانيم) removed as it cannot be backed by Supabase ── */
const ACTIVITY_CARDS = [
  {
    key: 'PrayerNotes',
    icon: 'hands-pray',
    title: 'طلبات الصلاة',
    subtitle: 'سجّل طلبات الصلاة',
    iconColor: '#5BB8F5',
    cardBg: '#1A3A5A',
  },
  {
    key: 'BibleMemorization',
    icon: 'book-open-variant',
    title: 'حفظ الكتاب',
    subtitle: 'راجع الآيات المحفوظة',
    iconColor: '#A67BF5',
    cardBg: '#2A1A4A',
  },
  {
    key: 'SpiritualReflection',
    icon: 'notebook-heart-outline',
    title: 'اليوميات',
    subtitle: 'سجل مشاعرك اليوم',
    iconColor: '#5BF5A0',
    cardBg: '#1A3A2A',
  },
  {
    key: 'Badges',
    icon: 'medal-outline',
    title: 'الأوسمة',
    subtitle: 'شاهد إنجازاتك',
    iconColor: GOLD,
    cardBg: '#3A2A0A',
  },
];

/* ── Daily verse pool (shown in rotation by day-of-year) ── */
const DAILY_VERSES = [
  {
    text: '«لِأَنَّهُ يُوصِي مَلاَئِكَتَهُ بِكَ لِكَيْ يَحْفَظُوكَ فِي كُلِّ طُرُقِكَ»',
    ref: 'مزمور ٩١:١١',
  },
  {
    text: '«اِتَّكِلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ وَلاَ تَسْتَنِدْ إِلَى فَهْمِكَ»',
    ref: 'أمثال ٣:٥',
  },
  {
    text: '«لأَنِّي أَنَا عَارِفٌ الأَفْكَارَ الَّتِي أُفَكِّرُهَا نَحْوَكُمْ يَقُولُ الرَّبُّ أَفْكَارُ سَلاَمٍ»',
    ref: 'إرميا ٢٩:١١',
  },
  {
    text: '«اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ»',
    ref: 'مزمور ٢٣:١',
  },
  {
    text: '«كُلَّ شَيْءٍ أَسْتَطِيعُ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي»',
    ref: 'فيلبي ٤:١٣',
  },
  {
    text: '«فِرْحُوا فِي الرَّبِّ كُلَّ حِينٍ وَأَقُولُ أَيْضاً افْرَحُوا»',
    ref: 'فيلبي ٤:٤',
  },
  {
    text: '«اِسْهَرُوا وَصَلُّوا لِئَلاَّ تَدْخُلُوا فِي تَجْرِبَةٍ»',
    ref: 'متى ٢٦:٤١',
  },
];

function getDailyVerse() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) { return 'صباح الخير،'; }
  if (h < 18) { return 'مساء الخير،'; }
  return 'مساء النور،';
}

/** Compute consecutive-day streak from an array of ISO date strings */
function computeStreak(dates: string[]): number {
  if (!dates.length) { return 0; }
  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let expected = today;
  for (const d of unique) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().split('T')[0];
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

/** Percentage of last 30 days that have at least one reading/reflection */
function computeCompletionRate(dates: string[]): number {
  const unique = new Set(dates);
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (unique.has(d.toISOString().split('T')[0])) { count++; }
  }
  return Math.round((count / 30) * 100);
}

const HomeScreen = ({ route, navigation }: any) => {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2; // two columns with padding + gap

  const userFromParams = route?.params?.user;
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);
  const [streak, setStreak] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [prayerCount, setPrayerCount] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const hideAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user ?? null;
    if (currentUser) {
      setUser(currentUser);
      const uid = currentUser.id;
      const today = new Date().toISOString().split('T')[0];

      // Fetch reading log dates for streak & completion rate
      const { data: readingData } = await supabase
        .from('reading_log')
        .select('date')
        .eq('user_id', uid);
      const readingDates = (readingData ?? []).map((r: any) => r.date as string);
      setStreak(computeStreak(readingDates));
      setCompletionRate(computeCompletionRate(readingDates));

      // Fetch active prayer count
      const { count: prayers } = await supabase
        .from('prayer_notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('is_answered', false);
      setPrayerCount(prayers ?? 0);

      // Check if user has a reflection today (used as quiet-time check-in)
      const { data: todayReflection } = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', uid)
        .eq('date', today)
        .limit(1);
      setCheckedInToday((todayReflection ?? []).length > 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT_BLUE} />
      </View>
    );
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'مستخدم';

  const initials = displayName.trim().slice(0, 1).toUpperCase();
  const dailyVerse = getDailyVerse();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>
              {streak} نقطة
            </Text>
            <MaterialCommunityIcons name="star" size={14} color={GOLD} style={styles.starIcon} />
          </View>
          <View style={styles.headerRight}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greetingLine}>مرحباً 🙏 {getGreeting()}</Text>
              <Text style={styles.nameText}>{displayName}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
        </View>

        {/* ── Daily Activity Badge ── */}
        <View style={styles.badgeRow}>
          <View style={styles.activityBadge}>
            <Text style={styles.activityBadgeText}>النشاط اليومي</Text>
          </View>
        </View>

        {/* ── Quiet Time Card ── */}
        <View style={styles.quietTimeCard}>
          <Text style={styles.qtTitle}>وقت الخلوة</Text>
          <Text style={styles.qtSubtitle}>
            هل خصصت وقتاً للجلوس مع الله اليوم؟ استمر في{'\n'}بناء علاقتك الروحية.
          </Text>
          <TouchableOpacity
            style={[
              styles.checkInBtn,
              checkedInToday && styles.checkInBtnDone,
            ]}
            activeOpacity={0.85}
            onPress={() => {
              if (!checkedInToday) {
                navigation.navigate('SpiritualReflection');
              }
            }}
          >
            <MaterialCommunityIcons
              name={checkedInToday ? 'check-circle' : 'check-circle-outline'}
              size={18}
              color="#FFF"
              style={styles.checkIcon}
            />
            <Text style={styles.checkInText}>
              {checkedInToday ? 'تمت الخلوة اليوم ✓' : 'سجل خلوتك اليوم'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCardLeft}>
            <MaterialCommunityIcons name="fire" size={20} color="#FF6B35" />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>أيام متتالية</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check-outline" size={20} color={ACCENT_BLUE} />
            <Text style={styles.statValue}>{completionRate}٪</Text>
            <Text style={styles.statLabel}>معدل الإنجاز</Text>
          </View>
        </View>

        {/* ── My Activities ── */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('BibleReader')}>
            <Text style={styles.seeAll}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>أنشطتي</Text>
        </View>

        <View style={styles.cardsGrid}>
          {ACTIVITY_CARDS.map(card => {
            const subtitle =
              card.key === 'PrayerNotes'
                ? `${prayerCount} طلبات نشطة`
                : card.subtitle;
            return (
              <TouchableOpacity
                key={card.key}
                style={[
                  styles.actCard,
                  { width: cardWidth, backgroundColor: card.cardBg },
                ]}
                activeOpacity={0.82}
                onPress={() => navigation.navigate(card.key)}
              >
                <View style={[styles.actIconCircle, { borderColor: card.iconColor + '44' }]}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={26}
                    color={card.iconColor}
                  />
                </View>
                <Text style={styles.actTitle}>{card.title}</Text>
                <Text style={styles.actSubtitle}>{subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Verse of the Day ── */}
        <View style={styles.sectionHeader}>
          <View />
          <Text style={styles.sectionTitle}>آية اليوم</Text>
        </View>
        <View style={styles.verseCard}>
          <Text style={styles.verseText}>{dailyVerse.text}</Text>
          <Text style={styles.verseRef}>{dailyVerse.ref}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: NAVY },
  scroll: { paddingBottom: 24 },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingBlock: { alignItems: 'flex-end', marginRight: 10 },
  greetingLine: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  nameText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_DARK,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: { color: '#FFF', fontSize: 13, marginRight: 4 },
  starIcon: { marginLeft: 2 },

  /* daily badge */
  badgeRow: { paddingHorizontal: 16, marginBottom: 12, alignItems: 'flex-end' },
  activityBadge: {
    backgroundColor: '#1A4A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2A7A4A',
  },
  activityBadgeText: { color: '#4AE080', fontSize: 12, fontWeight: '600' },

  /* quiet time card */
  quietTimeCard: {
    marginHorizontal: 16,
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  qtTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  qtSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkInBtn: {
    backgroundColor: ACCENT_BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInBtnDone: { backgroundColor: '#2A7A4A' },
  checkIcon: { marginRight: 6 },
  checkInText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  /* stats */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_DARK,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statCardLeft: {
    flex: 1,
    backgroundColor: CARD_DARK,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginLeft: 0,
  },
  statValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

  /* section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', textAlign: 'right' },
  seeAll: { color: ACCENT_BLUE, fontSize: 13 },

  /* activity cards */
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  actCard: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-end',
  },
  actIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  actSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },

  /* verse of the day */
  verseCard: {
    marginHorizontal: 16,
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-end',
  },
  verseText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  verseRef: { color: ACCENT_BLUE, fontSize: 13, fontWeight: '600' },

  bottomSpacer: { height: 16 },
});

export default HomeScreen;
