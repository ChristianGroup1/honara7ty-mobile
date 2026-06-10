import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import supabase from '../../lib/supbase';
import {
  readCachedDevotionLogs,
  refreshDevotionLogs,
} from '../../lib/offlineSync';
import {
  buildReadingPlanSuggestions,
} from '../../lib/readingPlanSuggestions';
import type { ReadingPlanSuggestion } from '../../lib/readingPlanSuggestions';
import { formatReadingEntries } from '../../lib/readingEntries';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import {
  dailyNotificationStyles as styles,
  NAVY,
} from './styles';

const ReadingPlanSuggestionsScreen = ({ navigation }: any) => {
  const strings = getStrings().dailyNotifications;
  const insets = useSafeAreaInsets();
  const sessionUserRef = useRef<any>(null);
  const [devotionLogs, setDevotionLogs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPlanKeys, setExpandedPlanKeys] = useState<
    Record<string, boolean>
  >({});

  const suggestions = useMemo(
    () =>
      buildReadingPlanSuggestions(strings.readingPlanSuggestions, devotionLogs),
    [devotionLogs, strings.readingPlanSuggestions],
  );

  useEffect(() => {
    let isActive = true;

    const loadLogs = async () => {
      let sessionUser = sessionUserRef.current;
      if (!sessionUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData?.session?.user;
      }
      const userId = sessionUser?.id;
      if (!userId) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }

      sessionUserRef.current = sessionUser;
      const cachedLogs = await readCachedDevotionLogs(userId);
      if (!isActive) {
        return;
      }
      setDevotionLogs(cachedLogs);
      setLoading(false);

      const { data } = await refreshDevotionLogs(userId);
      if (!isActive) {
        return;
      }
      setDevotionLogs(data);
      setLoading(false);
    };

    loadLogs();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSelectPlan = useCallback(
    (suggestion: ReadingPlanSuggestion) => {
      navigation.navigate('DailyNotifications', {
        selectedReadingPlanKey: suggestion.key,
      });
    },
    [navigation],
  );

  const renderSuggestion = useCallback(
    ({ item }: { item: ReadingPlanSuggestion }) => {
      const expanded = Boolean(expandedPlanKeys[item.key]);
      const previewDays = expanded ? item.days : item.days.slice(0, 7);
      const remainingDays = Math.max(item.days.length - previewDays.length, 0);

      return (
        <View
          style={styles.planSuggestionScreenCard}
        >
          <View style={styles.planSuggestionTopRow}>
            <View style={styles.planSuggestionIcon}>
              <MaterialCommunityIcons name={item.icon} size={20} color="#FFF" />
            </View>
            <View style={styles.planSuggestionBadge}>
              <Text style={styles.planSuggestionBadgeText}>{item.badge}</Text>
            </View>
          </View>

          <Text style={styles.planSuggestionScreenTitle}>{item.title}</Text>
          <Text style={styles.planSuggestionScreenText}>{item.subtitle}</Text>

          <View style={styles.planSuggestionMetaRow}>
            <MaterialCommunityIcons
              name="book-open-variant"
              size={15}
              color={NAVY}
            />
            <Text style={styles.planSuggestionMetaText}>
              {strings.suggestionDaysCount(item.days.length)}
            </Text>
          </View>

          <View style={styles.planDaysPreview}>
            {previewDays.map(day => (
              <View key={`${item.key}-day-${day.day}`} style={styles.planDayRow}>
                <Text style={styles.planDayLabel}>
                  {strings.suggestionDayLabel(day.day)}
                </Text>
                <Text style={styles.planDayReading}>
                  {formatReadingEntries(day.entries)}
                </Text>
              </View>
            ))}
            {remainingDays > 0 ? (
              <TouchableOpacity
                style={styles.planDaysToggle}
                onPress={() =>
                  setExpandedPlanKeys(current => ({
                    ...current,
                    [item.key]: true,
                  }))
                }
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel={strings.showAllDays}
              >
                <Text style={styles.planDaysMoreText}>
                  {strings.suggestionMoreDays(remainingDays)}
                </Text>
              </TouchableOpacity>
            ) : item.days.length > 7 ? (
              <TouchableOpacity
                style={styles.planDaysToggle}
                onPress={() =>
                  setExpandedPlanKeys(current => ({
                    ...current,
                    [item.key]: false,
                  }))
                }
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel={strings.hidePlanDays}
              >
                <Text style={styles.planDaysMoreText}>
                  {strings.hidePlanDays}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.planSuggestionScreenAction}
            onPress={() => handleSelectPlan(item)}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={`${strings.applySuggestion} ${item.title}`}
          >
            <Text style={styles.planSuggestionScreenActionText}>
              {strings.applySuggestion}
            </Text>
            <MaterialCommunityIcons name="arrow-left" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    },
    [expandedPlanKeys, handleSelectPlan, strings],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets?.top ?? 0}
        title={strings.suggestionsScreenTitle}
        leading={
          <AppHeaderAction
            icon="arrow-right"
            onPress={() => navigation.goBack()}
          />
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          data={suggestions}
          renderItem={renderSuggestion}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.suggestionsScreenContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View style={styles.suggestionsScreenIntro}>
              <Text style={styles.suggestionsScreenHeading}>
                {strings.suggestionsScreenHeading}
              </Text>
              <Text style={styles.suggestionsScreenBody}>
                {strings.suggestionsScreenBody}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ReadingPlanSuggestionsScreen;
