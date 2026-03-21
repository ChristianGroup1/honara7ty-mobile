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
    icon: 'star-outline',
    title: 'شارة الأسبوع',
    subtitle: 'قرأت الكتاب المقدس 7 أيام متواصلة',
    days: 7,
    color: '#4A90D9',
    shareText: '🌟 قرأت الكتاب المقدس 7 أيام متواصلة! #هنا_راحتي',
  },
  {
    key: 'monthly',
    icon: 'medal-outline',
    title: 'شارة الشهر',
    subtitle: 'قرأت الكتاب المقدس 30 يوماً متواصلاً',
    days: 30,
    color: GOLD,
    shareText: '🥇 قرأت الكتاب المقدس 30 يوماً متواصلاً! #هنا_راحتي',
  },
  {
    key: 'yearly',
    icon: 'trophy-outline',
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>شارات الثبات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Streak counter */}
        <View style={styles.streakCard}>
          <MaterialCommunityIcons name="fire" size={48} color={GOLD} />
          {loading
            ? <ActivityIndicator color="#FFF" style={{ marginTop: 8 }} />
            : <>
                <Text style={styles.streakNum}>{streak}</Text>
                <Text style={styles.streakLabel}>يوم متواصل</Text>
              </>}
        </View>

        <Text style={styles.sectionTitle}>شاراتك</Text>

        {BADGE_CONFIGS.map(badge => {
          const earned = streak >= badge.days;
          return (
            <View
              key={badge.key}
              style={[styles.badgeCard, !earned && styles.badgeCardLocked]}
            >
              <View style={[styles.badgeIconCircle, { backgroundColor: badge.color + (earned ? '22' : '10') }]}>
                <MaterialCommunityIcons
                  name={badge.icon}
                  size={40}
                  color={earned ? badge.color : '#CCCCCC'}
                />
              </View>
              <View style={styles.badgeInfo}>
                <Text style={[styles.badgeTitle, !earned && styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeSub}>{badge.subtitle}</Text>
                {!earned && (
                  <Text style={styles.badgeDaysLeft}>
                    {badge.days - streak > 0
                      ? `${badge.days - streak} يوم متبقٍ`
                      : 'اكمل قراءتك اليوم!'}
                  </Text>
                )}
              </View>
              {earned && (
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: badge.color }]}
                  onPress={() => handleShare(badge)}
                >
                  <MaterialCommunityIcons name="share-variant" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
              {!earned && (
                <MaterialCommunityIcons name="lock-outline" size={24} color="#CCCCCC" />
              )}
            </View>
          );
        })}

        {/* Encouragement */}
        <View style={styles.encourageCard}>
          <MaterialCommunityIcons name="book-cross" size={28} color={NAVY} />
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
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  content: { padding: 16, paddingBottom: 40 },

  streakCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  streakNum: { color: '#FFF', fontSize: 52, fontWeight: 'bold', lineHeight: 60 },
  streakLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 16, marginTop: 4 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 12,
  },

  badgeCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  badgeCardLocked: { opacity: 0.65 },
  badgeIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  badgeInfo: { flex: 1, alignItems: 'flex-end' },
  badgeTitle: { fontSize: 16, fontWeight: 'bold', color: NAVY },
  badgeTitleLocked: { color: '#AAA' },
  badgeSub: { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'right' },
  badgeDaysLeft: { fontSize: 12, color: GOLD, marginTop: 4, fontWeight: '600' },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  encourageCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  encourageText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    textAlign: 'right',
    lineHeight: 24,
    marginRight: 14,
    fontStyle: 'italic',
  },
});

export default BadgesScreen;
