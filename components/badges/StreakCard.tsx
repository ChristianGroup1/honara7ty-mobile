import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { badgesStyles as styles } from './styles';
import { GOLD } from './constants';
import { getStrings } from '../../localization';
import HeroBackground from '../shared/HeroBackground';

interface StreakCardProps {
  loading: boolean;
  streak: number;
  earnedCount: number;
  totalCount: number;
  xp: number;
}

const StreakCard = ({
  loading,
  streak,
  earnedCount,
  totalCount,
  xp,
}: StreakCardProps) => {
  const strings = getStrings().badges;
  const nextMilestone = totalCount > earnedCount ? earnedCount + 1 : totalCount;

  return (
    <View style={styles.streakCard}>
      {loading ? (
        <ActivityIndicator color={GOLD} size="large" />
      ) : (
        <>
          <HeroBackground />

          <View style={styles.streakTopRow}>
            <View style={styles.streakIconOrb}>
              <Text style={styles.streakFire}>🔥</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{strings.streak.badge}</Text>
            </View>
          </View>

          <Text style={styles.streakTitle}>{strings.streak.title}</Text>
          <Text style={styles.streakSubtitle}>{strings.streak.subtitle}</Text>

          <View style={styles.streakScorePanel}>
            <View style={styles.xpBlock}>
              <Text style={styles.xpLabel}>{strings.streak.xp}</Text>
              <Text style={styles.xpNumber}>{xp.toLocaleString('en-US')}</Text>
              <Text style={styles.streakHint}>
                {earnedCount >= totalCount
                  ? strings.streak.allUnlocked
                  : strings.streak.nextMilestone(nextMilestone)}
              </Text>
            </View>
            <View style={styles.streakNumberShell}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakDays}>
                {strings.streak.daysContinuous}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{earnedCount}</Text>
              <Text style={styles.statLabel}>{strings.streak.opened}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{totalCount}</Text>
              <Text style={styles.statLabel}>{strings.streak.total}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{streak > 0 ? streak : 0}</Text>
              <Text style={styles.statLabel}>{strings.streak.streakDays}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default React.memo(StreakCard);
