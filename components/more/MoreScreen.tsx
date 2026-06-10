import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import AppHeader from '../shared/AppHeader';
import { AppTheme, useNightMode } from '../../lib/nightMode';

const GOLD = '#78A1BD';

const MoreScreen = ({ navigation }: any) => {
  const strings = getStrings().more;
  const insets = useSafeAreaInsets();
  const { colors, isNightMode, setNightMode } = useNightMode();
  const themedStyles = useMemo(() => createStyles(colors), [colors]);
  const items = [
    {
      key: 'AboutIdea',
      icon: 'lightbulb-on-outline',
      title: strings.items.aboutIdea.title,
      subtitle: strings.items.aboutIdea.subtitle,
      color: '#D97B29',
    },
    {
      key: 'BibleMemorization',
      icon: 'brain',
      title: strings.items.bibleMemorization.title,
      subtitle: strings.items.bibleMemorization.subtitle,
      color: '#1A7A7A',
    },
    {
      key: 'Badges',
      icon: 'medal-outline',
      title: strings.items.badges.title,
      subtitle: strings.items.badges.subtitle,
      color: GOLD,
    },
    {
      key: 'DevotionCalendar',
      icon: 'calendar-check-outline',
      title: strings.items.devotionCalendar.title,
      subtitle: strings.items.devotionCalendar.subtitle,
      color: '#2E8B57',
    },
    {
      key: 'DevotionGroups',
      icon: 'account-group-outline',
      title: strings.items.devotionGroups.title,
      subtitle: strings.items.devotionGroups.subtitle,
      color: '#6D5BD0',
    },
  ];

  return (
    <SafeAreaView style={themedStyles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader topInsetHeight={insets.top} title={strings.title} />

      <ScrollView
        contentContainerStyle={themedStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={themedStyles.preferenceCard}>
          <View style={themedStyles.preferenceIcon}>
            <MaterialCommunityIcons
              name={isNightMode ? 'weather-night' : 'white-balance-sunny'}
              size={24}
              color={colors.accent}
            />
          </View>
          <View style={themedStyles.rowBody}>
            <Text style={themedStyles.rowTitle}>{strings.nightMode.title}</Text>
            <Text style={themedStyles.rowSub}>
              {strings.nightMode.subtitle}
            </Text>
          </View>
          <Switch
            value={isNightMode}
            onValueChange={setNightMode}
            trackColor={{ false: '#D0D5DD', true: `${colors.accent}66` }}
            thumbColor={isNightMode ? colors.accent : '#FFFFFF'}
            ios_backgroundColor="#D0D5DD"
          />
        </View>

        {items.map(item => (
          <TouchableOpacity
            key={item.key}
            style={themedStyles.row}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(item.key)}
          >
            <View
              style={[
                themedStyles.iconCircle,
                { backgroundColor: item.color + '22' },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={26}
                color={item.color}
              />
            </View>

            <View style={themedStyles.rowBody}>
              <Text style={themedStyles.rowTitle}>{item.title}</Text>
              <Text style={themedStyles.rowSub}>{item.subtitle}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color={colors.mutedText}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: AppTheme['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.header,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
      alignItems: 'center',
    },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 16, paddingBottom: 32 },
    preferenceCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 2,
    },
    row: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
    },
    rowBody: { flex: 1, marginHorizontal: 12, alignItems: 'flex-start' },
    rowTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'left',
    },
    rowSub: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 4,
      textAlign: 'left',
    },
    iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    preferenceIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${colors.accent}22`,
    },
  });

export default MoreScreen;
