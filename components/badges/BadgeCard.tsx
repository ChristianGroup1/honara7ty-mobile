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
  const daysLeft = badge.days - streak;
  const badgeRingStyle = { backgroundColor: earned ? `${badge.color}20` : '#f0f0f0' };
  const checkmarkStyle = { backgroundColor: badge.color };
  const progressFillStyle = {
    width: `${progress * 100}%` as `${number}%`,
    backgroundColor: badge.color,
  };
  const earnedTagStyle = { backgroundColor: `${badge.color}15` };
  const earnedTextStyle = { color: badge.color };

  return (
    <View
      style={[
        styles.badgeCard,
        earned && styles.badgeCardEarned,
        { borderTopColor: badge.color },
      ]}
    >
      <View style={styles.badgeRingBg}>
        <View
          style={[
            styles.badgeRing,
            badgeRingStyle,
          ]}
        >
          {earned ? (
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
          ) : (
            <MaterialCommunityIcons name={badge.icon} size={32} color="#ccc" />
          )}
        </View>
        {earned ? (
          <View style={[styles.checkmark, checkmarkStyle]}>
            <MaterialCommunityIcons name="check" size={14} color="#fff" />
          </View>
        ) : null}
      </View>

      <Text style={styles.badgeTitle}>{badge.title}</Text>
      <Text style={styles.badgeDays}>{badge.days} أيام</Text>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            progressFillStyle,
          ]}
        />
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
        <Text style={styles.pendingText}>{daysLeft} يوم متبقي</Text>
      )}
    </View>
  );
};

export default BadgeCard;
