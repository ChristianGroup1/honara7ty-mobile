/**
 * BadgesScreen
 * Shows consistency badges earned by the user.
 * Reads from Supabase `reading_log` table to compute streaks.
 * Awards weekly (7 days), monthly (30 days), and yearly (365 days) badges.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';

// Add this for TypeScript to recognize navigator in web
declare const navigator: any;

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F2F4F8';

interface BadgeConfig {
  key: string;
  icon: string;
  title: string;
  days: number;
  color: string;
  shareText: string;
  emoji: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    key: 'weekly',
    icon: 'star',
    title: 'أسبوع',
    days: 7,
    color: '#4A90D9',
    emoji: '⭐',
    shareText:
      'لقد أكملت 7️⃣ أيام متواصلة من قراءة الكتاب المقدس! 🙏\n\nأنا أستخدم تطبيق "هنا راحتي" لمساعدتي على البقاء ثابتاً في وقتي مع الله.\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'biweekly',
    icon: 'calendar-check',
    title: 'أسبوعان',
    days: 14,
    color: '#00BCD4',
    emoji: '📅',
    shareText:
      'لقد أكملت 1️⃣4️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! 🎉\n\nشكراً لتطبيق "هنا راحتي" على مساعدتي في هذه الرحلة الروحية.\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'monthly',
    icon: 'medal',
    title: 'شهر',
    days: 30,
    color: GOLD,
    emoji: '🥇',
    shareText:
      'لقد أكملت شهراً كاملاً (3️⃣0️⃣ يوماً) من قراءة الكتاب المقدس! 🏆\n\nهذا إنجاز عظيم لي في رحلتي الروحية. شكراً "هنا راحتي"!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'twomonths',
    icon: 'lightning-bolt',
    title: '60 يوم',
    days: 60,
    color: '#FF6B6B',
    emoji: '⚡',
    shareText:
      'لقد أكملت 6️⃣0️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! ⚡\n\nالثبات والاستقامة في وقتي مع الله هو هدفي، وأنا أحقق هذا الحلم!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'quarterly',
    icon: 'crown',
    title: '3 أشهر',
    days: 90,
    color: '#9C27B0',
    emoji: '👑',
    shareText:
      'لقد أكملت 9️⃣0️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! 👑\n\nثلاثة أشهر من الثبات والقرب من الله. الحمد لله على هذه الرحمة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'halfyear',
    icon: 'heart',
    title: '6 أشهر',
    days: 180,
    color: '#E91E63',
    emoji: '❤️',
    shareText:
      'لقد أكملت 1️⃣8️⃣0️⃣ يوماً متواصلاً من قراءة الكتاب المقدس! ❤️\n\nستة أشهر من الثبات والإيمان. شكراً لكل من يدعمني في هذه الرحلة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'yearly',
    icon: 'trophy',
    title: 'سنة',
    days: 365,
    color: '#E84393',
    emoji: '🏆',
    shareText:
      'لقد أكملت سنة كاملة (3️⃣6️⃣5️⃣ يوماً) من قراءة الكتاب المقدس! 🏆\n\nهذا إنجاز كبير في حياتي الروحية. الحمد لله على الثبات والقوة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
  {
    key: 'dedication',
    icon: 'book-heart',
    title: 'سنتان',
    days: 730,
    color: '#4CAF50',
    emoji: '🎖️',
    shareText:
      'لقد أكملت سنتين كاملتين (7️⃣3️⃣0️⃣ يوماً) من قراءة الكتاب المقدس! 🎖️\n\nتفاني مستمر في العلاقة مع الله. الحمد لله على هذه الرحمة العظيمة!\n\n#هنا_راحتي #الثبات #الكتاب_المقدس',
  },
];

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
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
    } else if (d < expected) break;
  }
  return streak;
}

const APP_SCHEME = 'hanaraahti://';
const WEB_URL = 'https://hanaraahti.app';

const BadgesScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('reading_log')
        .select('date')
        .eq('user_id', userId);
      const dates = (data ?? []).map((r: any) => r.date as string);
      const newStreak = computeStreak(dates);
      setStreak(newStreak);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const handleShare = async (badge: BadgeConfig) => {
    try {
      // Deep link URL
      const deepLink = `${APP_SCHEME}badges/${badge.key}`;
      const webLink = `${WEB_URL}/badges/${badge.key}`;

      const message = `${badge.shareText}\n\n📲 حمّل التطبيق: ${webLink}`;

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'هنا راحتي - الإنجازات',
            text: message,
            url: webLink,
          });
        } else {
          Alert.alert('مشاركة', 'انسخ النص التالي:\n\n' + message);
        }
      } else {
        await Share.share({
          message,
          title: 'هنا راحتي - الإنجازات',
          url: webLink,
        });
      }
    } catch (error: any) {
      Alert.alert('خطأ', 'فشلت المشاركة: ' + error.message);
    }
  };

  const handleShareAll = async () => {
    const earnedBadges = BADGE_CONFIGS.filter(b => streak >= b.days);
    if (earnedBadges.length === 0) {
      Alert.alert('معلومة', 'لم تحقق أي إنجازات بعد. استمر في السير! 💪');
      return;
    }

    const badgesList = earnedBadges
      .map(b => `${b.emoji} ${b.title}`)
      .join('\n');

    const webLink = `${WEB_URL}/badges`;

    const fullMessage = `🎉 إنجازاتي في تطبيق "هنا راحتي"\n\n${badgesList}\n\nالثبات: ${streak} يوم متواصل 🔥\n\nانضم إلي في رحلة القراءة والثبات!\n\n📲 حمّل التطبيق: ${webLink}\n\n#هنا_راحتي #الثبات #الكتاب_المقدس`;

    try {
      await Share.share({
        message: fullMessage,
        title: 'هنا راحتي - إنجازاتي',
        url: webLink,
      });
    } catch (error: any) {
      Alert.alert('خطأ', 'فشلت المشاركة: ' + error.message);
    }
  };

  const earnedCount = BADGE_CONFIGS.filter(b => streak >= b.days).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={{ height: insets.top, backgroundColor: NAVY }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإنجازات</Text>
        {/* <TouchableOpacity
          onPress={handleShareAll}
          style={styles.shareHeaderBtn}
        >
          <MaterialCommunityIcons name="share-variant" size={22} color="#FFF" />
        </TouchableOpacity> */}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Hero - Minimal & Clean */}
        <View style={styles.streakCard}>
          {loading ? (
            <ActivityIndicator color={GOLD} size="large" />
          ) : (
            <>
              <Text style={styles.streakLabel}>الثبات الحالي</Text>
              <View style={styles.streakRow}>
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakNumber}>{streak}</Text>
              </View>
              <Text style={styles.streakDays}>يوم متواصل</Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{earnedCount}</Text>
                  <Text style={styles.statLabel}>أوسام</Text>
                </View>
                <View style={styles.statDot} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{BADGE_CONFIGS.length}</Text>
                  <Text style={styles.statLabel}>متاح</Text>
                </View>
                <View style={styles.statDot} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>
                    {Math.round((earnedCount / BADGE_CONFIGS.length) * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>نسبة</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Badges Grid - Modern Card Style */}
        {/* <Text style={styles.sectionLabel}>أوسمتك</Text> */}

        <View style={styles.badgesContainer}>
          {BADGE_CONFIGS.map(badge => {
            const earned = streak >= badge.days;
            const progress = Math.min(streak / badge.days, 1);
            const daysLeft = badge.days - streak;

            return (
              <View
                key={badge.key}
                style={[
                  styles.badgeCard,
                  earned && styles.badgeCardEarned,
                  { borderTopColor: badge.color },
                ]}
              >
                {/* Badge Ring Background */}
                <View style={styles.badgeRingBg}>
                  <View
                    style={[
                      styles.badgeRing,
                      {
                        backgroundColor: earned
                          ? `${badge.color}20`
                          : '#f0f0f0',
                      },
                    ]}
                  >
                    {earned ? (
                      <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    ) : (
                      <MaterialCommunityIcons
                        name={badge.icon}
                        size={32}
                        color="#ccc"
                      />
                    )}
                  </View>
                  {earned && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: badge.color },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color="#fff"
                      />
                    </View>
                  )}
                </View>

                {/* Badge Info */}
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeDays}>{badge.days} أيام</Text>

                {/* Progress Bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: badge.color,
                      },
                    ]}
                  />
                </View>

                {/* Status */}
                {earned ? (
                  <TouchableOpacity
                    style={[
                      styles.earnedTag,
                      { backgroundColor: `${badge.color}15` },
                    ]}
                    onPress={() => handleShare(badge)}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={12}
                      color={badge.color}
                    />
                    <Text style={[styles.earnedText, { color: badge.color }]}>
                      شارك
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.pendingText}>{daysLeft} يوم متبقي</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Motivational Section */}
        <View style={styles.motivationalCard}>
          <MaterialCommunityIcons name="lightbulb" size={28} color={GOLD} />
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.motivationalTitle}>استمر في السير</Text>
            <Text style={styles.motivationalText}>
              كل يوم خطوة نحو الثبات والقرب من الله. شارك إنجازاتك مع أصدقائك!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginLeft: 20,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 20,
  },

  /* Streak Card */
  streakCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 32,
    alignItems: 'center',
    borderTopWidth: 4,
    borderTopColor: GOLD,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  streakLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  streakFire: {
    fontSize: 40,
    marginHorizontal: 12,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: NAVY,
  },
  streakDays: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '700',
    color: GOLD,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },

  /* Section */
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 16,
  },

  /* Badges Container */
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  badgeCardEarned: {
    elevation: 3,
    shadowColor: GOLD,
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  badgeRingBg: {
    position: 'relative',
    marginBottom: 10,
  },
  badgeRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 38,
  },
  checkmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDays: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  earnedTag: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
  },
  earnedText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  /* ── Motivational Card ── */
  motivationalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 12,
  },
  motivationalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  motivationalText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default BadgesScreen;
