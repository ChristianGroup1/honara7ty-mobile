import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GroupMemberStatus } from '../../../lib/devotionGroups';
import { styles as defaultStyles } from './styles';
import { formatMemberReading, roleLabels } from './utils';

type Props = {
  members: GroupMemberStatus[];
  userId?: string;
  groupId?: string;
  strings: any;
  navigation: any;
  canManageMembers?: boolean;
  saving?: boolean;
  onConfirmRemoveMember?: (member: GroupMemberStatus) => void;
  onConfirmSetMemberAdmin?: (member: GroupMemberStatus) => void;
  onConfirmUnsetMemberAdmin?: (member: GroupMemberStatus) => void;
  styles?: typeof defaultStyles;
  mutedIconColor?: string;
  adminIconColor?: string;
};

const MembersList = ({
  members,
  userId,
  groupId,
  strings,
  navigation,
  canManageMembers = false,
  saving = false,
  onConfirmRemoveMember,
  onConfirmSetMemberAdmin,
  onConfirmUnsetMemberAdmin,
  styles = defaultStyles,
  mutedIconColor = '#A0A7B2',
  adminIconColor = '#0A1124',
}: Props) => (
  <>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{strings.membersTitle}</Text>
      <Text style={styles.sectionCaption}>{strings.today}</Text>
    </View>

    {members.length > 0 ? (
      members.map(member => {
        const completed = Boolean(member.devotionLog?.completed);
        const canManageMember =
          canManageMembers && member.user_id !== userId && member.role !== 'owner';
        const canSetAdmin = canManageMember && member.role !== 'leader';
        const canUnsetAdmin = canManageMember && member.role === 'leader';

        return (
          <View
            key={member.user_id}
            style={styles.memberCard}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                navigation.navigate('DevotionGroupMemberDetails', {
                  groupId,
                  userId: member.user_id,
                  displayName: member.display_name,
                })
              }
            >
              <View style={styles.memberTopRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.display_name.trim()[0] ?? 'م'}
                  </Text>
                </View>
                <View style={styles.memberBody}>
                  <Text style={styles.memberName}>{member.display_name}</Text>
                  <Text style={styles.memberRole}>{roleLabels(member.role)}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    completed ? styles.statusPillDone : styles.statusPillPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      completed
                        ? styles.statusPillTextDone
                        : styles.statusPillTextPending,
                    ]}
                  >
                    {completed ? strings.completed : strings.notCompleted}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={22}
                  color={mutedIconColor}
                />
              </View>

              <Text style={styles.readingText}>{formatMemberReading(member)}</Text>
            </TouchableOpacity>

            {canManageMember ? (
              <View style={styles.memberActionsRow}>
                {canSetAdmin ? (
                  <TouchableOpacity
                    style={styles.memberAdminButton}
                    activeOpacity={0.82}
                    disabled={saving}
                    onPress={() => onConfirmSetMemberAdmin?.(member)}
                  >
                    <MaterialCommunityIcons
                      name="shield-account-outline"
                      size={17}
                      color={adminIconColor}
                    />
                    <Text style={styles.memberAdminButtonText}>
                      {strings.makeMemberAdmin}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {canUnsetAdmin ? (
                  <TouchableOpacity
                    style={styles.memberAdminButton}
                    activeOpacity={0.82}
                    disabled={saving}
                    onPress={() => onConfirmUnsetMemberAdmin?.(member)}
                  >
                    <MaterialCommunityIcons
                      name="shield-off-outline"
                      size={17}
                      color={adminIconColor}
                    />
                    <Text style={styles.memberAdminButtonText}>
                      {strings.removeMemberAdmin}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.memberRemoveButton}
                  activeOpacity={0.82}
                  disabled={saving}
                  onPress={() => onConfirmRemoveMember?.(member)}
                >
                  <MaterialCommunityIcons
                    name="account-remove-outline"
                    size={17}
                    color="#B42318"
                  />
                  <Text style={styles.memberRemoveButtonText}>
                    {strings.removeMember}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })
    ) : (
      <Text style={styles.emptyText}>{strings.emptyMembers}</Text>
    )}
  </>
);

export default React.memo(MembersList);
