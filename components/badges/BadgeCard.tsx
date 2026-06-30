import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BadgeConfig } from './constants';
import { badgesStyles as styles, ThemedBadgesStyles } from './styles';
import { getStrings } from '../../localization';

interface BadgeCardProps {
  badge: BadgeConfig;
  streak: number;
  onShare: (badge: BadgeConfig) => void;
  themedStyles: ThemedBadgesStyles;
  mutedTextColor: string;
}

const BadgeCard = ({
  badge,
  streak,
  onShare,
  themedStyles,
  mutedTextColor,
}: BadgeCardProps) => {
  const strings = getStrings().badges;
  const earned = streak >= badge.days;
  const progress = Math.min(streak / badge.days, 1);
  const daysLeft = Math.max(badge.days - streak, 0);
  const badgeRingStyle = { backgroundColor: `${badge.color}22` };
  const badgeTintStyle = { backgroundColor: `${badge.color}10` };
  const checkmarkStyle = { backgroundColor: badge.color };
  const progressFillStyle = {
    width: `${progress * 100}%` as `${number}%`,
    backgroundColor: badge.color,
  };
  const earnedTagStyle = { backgroundColor: `${badge.color}15` };
  const earnedTextStyle = { color: badge.color };
  const topAccentStyle = { backgroundColor: badge.color };
  const progressMetaStyle = { color: badge.color };
  const cardShellStyle = earned
    ? styles.badgeCardEarned
    : styles.badgeCardLocked;

  return (
    <View style={[styles.badgeCard, themedStyles.badgeCard, cardShellStyle]}>
      <View style={[styles.badgeCardAccent, topAccentStyle]} />

      <View style={styles.badgeTopRow}>
        <View style={styles.badgeIdentityRow}>
          <View
            style={[
              styles.badgeRing,
              !earned && themedStyles.badgeRingLocked,
              earned && badgeRingStyle,
            ]}
          >
            {earned ? (
              <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
            ) : (
              <MaterialCommunityIcons
                name={badge.icon}
                size={24}
                color={badge.color}
              />
            )}
          </View>
          {earned ? (
            <View style={[styles.checkmark, checkmarkStyle]}>
              <MaterialCommunityIcons name="check" size={12} color="#fff" />
            </View>
          ) : null}
        </View>
        <View style={styles.badgeChipColumn}>
          <View style={[styles.badgeDayChip, badgeTintStyle]}>
            <Text style={[styles.badgeDayChipText, earnedTextStyle]}>
              {badge.tier}
            </Text>
          </View>
          <Text style={[styles.badgeXpText, themedStyles.badgeXpText]}>
            {strings.card.xp(badge.xp)}
          </Text>
        </View>
      </View>

      <Text style={[styles.badgeTitle, themedStyles.badgeTitle]}>
        {badge.title}
      </Text>
      <Text style={[styles.badgeSubtitle, themedStyles.badgeSubtitle]}>
        {earned
          ? strings.card.earnedSubtitle
          : strings.card.remainingSubtitle(daysLeft)}
      </Text>

      <View style={styles.progressMetaRow}>
        <Text style={[styles.progressLabel, themedStyles.progressLabel]}>
          {strings.card.progressLabel}
        </Text>
        <Text style={[styles.progressMetaText, progressMetaStyle]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <View style={[styles.progressBar, themedStyles.progressBar]}>
        <View style={[styles.progressFill, progressFillStyle]} />
      </View>

      {earned ? (
        <TouchableOpacity
          style={[styles.earnedTag, earnedTagStyle]}
          onPress={() => onShare(badge)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`${strings.card.share} ${badge.title}`}
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={12}
            color={badge.color}
          />
          <Text style={[styles.earnedText, earnedTextStyle]}>
            {strings.card.share}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.pendingRow}>
          <MaterialCommunityIcons
            name="timer-sand"
            size={14}
            color={mutedTextColor}
          />
          <Text style={[styles.pendingText, themedStyles.pendingText]}>
            {strings.card.remainingDays(daysLeft)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default React.memo(BadgeCard);
