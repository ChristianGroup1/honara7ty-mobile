import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../../lib/supbase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import {
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
import { getStrings } from '../../localization';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
} from '../data/bibleMetadata';

const HomeScreen = ({ route, navigation }: any) => {
  const strings = getStrings().home;
  const insets = useSafeAreaInsets();
  const userFromParams = route?.params?.user;
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);
  /** null = not yet answered today, true = answered yes, false = answered no */
  const [devotionAnswer, setDevotionAnswer] = useState<boolean | null>(null);
  const [answerSheetVisible, setAnswerSheetVisible] = useState(false);
  const [pendingCompleted, setPendingCompleted] = useState(true);
  const [readingBook, setReadingBook] = useState(BIBLE_BOOKS[0].bookName);
  const [readingChapter, setReadingChapter] = useState(1);
  const [chaptersRead, setChaptersRead] = useState(1);
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
          .select('completed, reading_book, reading_chapter, chapters_read')
          .eq('user_id', userId)
          .eq('date', getTodayDate())
          .maybeSingle();

        setDevotionAnswer(data ? (data.completed as boolean) : null);
        if (data?.reading_book) {
          setReadingBook(data.reading_book);
        }
        if (data?.reading_chapter) {
          setReadingChapter(Math.max(1, Number(data.reading_chapter)));
        }
        if (data?.chapters_read) {
          setChaptersRead(Math.max(1, Number(data.chapters_read)));
        }
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
        {
          user_id: userId,
          date: getTodayDate(),
          completed,
          reading_book: readingBook,
          reading_chapter: readingChapter,
          chapters_read: chaptersRead,
        },
        { onConflict: 'user_id,date' },
      );

    if (!error) {
      setDevotionAnswer(completed);
      if (completed) {
        showAlert(strings.correctStreakTitle, YES_MESSAGE, undefined, 'success');
      } else {
        showAlert(
          strings.startNowTitle,
          NO_MESSAGE,
          [
            {
              text: strings.startNowAction,
              style: 'default',
              onPress: () => navigation.navigate('SpiritualReflection'),
            },
            { text: strings.later, style: 'cancel' },
          ],
          'info',
        );
      }
    }
  };

  /* ── Logout ── */
  const handleLogout = () => {
    showAlert(
      strings.logoutTitle,
      strings.logoutMessage,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.logout,
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
    setPendingCompleted(devotionAnswer ?? true);
    setAnswerSheetVisible(true);
  };

  const selectedBook =
    BIBLE_BOOKS.find(book => book.bookName === readingBook) ?? BIBLE_BOOKS[0];
  const chapterOptions = Array.from(
    { length: selectedBook.chapters },
    (_, idx) => idx + 1,
  );

  useEffect(() => {
    if (readingChapter > selectedBook.chapters) {
      setReadingChapter(selectedBook.chapters);
    }
  }, [readingChapter, selectedBook.chapters]);

  const saveDevotionSheet = async () => {
    setAnswerSheetVisible(false);
    await handleDevotionAnswer(pendingCompleted);
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
          onEditAnswer={handleAnswerNow}
        />
        <FeatureCard
          title={strings.featurePrayerNotesTitle}
          subtitle={strings.featurePrayerNotesSubtitle}
          icon="hands-pray"
          onPress={() => navigation.navigate('PrayerNotes')}
        />
        <FeatureCard
          title={strings.featureReflectionTitle}
          subtitle={strings.featureReflectionSubtitle}
          icon="notebook-outline"
          onPress={() => navigation.navigate('SpiritualReflection')}
        />
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
      <Modal
        visible={answerSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAnswerSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.answerSheet}>
            <Text style={styles.answerSheetTitle}>{strings.answerSheetTitle}</Text>
            <Text style={styles.answerSheetSubtitle}>
              {strings.answerSheetSubtitle}
            </Text>

            <View style={styles.answerBinaryRow}>
              <TouchableOpacity
                style={[
                  styles.answerBinaryBtn,
                  pendingCompleted && styles.answerBinaryBtnSelected,
                ]}
                onPress={() => setPendingCompleted(true)}
              >
                <Text
                  style={[
                    styles.answerBinaryText,
                    pendingCompleted && styles.answerBinaryTextSelected,
                  ]}
                >
                  {strings.yes}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.answerBinaryBtn,
                  !pendingCompleted && styles.answerBinaryBtnSelected,
                ]}
                onPress={() => setPendingCompleted(false)}
              >
                <Text
                  style={[
                    styles.answerBinaryText,
                    !pendingCompleted && styles.answerBinaryTextSelected,
                  ]}
                >
                  {strings.no}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.answerFieldTitle}>{strings.answerBook}</Text>
            <Text style={styles.answerGroupLabel}>العهد القديم</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.answerChoiceRow}
            >
              {OLD_TESTAMENT_BOOKS.map(book => (
                <TouchableOpacity
                  key={book.bookID}
                  style={[
                    styles.answerChoiceChip,
                    readingBook === book.bookName && styles.answerChoiceChipSelected,
                  ]}
                  onPress={() => setReadingBook(book.bookName)}
                >
                  <Text
                    style={[
                      styles.answerChoiceText,
                      readingBook === book.bookName &&
                        styles.answerChoiceTextSelected,
                    ]}
                  >
                    {book.bookName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.answerGroupLabel}>العهد الجديد</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.answerChoiceRow}
            >
              {NEW_TESTAMENT_BOOKS.map(book => (
                <TouchableOpacity
                  key={book.bookID}
                  style={[
                    styles.answerChoiceChip,
                    readingBook === book.bookName && styles.answerChoiceChipSelected,
                  ]}
                  onPress={() => setReadingBook(book.bookName)}
                >
                  <Text
                    style={[
                      styles.answerChoiceText,
                      readingBook === book.bookName &&
                        styles.answerChoiceTextSelected,
                    ]}
                  >
                    {book.bookName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.answerFieldTitle}>{strings.answerChapter}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.answerChoiceRow}
            >
              {chapterOptions.map(chapter => (
                <TouchableOpacity
                  key={`chapter-${chapter}`}
                  style={[
                    styles.answerChoiceChip,
                    readingChapter === chapter && styles.answerChoiceChipSelected,
                  ]}
                  onPress={() => setReadingChapter(chapter)}
                >
                  <Text
                    style={[
                      styles.answerChoiceText,
                      readingChapter === chapter && styles.answerChoiceTextSelected,
                    ]}
                  >
                    {chapter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.answerFieldTitle}>{strings.answerVerses}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.answerChoiceRow}
            >
              {chapterOptions.map(value => (
                <TouchableOpacity
                  key={`read-${value}`}
                  style={[
                    styles.answerChoiceChip,
                    chaptersRead === value && styles.answerChoiceChipSelected,
                  ]}
                  onPress={() => setChaptersRead(value)}
                >
                  <Text
                    style={[
                      styles.answerChoiceText,
                      chaptersRead === value && styles.answerChoiceTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveAnswerBtn} onPress={saveDevotionSheet}>
              <Text style={styles.saveAnswerBtnText}>{strings.saveAnswer}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;
