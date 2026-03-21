import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F2F4F8';

const DAILY_QUESTION = 'هل أخذت خلوتك اليوم؟';

/** Message shown when the user answers YES — encouraging them to keep going with God */
const YES_MESSAGE =
  'رائع! 🎉 ثابر على هذا الوقت الثمين مع الله يومياً\n"أَقِيمُوا فِيَّ وَأَنَا فِيكُمْ" يوحنا ١٥:٤';

/** Message shown when the user answers NO — motivating them to take their devotion time */
const NO_MESSAGE =
  'لا بأس 💙 لا يزال الوقت أمامك اليوم\nحتى ١٠ دقائق هادئة مع الله تغيّر يومك بالكامل';

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HomeScreen = ({ route, navigation }: any) => {
  const userFromParams = route?.params?.user;
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);
  /** null = not yet answered today, true = answered yes, false = answered no */
  const [devotionAnswer, setDevotionAnswer] = useState<boolean | null>(null);
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
    type: 'error' | 'warning' | 'success' | 'info' = 'info',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  /* ── Load user once ── */
  useEffect(() => {
    if (!userFromParams) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          setUser(data.session.user);
        }
        setLoading(false);
      });
    }
  }, []);

  /* ── Check today's devotion answer whenever screen is focused ── */
  useFocusEffect(
    useCallback(() => {
      const checkDevotion = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) { return; }

        const { data } = await supabase
          .from('devotion_log')
          .select('completed')
          .eq('user_id', userId)
          .eq('date', getTodayDate())
          .maybeSingle();

        setDevotionAnswer(data ? (data.completed as boolean) : null);
      };
      checkDevotion();
    }, []),
  );

  /* ── Save devotion answer + show smart response ── */
  const handleDevotionAnswer = async (completed: boolean) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { return; }

    const { error } = await supabase
      .from('devotion_log')
      .upsert(
        { user_id: userId, date: getTodayDate(), completed },
        { onConflict: 'user_id,date' },
      );

    if (!error) {
      setDevotionAnswer(completed);
      if (completed) {
        showAlert(
          'أحسنت! استمر مع الله 🙏',
          YES_MESSAGE,
          undefined,
          'success',
        );
      } else {
        showAlert(
          'لا بأس، الله ينتظرك 💙',
          NO_MESSAGE,
          [
            {
              text: 'ابدأ خلوتي الآن',
              style: 'default',
              onPress: () => navigation.navigate('SpiritualReflection'),
            },
            { text: 'لاحقاً', style: 'cancel' },
          ],
          'info',
        );
      }
    }
  };

  /* ── Logout ── */
  const handleLogout = () => {
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
            } catch (err: any) {
              showAlert('خطأ', err.message, undefined, 'error');
            }
          },
        },
      ],
      'warning',
    );
  };

  /* ── Show question dialog ── */
  const handleAnswerNow = () => {
    showAlert(
      DAILY_QUESTION,
      'قضيت وقتاً مع الله اليوم؟',
      [
        {
          text: 'نعم ✓',
          style: 'default',
          onPress: () => handleDevotionAnswer(true),
        },
        {
          text: 'لا ✗',
          style: 'destructive',
          onPress: () => handleDevotionAnswer(false),
        },
      ],
      'info',
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

  const initials = displayName
    .split(' ')
    .filter((w: string) => w.length > 0)
    .slice(0, 2)
    .map((w: string) => w[0] ?? '')
    .join('')
    .toUpperCase() || '🙏';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>مرحباً يا بطل 👋</Text>
          <Text style={styles.subGreeting}>جاهز لوقتك مع الله النهاردة؟</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 4 Quick-Action Buttons ─── */}
        <View style={styles.buttonsGrid}>
          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('DevotionGuide')}
          >
            <MaterialCommunityIcons name="head-cog-outline" size={26} color={NAVY} />
            <Text style={styles.quickBtnText}>شرح الخلوة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('DailyNotifications')}
          >
            <MaterialCommunityIcons name="cog-outline" size={26} color={NAVY} />
            <Text style={styles.quickBtnText}>اعدادات الخلوة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Badges')}
          >
            <MaterialCommunityIcons name="medal-outline" size={26} color={NAVY} />
            <Text style={styles.quickBtnText}>الأوسمة والجوائز</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BibleMemorization')}
          >
            <MaterialCommunityIcons name="book-open-outline" size={26} color={NAVY} />
            <Text style={styles.quickBtnText}>حفظ الكتاب المقدس</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Daily Question Card ─── */}
        <View style={styles.questionCard}>
          {/* decorative circle */}
          <View style={styles.questionDecor} />

          <Text style={styles.questionCardLabel}>سؤال اليوم المتغير</Text>
          <Text style={styles.questionText}>{DAILY_QUESTION}</Text>

          {devotionAnswer === null ? (
            <TouchableOpacity
              style={styles.answerBtn}
              activeOpacity={0.85}
              onPress={handleAnswerNow}
            >
              <Text style={styles.answerBtnText}>جاوب الآن</Text>
            </TouchableOpacity>
          ) : devotionAnswer ? (
            <View style={styles.answeredYesCard}>
              <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
              <Text style={styles.answeredYesText}>أجبت بنعم اليوم 🎉 بارك الله خلوتك!</Text>
            </View>
          ) : (
            <View style={styles.answeredNoCard}>
              <MaterialCommunityIcons name="clock-alert-outline" size={22} color="#fff" />
              <Text style={styles.answeredNoText}>لم تأخذ خلوتك بعد — لا يزال الوقت أمامك 💙</Text>
            </View>
          )}
        </View>

        {/* ─── Prayer Notes Card ─── */}
        <TouchableOpacity
          style={styles.featureCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PrayerNotes')}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color="#CCC" />
          <View style={styles.featureCardBody}>
            <Text style={styles.featureCardTitle}>طلبات الصلاة</Text>
            <Text style={styles.featureCardSub}>شارك صلواتك وطلباتك</Text>
          </View>
          <View style={styles.featureIconCircle}>
            <MaterialCommunityIcons name="hands-pray" size={26} color={NAVY} />
          </View>
        </TouchableOpacity>

        {/* ─── Journal / Reflections Card ─── */}
        <TouchableOpacity
          style={styles.featureCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SpiritualReflection')}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color="#CCC" />
          <View style={styles.featureCardBody}>
            <Text style={styles.featureCardTitle}>اليوميات</Text>
            <Text style={styles.featureCardSub}>سجل خواطرك اليومية</Text>
          </View>
          <View style={styles.featureIconCircle}>
            <MaterialCommunityIcons name="notebook-outline" size={26} color={NAVY} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ── Header ── */
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 9,
    borderRadius: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  greeting: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subGreeting: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: NAVY, fontSize: 16, fontWeight: 'bold' },

  /* ── Scroll content ── */
  scrollContent: { padding: 16, paddingBottom: 36 },

  /* ── 4-button grid ── */
  buttonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  quickBtn: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'right',
  },

  /* ── Daily question card ── */
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  questionDecor: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(10,17,36,0.06)',
  },
  questionCardLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 18,
    lineHeight: 24,
  },
  answerBtn: {
    backgroundColor: NAVY,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  answerBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  answeredYesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2D9C5A',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  answeredYesText: { color: '#FFF', fontSize: 13, fontWeight: '600', textAlign: 'center', flex: 1 },
  answeredNoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E67E22',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  answeredNoText: { color: '#FFF', fontSize: 13, fontWeight: '600', textAlign: 'center', flex: 1 },

  /* ── Feature cards (prayer / journal) ── */
  featureCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  featureCardBody: { flex: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
  },
  featureCardSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  featureIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(10,17,36,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
