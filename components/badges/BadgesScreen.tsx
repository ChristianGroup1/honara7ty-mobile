/**
 * BadgesScreen
 * Shows consistency badges earned by the user.
 * Reads from Supabase `devotion_log` table to compute streaks.
 * Only days answered with `completed = true` count toward the streak.
 * Awards weekly (7 days), monthly (30 days), and yearly (365 days) badges.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import BadgeCard from './BadgeCard';
import BadgesHeader from './BadgesHeader';
import { BADGE_CONFIGS, BadgeConfig, GOLD, NAVY, WEB_URL } from './constants';
import { badgesStyles as styles } from './styles';
import StreakCard from './StreakCard';
import { computeStreak } from './utils';
import { getStrings } from '../../localization';
import { refreshDevotionLogs } from '../../lib/offlineSync';

declare const navigator: any;

const BadgesScreen = ({ navigation }: any) => {
  const strings = getStrings().badges;
  const insets = useSafeAreaInsets();
  const hasLoadedStreakRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const { data } = await refreshDevotionLogs(userId);
      const dates = Object.entries(data)
        .filter(([, value]) => value.completed)
        .map(([date]) => date);
      const newStreak = computeStreak(dates);
      setStreak(newStreak);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedStreakRef.current;
      hasLoadedStreakRef.current = true;
      fetchStreak(shouldShowLoader);
    }, [fetchStreak]),
  );

  const handleShare = useCallback(
    async (badge: BadgeConfig) => {
      try {
        const webLink = `${WEB_URL}/badges/${badge.key}`;

        const message = `${badge.shareText}\n\n${strings.shareLinkPrefix}${webLink}`;

        if (Platform.OS === 'web') {
          if (navigator.share) {
            await navigator.share({
              title: strings.screen.shareTitle,
              text: message,
              url: webLink,
            });
          } else {
            Alert.alert(
              strings.screen.sharePromptTitle,
              strings.screen.copyMessagePrefix + message,
            );
          }
        } else {
          await Share.share({
            message,
            title: strings.screen.shareTitle,
            url: webLink,
          });
        }
      } catch (error: any) {
        Alert.alert(
          strings.screen.shareErrorTitle,
          strings.screen.shareErrorMessage(error.message),
        );
      }
    },
    [strings],
  );

  const earnedBadges = useMemo(
    () => BADGE_CONFIGS.filter(badge => streak >= badge.days),
    [streak],
  );
  const lockedBadges = useMemo(
    () => BADGE_CONFIGS.filter(badge => streak < badge.days),
    [streak],
  );
  const earnedCount = earnedBadges.length;
  const spotlightBadge =
    lockedBadges[0] ??
    earnedBadges[earnedBadges.length - 1] ??
    BADGE_CONFIGS[0];
  const spotlightEarned = streak >= spotlightBadge.days;
  const spotlightDaysLeft = Math.max(spotlightBadge.days - streak, 0);
  const spotlightGlowStyle = useMemo(
    () =>
      StyleSheet.compose(styles.spotlightGlow, {
        backgroundColor: `${spotlightBadge.color}22`,
      }),
    [spotlightBadge.color],
  );
  const spotlightPillStyle = useMemo(
    () =>
      StyleSheet.compose(styles.spotlightPill, {
        backgroundColor: spotlightEarned
          ? `${spotlightBadge.color}18`
          : '#EEF2F6',
      }),
    [spotlightBadge.color, spotlightEarned],
  );
  const spotlightPillTextStyle = useMemo(
    () =>
      StyleSheet.compose(
        styles.spotlightPillText,
        spotlightEarned
          ? { color: spotlightBadge.color }
          : styles.spotlightPillTextMuted,
      ),
    [spotlightBadge.color, spotlightEarned],
  );
  const spotlightIconStyle = useMemo(
    () =>
      StyleSheet.compose(styles.spotlightIconWrap, {
        backgroundColor: `${spotlightBadge.color}18`,
      }),
    [spotlightBadge.color],
  );
  const spotlightProgressStyle = useMemo(
    () =>
      StyleSheet.compose(styles.spotlightProgressFill, {
        width: `${Math.min(streak / spotlightBadge.days, 1) * 100}%`,
        backgroundColor: spotlightBadge.color,
      }),
    [spotlightBadge.color, spotlightBadge.days, streak],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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

        <View style={styles.spotlightCard}>
          <View style={spotlightGlowStyle} />
          <View style={styles.spotlightTopRow}>
            <View style={spotlightPillStyle}>
              <Text style={spotlightPillTextStyle}>
                {spotlightEarned
                  ? strings.screen.spotlightReady
                  : strings.screen.spotlightNext}
              </Text>
            </View>
            <View style={spotlightIconStyle}>
              <Text style={styles.spotlightEmoji}>{spotlightBadge.emoji}</Text>
            </View>
          </View>

          <Text style={styles.spotlightTitle}>{spotlightBadge.title}</Text>
          <Text style={styles.spotlightDays}>
            {strings.card.days(spotlightBadge.days)}
          </Text>
          <Text style={styles.spotlightText}>
            {spotlightEarned
              ? strings.screen.spotlightEarnedText
              : strings.screen.spotlightNextText(spotlightDaysLeft)}
          </Text>

          <View style={styles.spotlightProgressTrack}>
            <View style={spotlightProgressStyle} />
          </View>
        </View>

        {earnedBadges.length ? (
          <>
            <Text style={styles.gallerySectionTitle}>
              {strings.screen.earnedSection}
            </Text>
            <View style={styles.badgesContainer}>
              {earnedBadges
                .slice()
                .reverse()
                .map(badge => (
                  <BadgeCard
                    key={badge.key}
                    badge={badge}
                    streak={streak}
                    onShare={handleShare}
                  />
                ))}
            </View>
          </>
        ) : null}

        {lockedBadges.length ? (
          <>
            <Text style={styles.gallerySectionTitle}>
              {strings.screen.lockedSection}
            </Text>
            <View style={styles.badgesContainer}>
              {lockedBadges.map(badge => (
                <BadgeCard
                  key={badge.key}
                  badge={badge}
                  streak={streak}
                  onShare={handleShare}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.motivationalCard}>
          <MaterialCommunityIcons name="lightbulb" size={28} color={GOLD} />
          <View style={styles.motivationalBody}>
            <Text style={styles.motivationalTitle}>
              {strings.screen.motivationalTitle}
            </Text>
            <Text style={styles.motivationalText}>
              {strings.screen.motivationalText}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BadgesScreen;
