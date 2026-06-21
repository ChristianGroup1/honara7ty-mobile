import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createHomeStyles } from './styles';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';

interface QuickActionsGridProps {
  navigation: any;
}

const QuickActionsGrid = ({ navigation }: QuickActionsGridProps) => {
  const strings = getStrings().home;
  const { colors } = useNightMode();
  const styles = React.useMemo(() => createHomeStyles(colors), [colors]);
  const quickActions = [
    {
      route: 'DevotionGroups',
      icon: 'account-group-outline',
      label: strings.quickActions.devotionGroups,
    },
    /*{
      route: 'DevotionGuide',
      icon: 'head-cog-outline',
      label: strings.quickActions.devotionGuide,
    },*/
    {
      route: 'DailyNotifications',
      icon: 'cog-outline',
      label: strings.quickActions.settings,
    },
    {
      route: 'BibleMemorization',
      icon: 'book-open-outline',
      label: strings.quickActions.bibleMemorization,
    },
  ];

  return (
    <View style={styles.quickActionsSection}>
      <View style={styles.buttonsGrid}>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.route}
            style={styles.quickBtn}
            activeOpacity={0.82}
            onPress={() => navigation.navigate(action.route)}
          >
            <View style={styles.quickIconWrap}>
              <MaterialCommunityIcons
                name={action.icon}
                size={22}
                color={colors.text}
              />
            </View>
            <Text style={styles.quickBtnText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default React.memo(QuickActionsGrid);
