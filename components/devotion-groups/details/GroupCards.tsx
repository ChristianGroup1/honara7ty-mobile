import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DevotionGroup, GroupMemberStatus } from '../../../lib/devotionGroups';
import { GOLD, NAVY, styles } from './styles';

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
  <TouchableOpacity
    style={styles.permissionCard}
    onPress={onPress}
    disabled={saving}
  >
    <View style={styles.permissionIcon}>
      <MaterialCommunityIcons
        name="bell-alert-outline"
        size={22}
        color={GOLD}
      />
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
            <MaterialCommunityIcons
              name="content-copy"
              size={20}
              color={NAVY}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onShare}>
            <MaterialCommunityIcons
              name="share-variant"
              size={20}
              color={NAVY}
            />
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

  return (
    <TouchableOpacity
      style={styles.todayDevotionCard}
      disabled={saving}
      onPress={onOpen}
    >
      <View style={styles.todayDevotionIcon}>
        <MaterialCommunityIcons
          name={completed ? 'check-circle-outline' : 'calendar-check-outline'}
          size={22}
          color="#FFF"
        />
      </View>
      <Text style={styles.todayDevotionTitle} numberOfLines={2}>
        {strings.todayDevotionTitle}
      </Text>
    </TouchableOpacity>
  );
};

export const SharedReadingCard = ({
  group,
  strings,
  saving,
  onOpen,
}: {
  group: DevotionGroup;
  strings: Strings;
  saving: boolean;
  onOpen: () => void;
}) => {
  const hasSharedReading = Boolean(group.shared_reading_book);

  return (
    <TouchableOpacity
      style={styles.sharedReadingCard}
      onPress={onOpen}
      disabled={saving}
    >
      <View style={styles.sharedReadingIcon}>
        <MaterialCommunityIcons
          name={hasSharedReading ? 'book-open-page-variant' : 'book-plus-outline'}
          size={22}
          color="#FFF"
        />
      </View>
      <Text style={styles.sharedReadingTitle} numberOfLines={2}>
        {strings.sharedReadingTitle}
      </Text>
    </TouchableOpacity>
  );
};

export const GroupPrayerRequestsCard = ({
  strings,
  saving,
  onOpen,
}: {
  strings: Strings;
  saving: boolean;
  onOpen: () => void;
}) => (
  <TouchableOpacity
    style={styles.groupPrayerCard}
    onPress={onOpen}
    disabled={saving}
  >
    <View style={styles.groupPrayerIcon}>
      <MaterialCommunityIcons name="hands-pray" size={22} color="#FFF" />
    </View>
    <Text style={styles.groupPrayerTitle} numberOfLines={2}>
      {strings.groupPrayerRequestsTitle}
    </Text>
  </TouchableOpacity>
);
