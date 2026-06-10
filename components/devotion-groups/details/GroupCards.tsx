import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  DevotionGroup,
  GroupMemberStatus,
} from '../../../lib/devotionGroups';
import { GOLD, NAVY, styles } from './styles';
import {
  formatSharedReading,
  formatSharedTarget,
  PersonalGroupStats,
} from './utils';

type Strings = any;

export const PushRegistrationCard = ({
  notificationPermissionState,
  saving,
  onPress,
}: {
  notificationPermissionState: 'allowed' | 'denied' | 'not_determined';
  saving: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.permissionCard} onPress={onPress} disabled={saving}>
    <View style={styles.permissionIcon}>
      <MaterialCommunityIcons name="bell-alert-outline" size={22} color={GOLD} />
    </View>
    <View style={styles.permissionBody}>
      <Text style={styles.permissionTitle}>
        {notificationPermissionState === 'allowed'
          ? 'تسجيل جهازك للإشعارات'
          : 'تفعيل إشعارات مجموعة الخلوة'}
      </Text>
      <Text style={styles.permissionText}>
        {notificationPermissionState === 'allowed'
          ? 'الإذن مفعّل، لكن جهازك لسه مش متسجل لاستقبال تذكيرات مجموعة الخلوة. اضغط لإعادة التسجيل.'
          : 'فعّل الإشعارات عشان تستقبل تذكيرات الخلوة حتى لو التطبيق مقفول.'}
      </Text>
    </View>
  </TouchableOpacity>
);

export const InviteCodeCard = ({
  group,
  strings,
  inviteLink,
  onCopy,
  onCopyLink,
  onShare,
}: {
  group: DevotionGroup;
  strings: Strings;
  inviteLink: string;
  onCopy: () => void;
  onCopyLink: () => void;
  onShare: () => void;
}) => (
  <View style={styles.inviteCard}>
    <View style={styles.inviteContent}>
      <Text style={styles.metaLabel}>{strings.inviteCode}</Text>
      <View style={styles.inviteValueRow}>
        <Text style={styles.inviteCode}>{group.invite_code}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={onCopy}>
          <MaterialCommunityIcons name="content-copy" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      <Text style={styles.inviteLinkLabel}>{strings.inviteLink}</Text>
      <View style={styles.inviteValueRow}>
        <TouchableOpacity
          style={styles.inviteLinkPressable}
          onPress={onCopyLink}
        >
          <Text style={styles.inviteLinkText}>{inviteLink}</Text>
        </TouchableOpacity>
        <View style={styles.inviteLinkActionsRow}>
          <TouchableOpacity style={styles.iconButton} onPress={onCopyLink}>
            <MaterialCommunityIcons name="content-copy" size={20} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

export const SummaryCards = ({
  membersCount,
  completedCount,
  strings,
}: {
  membersCount: number;
  completedCount: number;
  strings: Strings;
}) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryCard}>
      <Text style={styles.summaryNumber}>{membersCount}</Text>
      <Text style={styles.summaryLabel}>{strings.membersTitle}</Text>
    </View>
    <View style={styles.summaryCard}>
      <Text style={styles.summaryNumber}>{completedCount}</Text>
      <Text style={styles.summaryLabel}>{strings.completed}</Text>
    </View>
  </View>
);

export const PersonalStatsCard = ({
  stats,
  strings,
}: {
  stats: PersonalGroupStats | null;
  strings: Strings;
}) => {
  if (!stats) {
    return null;
  }

  return (
    <View style={styles.personalStatsCard}>
      <View style={styles.personalStatsHeader}>
        <View style={styles.personalStatsIcon}>
          <MaterialCommunityIcons name="chart-line" size={21} color="#FFF" />
        </View>
        <Text style={styles.personalStatsTitle}>{strings.personalStatsTitle}</Text>
      </View>
      <View style={styles.personalStatsRow}>
        <Stat value={stats.completedDays} label={strings.completedDays} />
        <Stat value={stats.currentStreak} label={strings.currentStreak} />
        <Stat value={`${stats.commitmentRate}%`} label={strings.commitmentRate} />
      </View>
    </View>
  );
};

const Stat = ({ value, label }: { value: number | string; label: string }) => (
  <View style={styles.personalStatItem}>
    <Text style={styles.personalStatNumber}>{value}</Text>
    <Text style={styles.personalStatLabel}>{label}</Text>
  </View>
);

export const TodayDevotionCard = ({
  member,
  strings,
  saving,
  onOpen,
}: {
  member: GroupMemberStatus | null;
  strings: Strings;
  saving: boolean;
  onOpen: () => void;
}) => {
  const completed = Boolean(member?.devotionLog?.completed);
  const answered = Boolean(member?.devotionLog);

  return (
    <View style={styles.todayDevotionCard}>
      <View style={styles.todayDevotionHeader}>
        <View style={styles.todayDevotionIcon}>
          <MaterialCommunityIcons
            name={completed ? 'check-circle-outline' : 'calendar-check-outline'}
            size={22}
            color="#FFF"
          />
        </View>
        <View style={styles.todayDevotionBody}>
          <Text style={styles.todayDevotionTitle}>
            {strings.todayDevotionTitle}
          </Text>
          <Text style={styles.todayDevotionText}>
            {answered
              ? completed
                ? strings.todayDevotionCompleted
                : strings.todayDevotionNotCompleted
              : strings.todayDevotionNotAnswered}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.todayDevotionButton}
        disabled={saving}
        onPress={onOpen}
      >
        <Text style={styles.todayDevotionButtonText}>
          {answered ? strings.editTodayDevotion : strings.answerTodayDevotion}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export const SharedReadingCard = ({
  group,
  strings,
  canManage,
  saving,
  onEdit,
}: {
  group: DevotionGroup;
  strings: Strings;
  canManage: boolean;
  saving: boolean;
  onEdit: () => void;
}) => {
  const hasSharedReading = Boolean(group.shared_reading_book);

  return (
    <View style={styles.sharedReadingCard}>
      <View style={styles.sharedReadingHeader}>
        <View style={styles.sharedReadingIcon}>
          <MaterialCommunityIcons
            name="book-open-page-variant-outline"
            size={22}
            color="#FFF"
          />
        </View>
        <View style={styles.sharedReadingBody}>
          <Text style={styles.sharedReadingTitle}>{strings.sharedReadingTitle}</Text>
          <Text style={styles.sharedReadingText}>
            {formatSharedReading(group.shared_reading_book, group.shared_selected_chapters)}
          </Text>
          {hasSharedReading ? (
            <Text style={styles.sharedTargetText}>
              {strings.sharedTargetPrefix} {formatSharedTarget(group.shared_target_days)}
            </Text>
          ) : null}
        </View>
      </View>
      {canManage ? (
        <TouchableOpacity
          style={styles.sharedReadingButton}
          onPress={onEdit}
          disabled={saving}
        >
          <MaterialCommunityIcons
            name={hasSharedReading ? 'pencil-outline' : 'plus'}
            size={17}
            color="#FFF"
          />
          <Text style={styles.sharedReadingButtonText}>
            {hasSharedReading ? strings.editSharedReading : strings.setSharedReading}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
