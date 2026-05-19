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
};

const MemorizationStatsPanel = ({ contentContainerStyle }: Props) => {
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
      <View style={styles.sectionCard}>
        <View style={styles.historyRow}>
          <View style={styles.historyInfo}>
            <Text style={styles.subSectionLabel}>
              {item.bookLabel} {item.chapterLabel}
            </Text>
            <Text style={styles.sectionCaption}>
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
            <Text style={styles.statLabel}>{strings.result.scoreLabel}</Text>
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
              <View style={styles.statsCard}>
                <View style={styles.statsHeader}>
                  <Text style={styles.statsTitle}>{progressTitle}</Text>
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
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {stats.currentPeriodCount}
                    </Text>
                    <Text style={styles.statLabel}>
                      {strings.stats.currentPeriod}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalVerses}</Text>
                    <Text style={styles.statLabel}>
                      {strings.stats.totalVerses}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.averageScore}%</Text>
                    <Text style={styles.statLabel}>
                      {strings.stats.avgScore}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalAttempts}</Text>
                    <Text style={styles.statLabel}>
                      {strings.stats.totalAttempts}
                    </Text>
                  </View>
                </View>

                {stats.goal > 0 && (
                  <View style={styles.progressBox}>
                    <Text style={styles.progressText}>
                      {strings.stats.goalReach(
                        stats.currentPeriodCount,
                        stats.goal,
                      )}
                    </Text>
                    <View style={styles.progressBarContainer}>
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
                  <View style={styles.insightItem}>
                    <MaterialCommunityIcons
                      name="fire"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={styles.insightValue}>
                      {stats.currentStreak}
                    </Text>
                    <Text style={styles.insightLabel}>
                      {strings.stats.currentStreak}
                    </Text>
                  </View>
                  <View style={styles.insightItem}>
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={styles.insightValue}>
                      {formatSeconds(stats.averageTimeSeconds)}
                    </Text>
                    <Text style={styles.insightLabel}>
                      {strings.stats.avgTime}
                    </Text>
                  </View>
                  <View style={styles.insightItem}>
                    <MaterialCommunityIcons
                      name="check-decagram-outline"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={styles.insightValue}>
                      {stats.perfectAttempts}
                    </Text>
                    <Text style={styles.insightLabel}>
                      {strings.stats.perfectAttempts}
                    </Text>
                  </View>
                  <View style={styles.insightItem}>
                    <MaterialCommunityIcons
                      name="star-outline"
                      size={18}
                      color={GOLD}
                    />
                    <Text style={styles.insightValue}>{stats.bestScore}%</Text>
                    <Text style={styles.insightLabel}>
                      {strings.stats.bestScore}
                    </Text>
                  </View>
                </View>

                {stats.difficultyBreakdown.length > 0 && (
                  <View style={styles.difficultyBox}>
                    <Text style={styles.statsSubTitle}>
                      {strings.stats.difficultyBreakdown}
                    </Text>
                    {stats.difficultyBreakdown.map(item => (
                      <View style={styles.difficultyRow} key={item.difficulty}>
                        <Text style={styles.difficultyLabel}>
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
            <Text style={styles.historyTitle}>سجل النتائج</Text>
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
          <View style={[styles.modalContent, styles.goalModalContent]}>
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
                <Text style={styles.modalTitle}>
                  {strings.stats.goalModalTitle}
                </Text>
                <Text style={styles.modalCaption}>
                  {strings.stats.goalModalCaption}
                </Text>
              </View>

              <View style={styles.goalPeriodRow}>
                {(['week', 'month'] as MemorizationGoalPeriod[]).map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.goalPeriodOption,
                      goalPeriod === period && styles.goalPeriodOptionActive,
                    ]}
                    onPress={() => setGoalPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.goalPeriodText,
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
                  style={styles.goalAdjustBtn}
                  onPress={() => setTempGoal(Math.max(1, tempGoal - 1))}
                >
                  <MaterialCommunityIcons name="minus" size={24} color={NAVY} />
                </TouchableOpacity>

                <View style={styles.goalValueBlock}>
                  <Text style={styles.goalValue}>{tempGoal}</Text>
                  <Text style={styles.goalUnitText}>
                    {strings.stats.versesUnit}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.goalAdjustBtn}
                  onPress={() => setTempGoal(tempGoal + 1)}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={NAVY} />
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
                <Text style={styles.ghostBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default MemorizationStatsPanel;
