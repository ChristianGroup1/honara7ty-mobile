import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { dailyNotificationStyles as styles, GOLD, NAVY } from './styles';
import HeroBackground from '../shared/HeroBackground';

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
    <HeroBackground />
    <View style={styles.heroTopRow}>
      <View style={styles.heroIconWrap}>
        <MaterialCommunityIcons
          name="calendar-check"
          size={24}
          color={'#fff'}
        />
      </View>
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>{strings.badge}</Text>
      </View>
    </View>

    <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
    <Text style={styles.heroSubtitle}>{strings.heroSubtitle}</Text>
  </View>
);

export default React.memo(DailyNotificationsHero);
