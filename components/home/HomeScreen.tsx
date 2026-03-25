import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../../lib/supbase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import {
  DAILY_QUESTION,
  NAVY,
  NO_MESSAGE,
  YES_MESSAGE,
} from './constants';
import DailyQuestionCard from './DailyQuestionCard';
import FeatureCard from './FeatureCard';
import HomeHeader from './HomeHeader';
import QuickActionsGrid from './QuickActionsGrid';
import { homeStyles as styles } from './styles';
import { getDisplayName, getInitials, getTodayDate } from './utils';

const HomeScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
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

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

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
  }, [userFromParams]);

  /* ── Check today's devotion answer whenever screen is focused ── */
  useFocusEffect(
    useCallback(() => {
      const checkDevotion = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) {
          return;
        }

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
    if (!userId) {
      return;
    }

    const { error } = await supabase
      .from('devotion_log')
      .upsert(
        { user_id: userId, date: getTodayDate(), completed },
        { onConflict: 'user_id,date' },
      );

    if (!error) {
      setDevotionAnswer(completed);
      if (completed) {
        showAlert('أحسنت! استمر مع الله 🙏', YES_MESSAGE, undefined, 'success');
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
              const parentNavigation = navigation.getParent?.();
              if (parentNavigation) {
                parentNavigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              } else {
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              }
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

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={NAVY}
        translucent={false}
      />
      <HomeHeader
        topInsetHeight={insets.top}
        initials={initials}
        onLogout={handleLogout}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 36 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <QuickActionsGrid navigation={navigation} />
        <DailyQuestionCard
          devotionAnswer={devotionAnswer}
          onAnswerNow={handleAnswerNow}
        />
        <FeatureCard
          title="طلبات الصلاة"
          subtitle="شارك صلواتك وطلباتك"
          icon="hands-pray"
          onPress={() => navigation.navigate('PrayerNotes')}
        />
        <FeatureCard
          title="اليوميات"
          subtitle="سجل خواطرك اليومية"
          icon="notebook-outline"
          onPress={() => navigation.navigate('SpiritualReflection')}
        />
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default HomeScreen;
