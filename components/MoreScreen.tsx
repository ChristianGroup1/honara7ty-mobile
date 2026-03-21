import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

const ITEMS = [
  {
    key: 'BibleReader',
    icon: 'book-open-variant',
    title: 'قراءة الكتاب المقدس',
    subtitle: 'تصفح أسفار الكتاب المقدس',
    color: '#9A6A1A',
  },
  {
    key: 'BibleMemorization',
    icon: 'brain',
    title: 'حفظ الكتاب المقدس',
    subtitle: 'اختبر حفظك للآيات',
    color: '#1A7A7A',
  },
  {
    key: 'Badges',
    icon: 'medal-outline',
    title: 'شارات الثبات',
    subtitle: 'انظر إنجازاتك',
    color: GOLD,
  },
  {
    key: 'Testimonies',
    icon: 'share-variant-outline',
    title: 'الشهادات',
    subtitle: 'شارك ما صنعه الله',
    color: '#3A4A9A',
  },
];

const MoreScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>المزيد</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.row}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(item.key)}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color="#CCC" />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
            </View>
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
    paddingTop: Platform.OS === 'android' ? 12 : 8,
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
  rowBody: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  rowTitle: { fontSize: 16, fontWeight: 'bold', color: NAVY, textAlign: 'right' },
  rowSub: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'right' },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MoreScreen;
