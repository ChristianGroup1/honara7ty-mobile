import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { badgesStyles as styles } from './styles';
import { GOLD } from './constants';

interface StreakCardProps {
  loading: boolean;
  streak: number;
  earnedCount: number;
  totalCount: number;
}

const StreakCard = ({
  loading,
  streak,
  earnedCount,
  totalCount,
}: StreakCardProps) => {
  const completionRatio = totalCount > 0 ? earnedCount / totalCount : 0;
  const completionWidth = `${completionRatio * 100}%` as `${number}%`;
  const nextMilestone = totalCount > earnedCount ? earnedCount + 1 : totalCount;

  return (
    <View style={styles.streakCard}>
      {loading ? (
        <ActivityIndicator color={GOLD} size="large" />
      ) : (
        <>
          <View style={styles.streakHeroGlow} />

          <View style={styles.streakTopRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>رحلة الثبات</Text>
            </View>
            <View style={styles.streakIconOrb}>
              <Text style={styles.streakFire}>🔥</Text>
            </View>
          </View>

          <Text style={styles.streakTitle}>الثبات يصنع الأثر</Text>
          <Text style={styles.streakSubtitle}>
            كل يوم تلتزم فيه يقرّبك من وسام جديد ويقوّي عادتك الروحية.
          </Text>

          <View style={styles.streakRow}>
            <View style={styles.streakNumberShell}>
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>
            <View style={styles.streakMetaColumn}>
              <Text style={styles.streakDays}>يوم متواصل</Text>
              <Text style={styles.streakHint}>
                {earnedCount >= totalCount
                  ? 'فتحت كل الأوسمة المتاحة'
                  : `أنت قريب من الوسام رقم ${nextMilestone}`}
              </Text>
            </View>
          </View>

          <View style={styles.streakProgressWrap}>
            <View style={styles.streakProgressHeader}>
              <Text style={styles.streakProgressLabel}>
                نسبة الأوسام المفتوحة
              </Text>
              <Text style={styles.streakProgressValue}>
                {Math.round(completionRatio * 100)}%
              </Text>
            </View>
            <View style={styles.streakProgressTrack}>
              <View
                style={[styles.streakProgressFill, { width: completionWidth }]}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{earnedCount}</Text>
              <Text style={styles.statLabel}>تم فتحه</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{totalCount}</Text>
              <Text style={styles.statLabel}>إجمالي الأوسام</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{streak > 0 ? streak : 0}</Text>
              <Text style={styles.statLabel}>أيام الثبات</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default StreakCard;
