import React from 'react';
import { Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { dailyNotificationStyles as defaultStyles, NAVY } from './styles';

type Props = {
  strings: any;
  tips: Array<{ icon: string; text: string }>;
  styles?: typeof defaultStyles;
  iconColor?: string;
};

const DailyTipsList = ({
  strings,
  tips,
  styles = defaultStyles,
  iconColor = NAVY,
}: Props) => (
  <>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{strings.tipsTitle}</Text>
      <Text style={styles.sectionSubtitle}>{strings.tipsSubtitle}</Text>
    </View>
    {tips.map((tip, i) => (
      <View key={i} style={styles.tipCard}>
        <View style={styles.tipBody}>
          <Text style={styles.tipIndex}>0{i + 1}</Text>
          <Text style={styles.tipText}>{tip.text}</Text>
        </View>
        <View style={styles.tipIconWrap}>
          <MaterialCommunityIcons name={tip.icon} size={24} color={iconColor} />
        </View>
      </View>
    ))}
  </>
);

export default React.memo(DailyTipsList);
