/**
 * JourneyMapScreen
 *
 * Visualizes spiritual growth as a walk along Paul's first missionary
 * journey. Reads cumulative completed devotion days from Supabase (with an
 * offline cache fallback), then renders a stylized map where each stop is
 * unlocked by consistency.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import { getJourneyInfo } from '../../lib/journeyMap';
import {
  readCachedDevotionLogs,
  refreshDevotionLogs,
} from '../../lib/offlineSync';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import JourneyMapCanvas from './JourneyMapCanvas';
import { createStyles } from './styles';

const JourneyMapScreen = ({ navigation }: any) => {
  const strings = getStrings().journeyMap;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sessionUserRef = useRef<any>(null);
  const [completedDays, setCompletedDays] = useState(0);

  const fetchProgress = useCallback(async () => {
    try {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
      }
      const userId = sessionUser?.id;
      if (!userId) {
        return;
      }

      sessionUserRef.current = sessionUser;
      const cachedData = await readCachedDevotionLogs(userId);
      const cachedDates = Object.entries(cachedData)
        .filter(([, value]) => value.completed)
        .map(([date]) => date);
      setCompletedDays(cachedDates.length);

      const { data } = await refreshDevotionLogs(userId);
      const dates = Object.entries(data)
        .filter(([, value]) => value.completed)
        .map(([date]) => date);
      setCompletedDays(dates.length);
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProgress();
    }, [fetchProgress]),
  );

  const info = useMemo(() => getJourneyInfo(completedDays), [completedDays]);

  const currentName = strings.stops[info.currentStop.key].name;
  const nextName = info.nextStop
    ? strings.stops[info.nextStop.key].name
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader
        topInsetHeight={insets.top}
        title={strings.header.title}
        eyebrow={strings.header.eyebrow}
        leading={
          <AppHeaderAction
            icon="arrow-right"
            onPress={() => navigation.goBack()}
            size={24}
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{strings.screen.intro}</Text>

        <View style={styles.mapCard}>
          <JourneyMapCanvas info={info} />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendDotVisited} />
              <Text style={styles.legendText}>
                {strings.screen.legend.visited}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDotCurrent} />
              <Text style={styles.legendText}>
                {strings.screen.legend.current}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDotLocked} />
              <Text style={styles.legendText}>
                {strings.screen.legend.locked}
              </Text>
            </View>
          </View>
        </View>

        {/* Current location / completion card */}
        <View style={styles.locationCard}>
          <View style={styles.locationTopRow}>
            <MaterialCommunityIcons
              name={info.isComplete ? 'flag-checkered' : 'map-marker-radius'}
              size={22}
              color={colors.accent}
            />
            <Text style={styles.locationTitle}>
              {info.isComplete
                ? strings.stops.returnAntioch.name
                : strings.screen.locationTitle}
            </Text>
          </View>

          <Text style={styles.currentStop}>{currentName}</Text>
          <Text style={styles.daysWalked}>
            {strings.screen.daysWalked(info.completedDays)}
          </Text>

          {info.nextStop && nextName ? (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(info.progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.toNext}>
                {info.progress >= 1
                  ? strings.screen.arriveTomorrow(nextName)
                  : strings.screen.toNext(info.daysToNext, nextName)}
              </Text>
            </>
          ) : (
            <Text style={styles.completeText}>
              {strings.screen.journeyComplete}
            </Text>
          )}
        </View>

        {/* Stops list */}
        <Text style={styles.sectionTitle}>
          {strings.screen.stopsSectionTitle}
        </Text>
        <View style={styles.stopList}>
          {[...info.stops].reverse().map(({ stop, status }) => {
            const name = strings.stops[stop.key].name;
            const description = strings.stops[stop.key].description;
            const statusText =
              status === 'visited'
                ? strings.screen.statusVisited
                : status === 'current'
                ? strings.screen.statusCurrent
                : strings.screen.statusLocked;

            return (
              <View
                key={stop.key}
                style={[styles.stopRow, status === 'locked' && styles.stopRowLocked]}
              >
                <View
                  style={[
                    styles.stopIcon,
                    status === 'visited' && styles.stopIconVisited,
                    status === 'current' && styles.stopIconCurrent,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      status === 'visited'
                        ? 'check'
                        : status === 'current'
                        ? 'map-marker'
                        : 'lock'
                    }
                    size={16}
                    color={
                      status === 'visited'
                        ? '#2D9C5A'
                        : status === 'current'
                        ? '#E6B84A'
                        : colors.mutedText
                    }
                  />
                </View>

                <View style={styles.stopBody}>
                  <View style={styles.stopTitleRow}>
                    <Text style={styles.stopName}>{name}</Text>
                    <Text
                      style={[
                        styles.stopStatus,
                        status === 'visited' && styles.stopStatusVisited,
                        status === 'current' && styles.stopStatusCurrent,
                      ]}
                    >
                      {statusText}
                    </Text>
                  </View>
                  <Text
                    style={styles.stopVerseRef}
                  >{`${stop.verseRef}`}</Text>
                  {status !== 'locked' ? (
                    <Text style={styles.stopDescription}>{description}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.footerVerse}>{strings.screen.footerVerse}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(JourneyMapScreen);
