import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { homeStyles as styles } from './styles';
import { NAVY } from './constants';
import { getStrings } from '../../localization';

interface QuickActionsGridProps {
  navigation: any;
}

const QuickActionsGrid = ({ navigation }: QuickActionsGridProps) => {
  const strings = getStrings().home;
  const quickActions = [
    {
      route: 'DevotionGuide',
      icon: 'head-cog-outline',
      label: strings.quickActions.devotionGuide,
    },
    {
      route: 'DailyNotifications',
      icon: 'cog-outline',
      label: strings.quickActions.settings,
    },
    {
      route: 'Badges',
      icon: 'medal-outline',
      label: strings.quickActions.badges,
    },
    {
      route: 'BibleMemorization',
      icon: 'book-open-outline',
      label: strings.quickActions.bibleMemorization,
    },
  ];

  return (
    <View style={styles.buttonsGrid}>
      {quickActions.map(action => (
        <TouchableOpacity
          key={action.route}
          style={styles.quickBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(action.route)}
        >
          <MaterialCommunityIcons name={action.icon} size={26} color={NAVY} />
          <Text style={styles.quickBtnText}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default QuickActionsGrid;
