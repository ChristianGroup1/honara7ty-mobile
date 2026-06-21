import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';
import { getGrowthTreeInfo } from '../../lib/growthTree';
import { palette, radius, spacing } from '../shared/designTokens';
import GrowthTree from './GrowthTree';

type GrowthTreeCardProps = {
  completedDays: number;
  streak: number;
};

const GrowthTreeCard = ({ completedDays, streak }: GrowthTreeCardProps) => {
  const strings = getStrings().badges.growthTree;
  const { colors, isNightMode } = useNightMode();
  const info = useMemo(
    () => getGrowthTreeInfo(completedDays, streak),
    [completedDays, streak],
  );

  const styles = useMemo(
    () => createStyles(colors, isNightMode),
    [colors, isNightMode],
  );

  const stageName = strings.stages[info.stage.key];
  const nextStageName = info.nextStage
    ? strings.stages[info.nextStage.key]
    : null;

  const statusText = info.isMax
    ? strings.maxReached
    : info.thriving
    ? strings.thriving
    : strings.needsWater;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.badge}>{strings.badge}</Text>
        <Text style={styles.daysLabel}>
          {strings.daysLabel(info.completedDays)}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.treeWrap}>
          <GrowthTree
            stage={info.stage.index}
            thriving={info.thriving}
            isNight={isNightMode}
            size={132}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{strings.title}</Text>
          <Text style={styles.stageName}>{stageName}</Text>
          <Text style={styles.status}>{statusText}</Text>

          {info.nextStage && nextStageName ? (
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
                {strings.toNext(info.daysToNext, nextStageName)}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <Text style={styles.verse}>{strings.verse}</Text>
    </View>
  );
};

const createStyles = (
  colors: ReturnType<typeof useNightMode>['colors'],
  isNight: boolean,
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isNight ? 0.18 : 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    badge: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    daysLabel: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    treeWrap: {
      width: 132,
      height: 132,
      borderRadius: radius.lg,
      backgroundColor: isNight ? 'rgba(99,196,135,0.08)' : '#F1F8F3',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
    },
    title: {
      color: colors.mutedText,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
      textAlign: 'left',
    },
    stageName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'left',
    },
    status: {
      color: colors.mutedText,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
      marginBottom: 12,
      textAlign: 'left',
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.cardMuted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: palette.success,
    },
    toNext: {
      color: colors.mutedText,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 6,
      textAlign: 'left',
    },
    verse: {
      color: colors.mutedText,
      fontSize: 12,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

export default React.memo(GrowthTreeCard);
