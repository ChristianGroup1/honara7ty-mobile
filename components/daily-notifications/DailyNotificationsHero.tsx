import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { dailyNotificationStyles as styles, GOLD, NAVY } from './styles';

type Props = {
  strings: any;
  timeDisplay: string;
  onEditTime: () => void;
};

const DailyNotificationsHero = ({
  strings,
  timeDisplay,
  onEditTime,
}: Props) => (
  <View style={styles.heroCard}>
    <View style={styles.heroGlow} />
    <View style={styles.heroTopRow}>
      <View style={styles.heroBadge}>
        <MaterialCommunityIcons
          name="bell-ring-outline"
          size={16}
          color={NAVY}
        />
        <Text style={styles.heroBadgeText}>{strings.badge}</Text>
      </View>
      <View style={styles.heroIconWrap}>
        <MaterialCommunityIcons name="book-heart-outline" size={24} color={GOLD} />
      </View>
    </View>

    <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
    <Text style={styles.heroSubtitle}>{strings.heroSubtitle}</Text>

    <TouchableOpacity style={styles.timePanel} onPress={onEditTime}>
      <View style={styles.timePanelIcon}>
        <MaterialCommunityIcons
          name="clock-time-four-outline"
          size={26}
          color="#FFF"
        />
      </View>
      <View style={styles.timePanelBody}>
        <Text style={styles.timeLabel}>{strings.selectedTime}</Text>
        <Text style={styles.timeText}>{timeDisplay}</Text>
      </View>
    </TouchableOpacity>
  </View>
);

export default DailyNotificationsHero;
