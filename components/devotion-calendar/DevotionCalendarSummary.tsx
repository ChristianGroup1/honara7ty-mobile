import React from 'react';
import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { devotionCalendarStyles as styles, GOLD, NAVY } from './styles';

type Strings = any;

type Props = {
  strings: Strings;
  currentStreak: number;
  monthCompletedCount: number;
  totalCompleted: number;
};

const DevotionCalendarSummary = ({
  strings,
  currentStreak,
  monthCompletedCount,
  totalCompleted,
}: Props) => (
  <>
    <View style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroIconWrap}>
          <MaterialCommunityIcons name="calendar-heart" size={24} color={NAVY} />
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{strings.badge}</Text>
        </View>
      </View>
      <Text style={styles.heroLabel}>{strings.heroLabel}</Text>
      <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
      <Text style={styles.heroText}>{strings.heroText}</Text>
      <View style={styles.heroHintRow}>
        <MaterialCommunityIcons name="star-four-points" size={16} color={GOLD} />
        <Text style={styles.heroHintText}>{strings.heroHint}</Text>
      </View>
    </View>

    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={[styles.statIconWrap, styles.statIconWrapPrimary]}>
          <MaterialCommunityIcons name="fire" size={18} color="#FFF" />
        </View>
        <Text style={styles.statNumber}>{currentStreak}</Text>
        <Text style={styles.statLabel}>{strings.currentStreak}</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIconWrap, styles.statIconWrapGold]}>
          <MaterialCommunityIcons name="calendar-month" size={18} color={NAVY} />
        </View>
        <Text style={styles.statNumber}>{monthCompletedCount}</Text>
        <Text style={styles.statLabel}>{strings.thisMonth}</Text>
      </View>
      <View style={styles.statCard}>
        <View style={[styles.statIconWrap, styles.statIconWrapSoft]}>
          <MaterialCommunityIcons name="check-decagram" size={18} color={NAVY} />
        </View>
        <Text style={styles.statNumber}>{totalCompleted}</Text>
        <Text style={styles.statLabel}>{strings.total}</Text>
      </View>
    </View>
  </>
);

export default DevotionCalendarSummary;
