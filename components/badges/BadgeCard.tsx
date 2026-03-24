import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BadgeConfig } from './constants';
import { badgesStyles as styles } from './styles';

interface BadgeCardProps {
  badge: BadgeConfig;
  streak: number;
  onShare: (badge: BadgeConfig) => void;
}

const BadgeCard = ({ badge, streak, onShare }: BadgeCardProps) => {
  const earned = streak >= badge.days;
  const progress = Math.min(streak / badge.days, 1);
  const daysLeft = Math.max(badge.days - streak, 0);
  const badgeRingStyle = {
    backgroundColor: earned ? `${badge.color}22` : '#EEF2F6',
  };
  const badgeHaloStyle = {
    backgroundColor: earned ? `${badge.color}14` : '#F6F8FB',
  };
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

  return (
    <View style={[styles.badgeCard, earned && styles.badgeCardEarned]}>
      <View style={[styles.badgeCardAccent, topAccentStyle]} />

      <View style={styles.badgeTopRow}>
        <View
          style={[
            styles.badgeStatePill,
            earned ? styles.badgeStatePillEarned : styles.badgeStatePillPending,
          ]}
        >
          <Text style={[styles.badgeStateText, earned && earnedTextStyle]}>
            {earned ? 'تم الإنجاز' : 'قيد التقدم'}
          </Text>
        </View>
        <View style={[styles.badgeDayChip, badgeTintStyle]}>
          <Text style={[styles.badgeDayChipText, earnedTextStyle]}>
            {badge.days} يوم
          </Text>
        </View>
      </View>

      <View style={[styles.badgeHalo, badgeHaloStyle]}>
        <View style={styles.badgeRingBg}>
          <View style={[styles.badgeRing, badgeRingStyle]}>
            {earned ? (
              <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
            ) : (
              <MaterialCommunityIcons
                name={badge.icon}
                size={30}
                color={badge.color}
              />
            )}
          </View>
          {earned ? (
            <View style={[styles.checkmark, checkmarkStyle]}>
              <MaterialCommunityIcons name="check" size={14} color="#fff" />
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.badgeTitle}>{badge.title}</Text>
      <Text style={styles.badgeSubtitle}>
        {earned ? 'أكملت هذا الوسام بنجاح' : `تبقّى ${daysLeft} يوم للوصول`}
      </Text>

      <View style={styles.progressMetaRow}>
        <Text style={styles.progressLabel}>نسبة التقدم</Text>
        <Text style={[styles.progressMetaText, progressMetaStyle]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, progressFillStyle]} />
      </View>

      {earned ? (
        <TouchableOpacity
          style={[styles.earnedTag, earnedTagStyle]}
          onPress={() => onShare(badge)}
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={12}
            color={badge.color}
          />
          <Text style={[styles.earnedText, earnedTextStyle]}>شارك</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.pendingRow}>
          <MaterialCommunityIcons name="timer-sand" size={14} color="#7E8896" />
          <Text style={styles.pendingText}>{daysLeft} يوم متبقي</Text>
        </View>
      )}
    </View>
  );
};

export default BadgeCard;
