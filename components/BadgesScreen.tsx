/**
 * BadgesScreen
 * Shows consistency badges earned by the user.
 * Reads from Supabase `reading_log` table to compute streaks.
 * Awards weekly (7 days), monthly (30 days), and yearly (365 days) badges.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F2F4F8';

interface BadgeConfig {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  days: number;
  color: string;
  shareText: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    key: 'weekly',
    icon: 'star',
    title: 'شارة الأسبوع',
    subtitle: 'قرأت الكتاب المقدس 7 أيام متواصلة',
    days: 7,
    color: '#4A90D9',
    shareText: '🌟 قرأت الكتاب المقدس 7 أيام متواصلة! #هنا_راحتي',
  },
  {
    key: 'monthly',
    icon: 'medal',
    title: 'شارة الشهر',
    subtitle: 'قرأت الكتاب المقدس 30 يوماً متواصلاً',
    days: 30,
    color: GOLD,
    shareText: '🥇 قرأت الكتاب المقدس 30 يوماً متواصلاً! #هنا_راحتي',
  },
  {
    key: 'yearly',
    icon: 'trophy',
    title: 'شارة السنة',
    subtitle: 'قرأت الكتاب المقدس 365 يوماً متواصلاً',
    days: 365,
    color: '#E84393',
    shareText: '🏆 قرأت الكتاب المقدس سنة كاملة! #هنا_راحتي',
  },
];

/** Compute the current reading streak (consecutive days up to today) */
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

const BadgesScreen = ({ navigation }: any) => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase
        .from('reading_log')
        .select('date')
        .eq('user_id', userId);
      const dates = (data ?? []).map((r: any) => r.date as string);
      setStreak(computeStreak(dates));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStreak(); }, [fetchStreak]);

  const handleShare = async (badge: BadgeConfig) => {
    try {
      await Share.share({ message: badge.shareText });
    } catch { /* user cancelled */ }
  };

  const earnedCount = BADGE_CONFIGS.filter(b => streak >= b.days).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>شارات الثبات</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Streak hero card ── */}
        <View style={styles.heroCard}>
          {/* Decorative circles */}
          <View style={styles.heroDecorTop} />
          <View style={styles.heroDecorBottom} />

          <View style={styles.heroTop}>
            <View style={styles.heroStreakBlock}>
              <MaterialCommunityIcons name="fire" size={36} color={GOLD} />
              {loading
                ? <ActivityIndicator color="#FFF" style={{ marginTop: 6 }} />
                : <Text style={styles.heroStreakNum}>{streak}</Text>}
              <Text style={styles.heroStreakLabel}>يوم متواصل</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroBadgesBlock}>
              <MaterialCommunityIcons name="shield-star" size={36} color={GOLD} />
              <Text style={styles.heroStreakNum}>{earnedCount}</Text>
              <Text style={styles.heroStreakLabel}>وسام مكتسب</Text>
            </View>
          </View>

          <View style={styles.heroProgressRow}>
            {BADGE_CONFIGS.map(b => {
              const pct = Math.min(streak / b.days, 1);
              const earned = pct >= 1;
              return (
                <View key={b.key} style={styles.miniProgressItem}>
                  <MaterialCommunityIcons
                    name={b.icon}
                    size={18}
                    color={earned ? b.color : 'rgba(255,255,255,0.4)'}
                  />
                  <View style={styles.miniProgressTrack}>
                    <View style={[styles.miniProgressFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: b.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Section title ── */}
        <Text style={styles.sectionTitle}>أوسمتك</Text>

        {/* ── Badge cards ── */}
        {BADGE_CONFIGS.map(badge => {
          const earned = streak >= badge.days;
          const progress = Math.min(streak / badge.days, 1);
          const daysLeft = badge.days - streak;

          return (
            <View
              key={badge.key}
              style={[styles.badgeCard, earned && { borderLeftWidth: 4, borderLeftColor: badge.color }]}
            >
              {/* Icon circle */}
              <View style={[
                styles.badgeIconCircle,
                { backgroundColor: earned ? badge.color + '22' : '#F0F0F0' },
              ]}>
                <MaterialCommunityIcons
                  name={badge.icon}
                  size={36}
                  color={earned ? badge.color : '#BBBBBB'}
                />
                {earned && (
                  <View style={styles.earnedTick}>
                    <MaterialCommunityIcons name="check-bold" size={10} color="#FFF" />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.badgeInfo}>
                <View style={styles.badgeTitleRow}>
                  <Text style={[styles.badgeTitle, !earned && styles.badgeTitleLocked]}>
                    {badge.title}
                  </Text>
                  {earned && (
                    <View style={[styles.earnedPill, { backgroundColor: badge.color + '22' }]}>
                      <Text style={[styles.earnedPillText, { color: badge.color }]}>مكتسب ✓</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.badgeSub}>{badge.subtitle}</Text>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[
                    styles.progressFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: earned ? badge.color : badge.color + '88' },
                  ]} />
                </View>

                {!earned && (
                  <Text style={[styles.badgeDaysLeft, { color: badge.color }]}>
                    {daysLeft > 0 ? `${daysLeft} يوم متبقٍ` : 'أكمل قراءتك اليوم!'}
                  </Text>
                )}
              </View>

              {/* Action button */}
              <View style={styles.badgeAction}>
                {earned ? (
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: badge.color }]}
                    onPress={() => handleShare(badge)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="share-variant" size={18} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockCircle}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#BBBBBB" />
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* ── Encouragement scripture card ── */}
        <View style={styles.encourageCard}>
          <View style={styles.encourageIconCircle}>
            <MaterialCommunityIcons name="book-cross" size={26} color={NAVY} />
          </View>
          <Text style={styles.encourageText}>
            «طُوبَى لِلرَّجُلِ الَّذِي لَمْ يَسْلُكْ فِي مَشُورَةِ الأَشْرَارِ»{'\n'}
            مز ١:١
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* ── Header ── */
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 18,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerPlaceholder: { width: 38 },

  /* ── Scroll content ── */
  content: { padding: 16, paddingBottom: 44 },

  /* ── Hero streak card ── */
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 22,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroDecorTop: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  heroDecorBottom: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroStreakBlock: { alignItems: 'center' },
  heroStreakNum: { color: '#FFF', fontSize: 38, fontWeight: 'bold', lineHeight: 46, marginTop: 4 },
  heroStreakLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  heroBadgesBlock: { alignItems: 'center' },
  heroDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroProgressRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 10,
  },
  miniProgressItem: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 5,
  },
  miniProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* ── Section title ── */
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 12,
  },

  /* ── Badge cards ── */
  badgeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  badgeIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  earnedTick: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2D9C5A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: { flex: 1, alignItems: 'flex-end' },
  badgeTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeTitle: { fontSize: 15, fontWeight: 'bold', color: NAVY },
  badgeTitleLocked: { color: '#AAAAAA' },
  earnedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  earnedPillText: { fontSize: 11, fontWeight: '700' },
  badgeSub: { fontSize: 12, color: '#888', textAlign: 'right', lineHeight: 18 },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#EBEBEB',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeDaysLeft: { fontSize: 11, marginTop: 5, fontWeight: '600', textAlign: 'right' },
  badgeAction: { marginRight: 12 },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Encouragement card ── */
  encourageCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderRightWidth: 4,
    borderRightColor: GOLD,
  },
  encourageIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  encourageText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    textAlign: 'right',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});

export default BadgesScreen;
