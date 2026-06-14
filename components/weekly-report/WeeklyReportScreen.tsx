import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import CustomAlert, { AlertConfig } from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';
import {
  buildWeeklyReport,
  isWeeklyReportEmpty,
  WeeklyReport,
} from '../../lib/weeklyReport';
import { createWeeklyReportStyles } from './styles';

const formatArabicDate = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

type StatTile = {
  key: string;
  icon: string;
  color: string;
  value: string;
  label: string;
};

const WeeklyReportScreen = ({ navigation }: any) => {
  const strings = getStrings().weeklyReport;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const styles = useMemo(() => createWeeklyReportStyles(colors), [colors]);

  const sessionUserRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const hideAlert = useCallback(
    () => setAlertConfig(prev => ({ ...prev, visible: false })),
    [],
  );

  const loadReport = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
      }
      const userId = sessionUser?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      sessionUserRef.current = sessionUser;

      const cached = await buildWeeklyReport(userId, true);
      setReport(cached);
      setLoading(false);

      const fresh = await buildWeeklyReport(userId, false);
      setReport(fresh);
    } catch {
      /* keep last known report */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadReport(shouldShowLoader);
    }, [loadReport]),
  );

  const encouragement = useMemo(() => {
    if (!report || report.totalDays === 0) {
      return strings.encouragement.none;
    }
    const ratio = report.devotionDays / report.totalDays;
    if (report.devotionDays >= report.totalDays) {
      return strings.encouragement.perfect;
    }
    if (ratio >= 0.6) {
      return strings.encouragement.most;
    }
    if (report.devotionDays > 0) {
      return strings.encouragement.some;
    }
    return strings.encouragement.none;
  }, [report, strings]);

  const tiles: StatTile[] = useMemo(() => {
    if (!report) {
      return [];
    }
    return [
      {
        key: 'devotionDays',
        icon: 'calendar-check',
        color: colors.accent,
        value: strings.stats.devotionDaysValue(
          report.devotionDays,
          report.totalDays,
        ),
        label: strings.stats.devotionDays,
      },
      {
        key: 'streak',
        icon: 'fire',
        color: '#E8833A',
        value: strings.stats.streakValue(report.streak),
        label: strings.stats.streak,
      },
      {
        key: 'chapters',
        icon: 'book-open-variant',
        color: '#1A7A7A',
        value: String(report.chaptersRead),
        label: strings.stats.chapters,
      },
      {
        key: 'verses',
        icon: 'brain',
        color: '#7B5CD6',
        value: String(report.versesMemorized),
        label: strings.stats.verses,
      },
      {
        key: 'prayers',
        icon: 'hands-pray',
        color: '#4A90D9',
        value: String(report.newPrayers),
        label: strings.stats.prayers,
      },
      {
        key: 'reflections',
        icon: 'notebook-outline',
        color: '#C9A84C',
        value: String(report.reflections),
        label: strings.stats.reflections,
      },
    ];
  }, [report, strings, colors.accent]);

  const handleShare = useCallback(async () => {
    if (!report) {
      return;
    }
    try {
      await Share.share({
        title: strings.shareTitle,
        message: strings.shareMessage({
          devotionDays: report.devotionDays,
          totalDays: report.totalDays,
          streak: report.streak,
          chapters: report.chaptersRead,
          verses: report.versesMemorized,
          prayers: report.newPrayers,
          reflections: report.reflections,
        }),
      });
    } catch (error: any) {
      setAlertConfig({
        visible: true,
        title: strings.shareErrorTitle,
        message: error?.message,
        type: 'error',
      });
    }
  }, [report, strings]);

  const showEmpty = report ? isWeeklyReportEmpty(report) : false;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader
        topInsetHeight={insets.top}
        eyebrow={strings.eyebrow}
        title={strings.title}
        leading={
          <AppHeaderAction icon="chevron-right" onPress={() => navigation.goBack()} />
        }
      />

      {loading && !report ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>{strings.loading}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {report ? (
            <View style={styles.rangePill}>
              <Text style={styles.rangePillText}>
                {strings.rangeLabel(
                  formatArabicDate(report.weekStart),
                  formatArabicDate(report.weekEnd),
                )}
              </Text>
            </View>
          ) : null}

          <View style={styles.encouragementCard}>
            <View style={styles.encouragementIcon}>
              <MaterialCommunityIcons
                name="white-balance-sunny"
                size={26}
                color="#FFF"
              />
            </View>
            <Text style={styles.encouragementText}>{encouragement}</Text>
          </View>

          {showEmpty ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={40}
                color={colors.mutedText}
              />
              <Text style={styles.emptyTitle}>{strings.emptyTitle}</Text>
              <Text style={styles.emptyMessage}>{strings.emptyMessage}</Text>
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {tiles.map(tile => (
                  <View key={tile.key} style={styles.statCard}>
                    <View
                      style={[
                        styles.statIconCircle,
                        { backgroundColor: `${tile.color}22` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={tile.icon}
                        size={24}
                        color={tile.color}
                      />
                    </View>
                    <Text style={styles.statValue}>{tile.value}</Text>
                    <Text style={styles.statLabel}>{tile.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.shareButton}
                activeOpacity={0.85}
                onPress={handleShare}
              >
                <Text style={styles.shareButtonText}>
                  {strings.shareButton}
                </Text>
                <MaterialCommunityIcons
                  name="share-variant"
                  size={18}
                  color="#FFF"
                />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default WeeklyReportScreen;
