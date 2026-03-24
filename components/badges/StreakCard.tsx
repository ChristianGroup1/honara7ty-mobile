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
  return (
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
              <Text style={styles.statNum}>{totalCount}</Text>
              <Text style={styles.statLabel}>متاح</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {Math.round((earnedCount / totalCount) * 100)}%
              </Text>
              <Text style={styles.statLabel}>نسبة</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default StreakCard;
