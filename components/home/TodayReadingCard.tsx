import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createHomeStyles } from './styles';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';

interface TodayReadingCardProps {
  readingLabel: string;
  isFirstReading?: boolean;
  onPress: () => void;
}

const TodayReadingCard = ({
  readingLabel,
  isFirstReading = false,
  onPress,
}: TodayReadingCardProps) => {
  const strings = getStrings().home;
  const { colors } = useNightMode();
  const styles = React.useMemo(() => createHomeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.todayReadingCard}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={styles.todayReadingIconWrap}>
        <MaterialCommunityIcons
          name="book-open-page-variant-outline"
          size={24}
          color={colors.accent}
        />
      </View>

      <View style={styles.todayReadingBody}>
        <Text style={styles.todayReadingEyebrow}>
          {strings.todayReadingEyebrow}
        </Text>
        <Text style={styles.todayReadingTitle}>
          {strings.todayReadingTitle(readingLabel)}
        </Text>
        <Text style={styles.todayReadingSubtitle}>
          {isFirstReading
            ? strings.todayReadingFirstTime
            : strings.todayReadingSubtitle}
        </Text>
      </View>

      <View style={styles.todayReadingAction}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={20}
          color={colors.accent}
        />
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(TodayReadingCard);
