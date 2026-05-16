import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DevotionGroup } from '../../../lib/devotionGroups';
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
          : 'تفعيل إشعارات الجروب'}
      </Text>
      <Text style={styles.permissionText}>
        {notificationPermissionState === 'allowed'
          ? 'الإذن مفعّل، لكن جهازك لسه مش متسجل لاستقبال تذكيرات الجروب. اضغط لإعادة التسجيل.'
          : 'فعّل الإشعارات عشان تستقبل تذكيرات الخلوة حتى لو التطبيق مقفول.'}
      </Text>
    </View>
  </TouchableOpacity>
);

export const InviteCodeCard = ({
  group,
  strings,
  onCopy,
}: {
  group: DevotionGroup;
  strings: Strings;
  onCopy: () => void;
}) => (
  <View style={styles.inviteCard}>
    <View>
      <Text style={styles.metaLabel}>{strings.inviteCode}</Text>
      <Text style={styles.inviteCode}>{group.invite_code}</Text>
    </View>
    <TouchableOpacity style={styles.iconButton} onPress={onCopy}>
      <MaterialCommunityIcons name="content-copy" size={20} color={NAVY} />
    </TouchableOpacity>
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
          <MaterialCommunityIcons name="chart-line" size={21} color={GOLD} />
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
            color={GOLD}
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
            color={NAVY}
          />
          <Text style={styles.sharedReadingButtonText}>
            {hasSharedReading ? strings.editSharedReading : strings.setSharedReading}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
