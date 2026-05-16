import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GroupMemberStatus } from '../../../lib/devotionGroups';
import { styles } from './styles';
import { formatMemberReading, roleLabels } from './utils';

type Props = {
  members: GroupMemberStatus[];
  userId?: string;
  groupId?: string;
  strings: any;
  navigation: any;
};

const MembersList = ({ members, groupId, strings, navigation }: Props) => (
  <>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{strings.membersTitle}</Text>
      <Text style={styles.sectionCaption}>{strings.today}</Text>
    </View>

    {members.length > 0 ? (
      members.map(member => {
        const completed = Boolean(member.devotionLog?.completed);

        return (
          <TouchableOpacity
            key={member.user_id}
            style={styles.memberCard}
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
                color="#A0A7B2"
              />
            </View>

            <Text style={styles.readingText}>{formatMemberReading(member)}</Text>
          </TouchableOpacity>
        );
      })
    ) : (
      <Text style={styles.emptyText}>{strings.emptyMembers}</Text>
    )}
  </>
);

export default React.memo(MembersList);
