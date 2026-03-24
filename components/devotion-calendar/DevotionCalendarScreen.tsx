import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertConfig } from '../shared/CustomAlert';
import { computeStreak } from '../badges/utils';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F2F4F8';

const WEEK_DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const toIsoDate = (date: Date) => date.toISOString().split('T')[0];

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('ar-EG', {
    month: 'long',
    year: 'numeric',
  });

const buildMonthCells = (monthDate: Date, completedDates: Set<string>) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: Array<{
    key: string;
    dayNumber?: number;
    isoDate?: string;
    completed: boolean;
    today: boolean;
    empty?: boolean;
  }> = [];

  for (let i = 0; i < leadingEmpty; i++) {
    cells.push({
      key: `empty-start-${i}`,
      completed: false,
      today: false,
      empty: true,
    });
  }

  const todayIso = toIsoDate(new Date());

  for (let day = 1; day <= totalDays; day++) {
    const current = new Date(year, month, day);
    const isoDate = toIsoDate(current);
    cells.push({
      key: isoDate,
      dayNumber: day,
      isoDate,
      completed: completedDates.has(isoDate),
      today: isoDate === todayIso,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      completed: false,
      today: false,
      empty: true,
    });
  }

  return cells;
};

const DevotionCalendarScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(new Date()));
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const loadDevotionDays = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setCompletedDates([]);
        return;
      }

      const { data, error } = await supabase
        .from('devotion_log')
        .select('date')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('date', { ascending: false });

      if (error) {
        setAlertConfig({
          visible: true,
          title: 'خطأ',
          message: error.message,
          type: 'error',
        });
        return;
      }

      setCompletedDates((data ?? []).map(item => item.date as string));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDevotionDays();
    }, [loadDevotionDays]),
  );

  const completedSet = useMemo(() => new Set(completedDates), [completedDates]);
  const monthCells = useMemo(
    () => buildMonthCells(visibleMonth, completedSet),
    [visibleMonth, completedSet],
  );
  const currentStreak = useMemo(() => computeStreak(completedDates), [completedDates]);

  const monthCompletedCount = useMemo(() => {
    const prefix = getMonthKey(visibleMonth);
    return completedDates.filter(date => date.startsWith(prefix)).length;
  }, [completedDates, visibleMonth]);

  const totalCompleted = completedDates.length;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={[styles.topInset, { height: insets.top }]} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تقويم الخلوة</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons name="calendar-heart" size={24} color={NAVY} />
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>ثبات يومي</Text>
              </View>
            </View>
            <Text style={styles.heroLabel}>متابعة الخلوة</Text>
            <Text style={styles.heroTitle}>كل يوم "نعم" يترك أثرًا هنا</Text>
            <Text style={styles.heroText}>
              التقويم يوضح أيام التزامك بالخلوة، ويساعدك ترى الاستمرارية بشكل بصري وواضح.
            </Text>
            <View style={styles.heroHintRow}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={GOLD} />
              <Text style={styles.heroHintText}>الأيام الذهبية تعني أنك أكملت الخلوة في هذا اليوم</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, styles.statIconWrapPrimary]}>
                <MaterialCommunityIcons name="fire" size={18} color="#FFF" />
              </View>
              <Text style={styles.statNumber}>{currentStreak}</Text>
              <Text style={styles.statLabel}>الثبات الحالي</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, styles.statIconWrapGold]}>
                <MaterialCommunityIcons name="calendar-month" size={18} color={NAVY} />
              </View>
              <Text style={styles.statNumber}>{monthCompletedCount}</Text>
              <Text style={styles.statLabel}>هذا الشهر</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, styles.statIconWrapSoft]}>
                <MaterialCommunityIcons name="check-decagram" size={18} color={NAVY} />
              </View>
              <Text style={styles.statNumber}>{totalCompleted}</Text>
              <Text style={styles.statLabel}>الإجمالي</Text>
            </View>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>تقويم الالتزام</Text>
                <Text style={styles.sectionCaption}>تنقّل بين الشهور وشاهد الأيام المكتملة</Text>
              </View>
              <View style={styles.sectionIconWrap}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={NAVY} />
              </View>
            </View>

            <View style={styles.monthHeader}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() =>
                  setVisibleMonth(
                    current => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={NAVY} />
              </TouchableOpacity>

              <Text style={styles.monthTitle}>{getMonthLabel(visibleMonth)}</Text>

              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() =>
                  setVisibleMonth(
                    current => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={NAVY} />
              </TouchableOpacity>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendSwatchCompleted]} />
                <Text style={styles.legendText}>مكتمل</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendSwatchToday]} />
                <Text style={styles.legendText}>اليوم</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendSwatchDefault]} />
                <Text style={styles.legendText}>باقي الأيام</Text>
              </View>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map(day => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {monthCells.map(cell => (
                <View
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    cell.completed && styles.dayCellCompleted,
                    cell.today && styles.dayCellToday,
                    cell.empty && styles.dayCellEmpty,
                  ]}
                >
                  {!cell.empty ? (
                    <>
                      <Text
                        style={[
                          styles.dayText,
                          cell.completed && styles.dayTextCompleted,
                          cell.today && styles.dayTextToday,
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>
                      {cell.completed ? (
                        <View style={styles.dayMetaWrap}>
                          <View style={styles.dot} />
                        </View>
                      ) : cell.today ? (
                        <View style={styles.dayMetaWrap}>
                          <MaterialCommunityIcons name="circle-small" size={16} color={NAVY} />
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topInset: { backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 32 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF4D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 22,
  },
  heroHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  heroHintText: {
    flex: 1,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
    paddingHorizontal: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconWrapPrimary: {
    backgroundColor: NAVY,
  },
  statIconWrapGold: {
    backgroundColor: '#FFF2CD',
  },
  statIconWrapSoft: {
    backgroundColor: '#E9EEF8',
  },
  statNumber: {
    color: NAVY,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#79808A',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
    shadowColor: NAVY,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionCaption: {
    color: '#7A818B',
    fontSize: 13,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
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
    backgroundColor: 'rgba(201,168,76,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.48)',
  },
  legendSwatchToday: {
    backgroundColor: '#EEF3FF',
    borderWidth: 1.5,
    borderColor: NAVY,
  },
  legendSwatchDefault: {
    backgroundColor: '#F6F8FB',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  legendText: {
    color: '#6F7782',
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: '12.9%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#F6F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.04)',
  },
  dayCellCompleted: {
    backgroundColor: 'rgba(201,168,76,0.16)',
    borderColor: 'rgba(201,168,76,0.28)',
  },
  dayCellToday: {
    borderColor: NAVY,
    borderWidth: 1.5,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
  },
  dayTextCompleted: {
    color: NAVY,
  },
  dayTextToday: {
    fontWeight: '800',
  },
  dayMetaWrap: {
    minHeight: 12,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
});

export default DevotionCalendarScreen;
