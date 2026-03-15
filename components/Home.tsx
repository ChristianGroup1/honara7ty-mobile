import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

const FEATURES = [
  {
    key: 'DailyNotifications',
    icon: 'bell-outline',
    title: 'تنبيهات يومية',
    subtitle: 'اختر وقت تعبّدك',
    color: '#1A6B9A',
  },
  {
    key: 'PrayerNotes',
    icon: 'hands-pray',
    title: 'ملاحظات الصلاة',
    subtitle: 'سجّل طلبات الصلاة',
    color: '#4A7A3A',
  },
  {
    key: 'SpiritualReflection',
    icon: 'notebook-heart-outline',
    title: 'التأمل الروحي',
    subtitle: 'ماذا كلّمك الله؟',
    color: '#7A4A9A',
  },
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
    color: '#9A3A3A',
  },
  {
    key: 'Testimonies',
    icon: 'share-variant-outline',
    title: 'الشهادات',
    subtitle: 'شارك ما صنعه الله',
    color: '#3A4A9A',
  },
];

const HomeScreen = ({ route, navigation }: any) => {
  const userFromParams = route?.params?.user;
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    if (!userFromParams) {
      const loadUser = async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
        }
        setLoading(false);
      };
      loadUser();
    }
  }, []);

  const handleLogout = async () => {
    showAlert(
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await GoogleSignin.signOut();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (error: any) {
              showAlert('خطأ', error.message);
            }
          },
        },
      ],
      'warning',
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'مستخدم';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>مرحباً 👋</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ─── Feature Grid ─── */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>تعبّدك اليومي</Text>
        <View style={styles.row}>
          {FEATURES.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.card, { borderTopColor: f.color }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(f.key)}
            >
              <View style={[styles.iconCircle, { backgroundColor: f.color + '22' }]}>
                <MaterialCommunityIcons name={f.icon} size={30} color={f.color} />
              </View>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardSub}>{f.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* header */
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  name: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    borderRadius: 20,
  },

  /* grid */
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NAVY,
    marginBottom: 16,
    textAlign: 'right',
  },
  grid: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  /* card */
  card: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    alignItems: 'flex-end',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
  },
  cardSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
});

export default HomeScreen;
