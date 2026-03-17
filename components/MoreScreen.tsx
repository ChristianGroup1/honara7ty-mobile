import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const NAVY = '#0A1124';
const CARD_DARK = '#152040';
const GOLD = '#C9A84C';

const MORE_ITEMS = [
  {
    key: 'BibleReader',
    icon: 'book-open-page-variant',
    title: 'قراءة الكتاب المقدس',
    subtitle: 'تصفح أسفار الكتاب المقدس',
    color: '#5BB8F5',
  },
  {
    key: 'DailyNotifications',
    icon: 'bell-ring-outline',
    title: 'إعدادات الخلوة',
    subtitle: 'اختر وقت تعبّدك اليومي',
    color: GOLD,
  },
  {
    key: 'Testimonies',
    icon: 'share-variant-outline',
    title: 'الشهادات',
    subtitle: 'شارك ما صنعه الله في حياتك',
    color: '#F55B5B',
  },
];

const MoreScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>المزيد</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {MORE_ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.row, { width: width - 32 }]}
            activeOpacity={0.82}
            onPress={() => navigation.navigate(item.key)}
          >
            <View style={styles.rowRight}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  scroll: { padding: 16, gap: 12 },
  row: {
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: { flex: 1, alignItems: 'flex-end', marginLeft: 12 },
  rowTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'right' },
  rowSubtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, textAlign: 'right' },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MoreScreen;
