import React from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

const MoreScreen = ({ navigation }: any) => {
  const strings = getStrings().more;
  const insets = useSafeAreaInsets();
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
  ];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader topInsetHeight={insets.top} title={strings.title} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {items.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.row}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(item.key)}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: item.color + '22' },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={26}
                color={item.color}
              />
            </View>

            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color="#CCC"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 32 },
  row: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  rowBody: { flex: 1, marginHorizontal: 12, alignItems: 'flex-start' },
  rowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'left',
  },
  rowSub: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'left' },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MoreScreen;
