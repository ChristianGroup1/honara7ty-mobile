import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import {
  deleteMemorizationAttempt,
  getMemorizationStats,
  MemorizationGoalPeriod,
  MemorizationStats,
  updateMemorizationGoal,
} from '../../lib/memorization';
import { memorizationStyles as styles } from './styles';
import { GOLD, NAVY } from './utils';

type Props = {
  contentContainerStyle?: StyleProp<ViewStyle>;
  themedStyles?: Record<string, any>;
};

const MemorizationStatsPanel = ({ contentContainerStyle, themedStyles }: Props) => {
  const strings = getStrings().bibleMemorization;
  const [stats, setStats] = useState<MemorizationStats | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState(5);
  const [goalPeriod, setGoalPeriod] = useState<MemorizationGoalPeriod>('month');

  useFocusEffect(
    useCallback(() => {
      getMemorizationStats().then(nextStats => {
        setStats(nextStats);
        setTempGoal(nextStats.goal || 5);
        setGoalPeriod(nextStats.goalPeriod || 'month');
      });
    }, []),
  );

  const openGoalModal = () => {
    setTempGoal(stats?.goal || 5);
    setGoalPeriod(stats?.goalPeriod || 'month');
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    await updateMemorizationGoal({
      period: goalPeriod,
      target: tempGoal,
    });
    const newStats = await getMemorizationStats();
    setStats(newStats);
    setShowGoalModal(false);
  };

  const handleDeleteHistoryItem = async (item: any) => {
    await deleteMemorizationAttempt(item);
    const newStats = await getMemorizationStats();
    setStats(newStats);
  };

  const formatSeconds = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} ث`;
    }
    return `${Math.round(seconds / 60)} د`;
  };

  const progressTitle =
    stats?.goalPeriod === 'month'
      ? strings.stats.monthlyProgress
      : strings.stats.weeklyProgress;

  const renderHistoryItem = ({ item }: { item: any }) => {
    const date = new Date(item.created_at).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <View style={[styles.sectionCard, themedStyles?.card]}>
        <View style={styles.historyRow}>
          <View style={styles.historyInfo}>
            <Text style={[styles.subSectionLabel, themedStyles?.primaryText]}>
              {item.bookLabel} {item.chapterLabel}
            </Text>
            <Text style={[styles.sectionCaption, themedStyles?.mutedText]}>
              {date} • {item.timeSeconds || 0} ثانية
            </Text>
          </View>
          <View style={styles.historyScore}>
            <Text
              style={[
                styles.statValue,
                { color: item.score === item.total ? '#34C759' : GOLD },
              ]}
            >
              {item.score}/{item.total}
            </Text>
            <Text style={[styles.statLabel, themedStyles?.mutedText]}>
              {strings.result.scoreLabel}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.historyDeleteBtn}
            onPress={() => handleDeleteHistoryItem(item)}
            accessibilityRole="button"
            accessibilityLabel={strings.stats.deleteHistoryItem}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color="#D24A43"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <FlatList
        contentContainerStyle={[styles.content, contentContainerStyle]}
        ListHeaderComponent={
          <>
            {stats && (
              <View style={[styles.statsCard, themedStyles?.card]}>
                <View style={styles.statsHeader}>
                  <Text style={[styles.statsTitle, themedStyles?.primaryText]}>
                    {progressTitle}
                  </Text>
                  <TouchableOpacity
                    style={styles.goalBtn}
                    onPress={openGoalModal}
                  >
                    <MaterialCommunityIcons
                      name="target"
                      size={14}
                      color={GOLD}
                    />
                    <Text style={styles.goalBtnText}>
                      {strings.stats.setGoal}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                  <View style={[styles.statItem, themedStyles?.cardMuted]}>
                    <Text style={styles.statValue}>
                      {stats.currentPeriodCount}
                    </Text>
                    <Text style={[styles.statLabel, themedStyles?.mutedText]}>
                      {strings.stats.currentPeriod}
                    </Text>
                  </View>
                  <View style={[styles.statItem, themedStyles?.cardMuted]}>
                    <Text style={styles.statValue}>{stats.totalVerses}</Text>
                    <Text style={[styles.statLabel, themedStyles?.mutedText]}>
                      {strings.stats.totalVerses}
                    </Text>
                  </View>
                  <View style={[styles.statItem, themedStyles?.cardMuted]}>
                    <Text style={styles.statValue}>{stats.averageScore}%</Text>
                    <Text style={[styles.statLabel, themedStyles?.mutedText]}>
                      {strings.stats.avgScore}
                    </Text>
                  </View>
                  <View style={[styles.statItem, themedStyles?.cardMuted]}>
                    <Text style={styles.statValue}>{stats.totalAttempts}</Text>
                    <Text style={[styles.statLabel, themedStyles?.mutedText]}>
                      {strings.stats.totalAttempts}
                    </Text>
                  </View>
                </View>

                {stats.goal > 0 && (
                  <View style={[styles.progressBox, themedStyles?.dividerTop]}>
                    <Text style={[styles.progressText, themedStyles?.mutedText]}>
                      {strings.stats.goalReach(
                        stats.currentPeriodCount,
                        stats.goal,
                      )}
                    </Text>
                    <View style={[styles.progressBarContainer, themedStyles?.progressTrack]}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${Math.min(
                              (stats.currentPeriodCount / stats.goal) * 100,
                              100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.insightGrid}>
                  <View style={[styles.insightItem, themedStyles?.cardMuted]}>
                    <MaterialCommunityIcons
                      name="fire"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={[styles.insightValue, themedStyles?.primaryText]}>
                      {stats.currentStreak}
                    </Text>
                    <Text style={[styles.insightLabel, themedStyles?.mutedText]}>
                      {strings.stats.currentStreak}
                    </Text>
                  </View>
                  <View style={[styles.insightItem, themedStyles?.cardMuted]}>
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={[styles.insightValue, themedStyles?.primaryText]}>
                      {formatSeconds(stats.averageTimeSeconds)}
                    </Text>
                    <Text style={[styles.insightLabel, themedStyles?.mutedText]}>
                      {strings.stats.avgTime}
                    </Text>
                  </View>
                  <View style={[styles.insightItem, themedStyles?.cardMuted]}>
                    <MaterialCommunityIcons
                      name="check-decagram-outline"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={[styles.insightValue, themedStyles?.primaryText]}>
                      {stats.perfectAttempts}
                    </Text>
                    <Text style={[styles.insightLabel, themedStyles?.mutedText]}>
                      {strings.stats.perfectAttempts}
                    </Text>
                  </View>
                  <View style={[styles.insightItem, themedStyles?.cardMuted]}>
                    <MaterialCommunityIcons
                      name="star-outline"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={[styles.insightValue, themedStyles?.primaryText]}>{stats.bestScore}%</Text>
                    <Text style={[styles.insightLabel, themedStyles?.mutedText]}>
                      {strings.stats.bestScore}
                    </Text>
                  </View>
                </View>

                {stats.difficultyBreakdown.length > 0 && (
                  <View style={styles.difficultyBox}>
                    <Text style={[styles.statsSubTitle, themedStyles?.primaryText]}>
                      {strings.stats.difficultyBreakdown}
                    </Text>
                    {stats.difficultyBreakdown.map(item => (
                      <View style={[styles.difficultyRow, themedStyles?.cardMuted]} key={item.difficulty}>
                        <Text style={[styles.difficultyLabel, themedStyles?.primaryText]}>
                          {strings.difficultyLevels[
                            item.difficulty as keyof typeof strings.difficultyLevels
                          ] || item.difficulty}
                        </Text>
                        <Text style={styles.difficultyValue}>
                          {item.attempts} · {item.averageScore}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <Text style={[styles.historyTitle, themedStyles?.primaryText]}>سجل النتائج</Text>
          </>
        }
        data={stats?.history || []}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderHistoryItem}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.goalModalContent, themedStyles?.modalContent]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.goalModalScroll}
            >
              <View style={styles.goalModalHeader}>
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={42}
                  color={GOLD}
                />
                <Text style={[styles.modalTitle, themedStyles?.primaryText]}>
                  {strings.stats.goalModalTitle}
                </Text>
                <Text style={[styles.modalCaption, themedStyles?.mutedText]}>
                  {strings.stats.goalModalCaption}
                </Text>
              </View>

              <View style={[styles.goalPeriodRow, themedStyles?.segmentedWrap]}>
                {(['week', 'month'] as MemorizationGoalPeriod[]).map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.goalPeriodOption,
                      goalPeriod === period && styles.goalPeriodOptionActive,
                      goalPeriod === period && themedStyles?.chipActive,
                    ]}
                    onPress={() => setGoalPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.goalPeriodText,
                        themedStyles?.primaryText,
                        goalPeriod === period && styles.goalPeriodTextActive,
                      ]}
                    >
                      {period === 'week'
                        ? strings.stats.periodWeek
                        : strings.stats.periodMonth}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.goalInputRow}>
                <TouchableOpacity
                  style={[styles.goalAdjustBtn, themedStyles?.goalAdjustBtn]}
                  onPress={() => setTempGoal(Math.max(1, tempGoal - 1))}
                >
                  <MaterialCommunityIcons name="minus" size={24} color={themedStyles ? '#78A1BD' : NAVY} />
                </TouchableOpacity>

                <View style={styles.goalValueBlock}>
                  <Text style={[styles.goalValue, themedStyles?.accentText]}>
                    {tempGoal}
                  </Text>
                  <Text style={[styles.goalUnitText, themedStyles?.mutedText]}>
                    {strings.stats.versesUnit}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.goalAdjustBtn, themedStyles?.goalAdjustBtn]}
                  onPress={() => setTempGoal(tempGoal + 1)}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={themedStyles ? '#78A1BD' : NAVY} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveGoal}
              >
                <Text style={styles.modalSaveBtnText}>
                  {strings.stats.saveGoal}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={[styles.ghostBtnText, themedStyles?.mutedText]}>إلغاء</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default MemorizationStatsPanel;
