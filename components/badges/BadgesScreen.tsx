/**
 * BadgesScreen
 * Shows consistency badges earned by the user.
 * Reads from Supabase `devotion_log` table to compute streaks.
 * Only days answered with `completed = true` count toward the streak.
 * Awards weekly (7 days), monthly (30 days), and yearly (365 days) badges.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import BadgeCard from './BadgeCard';
import BadgesHeader from './BadgesHeader';
import {
  BADGE_CONFIGS,
  BadgeConfig,
  GOLD,
  NAVY,
  WEB_URL,
} from './constants';
import { badgesStyles as styles } from './styles';
import StreakCard from './StreakCard';
import { computeStreak } from './utils';

declare const navigator: any;

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
        .from('devotion_log')
        .select('date')
        .eq('user_id', userId)
        .eq('completed', true);
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

  const earnedCount = BADGE_CONFIGS.filter(b => streak >= b.days).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <BadgesHeader
        topInsetHeight={insets.top}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Hero - Minimal & Clean */}
        <StreakCard
          loading={loading}
          streak={streak}
          earnedCount={earnedCount}
          totalCount={BADGE_CONFIGS.length}
        />

        <View style={styles.badgesContainer}>
          {BADGE_CONFIGS.map(badge => (
            <BadgeCard
              key={badge.key}
              badge={badge}
              streak={streak}
              onShare={handleShare}
            />
          ))}
        </View>

        <View style={styles.motivationalCard}>
          <MaterialCommunityIcons name="lightbulb" size={28} color={GOLD} />
          <View style={styles.motivationalBody}>
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

export default BadgesScreen;
