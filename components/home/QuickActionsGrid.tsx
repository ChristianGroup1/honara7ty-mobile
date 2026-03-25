import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { homeStyles as styles } from './styles';
import { NAVY } from './constants';

interface QuickActionsGridProps {
  navigation: any;
}

const quickActions = [
  { route: 'DevotionGuide', icon: 'head-cog-outline', label: 'شرح الخلوة' },
  { route: 'DailyNotifications', icon: 'cog-outline', label: 'اعدادات الخلوة' },
  { route: 'Badges', icon: 'medal-outline', label: 'الأوسمة والجوائز' },
  { route: 'BibleMemorization', icon: 'book-open-outline', label: 'حفظ الكتاب المقدس' },
];

const QuickActionsGrid = ({ navigation }: QuickActionsGridProps) => {
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
