import supabase from './supbase';
import { ReadingEntry } from './readingEntries';

export type DevotionGroup = {
  id: string;
  owner_id: string;
  name: string;
  invite_code: string;
  shared_reading_book?: string | null;
  shared_selected_chapters?: number[] | null;
  shared_target_days?: number | null;
  created_at: string;
};

export type DevotionGroupMember = {
  group_id: string;
  user_id: string;
  role: 'owner' | 'leader' | 'member';
  display_name: string;
  joined_at: string;
  last_reminded_at?: string | null;
};

export type GroupDevotionLog = {
  user_id: string;
  date: string;
  completed: boolean;
  reading_book?: string | null;
  reading_chapter?: number | null;
  chapters_read?: number | null;
  selected_chapters?: number[] | null;
  reading_entries?: ReadingEntry[] | null;
};

export type GroupMemberStatus = DevotionGroupMember & {
  devotionLog?: GroupDevotionLog | null;
};

export type GroupMemberDevotionHistoryItem = GroupDevotionLog & {
  created_at: string;
};

export type DevotionGroupReminder = {
  id: string;
  group_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read_at?: string | null;
};

export function buildDevotionGroupInviteLink(inviteCode: string) {
  return `https://honara7ty.space/devotion-group-invite?code=${encodeURIComponent(
    inviteCode.replace(/\s+/g, ''),
  )}`;
}

function isExpiredJwtError(error: any) {
  return (
    error?.code === 'PGRST303' ||
    /jwt expired/i.test(String(error?.message ?? ''))
  );
}

async function withExpiredJwtRetry(request: () => any): Promise<any> {
  const result = await request();

  if (!isExpiredJwtError(result.error)) {
    return result;
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return result;
  }

  return request();
}

export async function fetchMyDevotionGroups() {
  return withExpiredJwtRetry(() => supabase.rpc('my_devotion_groups'));
}

export async function fetchDevotionGroupById(groupId: string) {
  return withExpiredJwtRetry(() =>
    supabase
      .from('devotion_groups')
      .select(
        'id, owner_id, name, invite_code, shared_reading_book, shared_selected_chapters, shared_target_days, created_at',
      )
      .eq('id', groupId)
      .single(),
  );
}

export async function createDevotionGroup(params: {
  name: string;
  displayName: string;
}) {
  return withExpiredJwtRetry(() =>
    supabase
      .rpc('create_devotion_group', {
        group_name: params.name,
        owner_display_name: params.displayName.trim() || 'قائد مجموعة الخلوة',
      })
      .single(),
  );
}

export async function joinDevotionGroupByCode(params: {
  code: string;
  displayName: string;
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase
      .rpc('join_devotion_group', {
        invite_code_input: params.code,
        member_display_name: params.displayName.trim() || 'مستخدم',
      })
      .single(),
  );

  const joinedGroup = result.data as DevotionGroup | null;
  if (!result.error && joinedGroup?.id) {
    notifyDevotionGroupMemberJoined({
      groupId: joinedGroup.id,
      displayName: params.displayName.trim() || 'مستخدم',
    }).catch(error => {
      if (__DEV__) {
        console.warn('[devotion-groups] failed to notify member joined', error);
      }
    });
  }

  return result;
}

export async function joinDevotionGroupByCodeLegacy(params: {
  code: string;
  displayName: string;
}) {
  return withExpiredJwtRetry(() =>
    supabase.rpc('join_devotion_group_by_code', {
      code: params.code.replace(/\s+/g, ''),
      member_display_name: params.displayName.trim() || 'مستخدم',
    }),
  );
}

export async function deleteDevotionGroup(groupId: string) {
  return withExpiredJwtRetry(() =>
    supabase.from('devotion_groups').delete().eq('id', groupId),
  );
}

export async function leaveDevotionGroup(params: {
  groupId: string;
  userId?: string | null;
}) {
  if (!params.userId) {
    return { data: null, error: new Error('AUTH_REQUIRED') };
  }

  return withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_members')
      .delete()
      .eq('group_id', params.groupId)
      .eq('user_id', params.userId),
  );
}

export async function fetchGroupMembersWithDevotion(params: {
  groupId: string;
  date: string;
}) {
  const { data: members, error: membersError } = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_members')
      .select(
        'group_id, user_id, role, display_name, joined_at, last_reminded_at',
      )
      .eq('group_id', params.groupId)
      .order('joined_at', { ascending: true }),
  );

  if (membersError || !members) {
    return { data: null, error: membersError };
  }

  const groupMembers = members as DevotionGroupMember[];
  const userIds = groupMembers.map(member => member.user_id);

  if (!userIds.length) {
    return { data: [], error: null };
  }

  const { data: logs, error: logsError } = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_log')
      .select(
        'user_id, date, completed, reading_book, reading_chapter, chapters_read, selected_chapters, reading_entries',
      )
      .eq('date', params.date)
      .in('user_id', userIds),
  );

  if (logsError) {
    return { data: null, error: logsError };
  }

  const logsByUserId = new Map(
    ((logs ?? []) as GroupDevotionLog[]).map(log => [log.user_id, log]),
  );

  const statuses: GroupMemberStatus[] = groupMembers.map(member => ({
    ...member,
    devotionLog: logsByUserId.get(member.user_id) ?? null,
  }));

  return { data: statuses, error: null };
}

export async function updateDevotionGroupSharedReading(params: {
  groupId: string;
  readingBook: string | null;
  selectedChapters: number[] | null;
  targetDays: number | null;
}) {
  return withExpiredJwtRetry(() =>
    supabase.rpc('set_devotion_group_shared_reading', {
      target_group_id: params.groupId,
      reading_book_input: params.readingBook,
      selected_chapters_input: params.selectedChapters,
      target_days_input: params.targetDays,
    }),
  );
}

export async function removeDevotionGroupMember(params: {
  groupId: string;
  userId: string;
}) {
  return withExpiredJwtRetry(() =>
    supabase.rpc('remove_devotion_group_member', {
      target_group_id: params.groupId,
      target_user_id: params.userId,
    }),
  );
}

export async function updateDevotionGroupMemberRole(params: {
  groupId: string;
  userId: string;
  role: 'leader' | 'member';
}) {
  return withExpiredJwtRetry(() =>
    supabase.rpc('set_devotion_group_member_role', {
      target_group_id: params.groupId,
      target_user_id: params.userId,
      target_role: params.role,
    }),
  );
}

export async function fetchGroupMemberDevotionHistory(params: {
  groupId: string;
  userId: string;
  limit?: number;
}) {
  const { data: member, error: memberError } = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_members')
      .select(
        'group_id, user_id, role, display_name, joined_at, last_reminded_at',
      )
      .eq('group_id', params.groupId)
      .eq('user_id', params.userId)
      .maybeSingle(),
  );

  if (memberError || !member) {
    return { data: null, error: memberError };
  }

  const { data: logs, error: logsError } = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_log')
      .select(
        'user_id, date, completed, reading_book, reading_chapter, chapters_read, selected_chapters, reading_entries, created_at',
      )
      .eq('user_id', params.userId)
      .order('date', { ascending: false })
      .limit(params.limit ?? 60),
  );

  if (logsError) {
    return { data: null, error: logsError };
  }

  return {
    data: {
      member: member as DevotionGroupMember,
      logs: (logs ?? []) as GroupMemberDevotionHistoryItem[],
    },
    error: null,
  };
}

export async function sendGroupReminder(params: {
  groupId: string;
  senderId: string;
  recipientId: string;
  message: string;
}) {
  const { data, error } = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_reminders')
      .insert({
        group_id: params.groupId,
        sender_id: params.senderId,
        recipient_id: params.recipientId,
        message: params.message,
      })
      .select(
        'id, group_id, sender_id, recipient_id, message, created_at, read_at',
      )
      .single(),
  );

  if (error || !data) {
    return { data, error };
  }

  const { error: memberError } = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_members')
      .update({ last_reminded_at: data.created_at })
      .eq('group_id', params.groupId)
      .eq('user_id', params.recipientId),
  );

  return { data, error: memberError };
}

export async function sendGroupRemindersToPending(params: {
  groupId: string;
  message: string;
}) {
  return withExpiredJwtRetry(() =>
    supabase.functions.invoke('send-devotion-group-reminders', {
      body: {
        groupId: params.groupId,
        message: params.message,
      },
    }),
  );
}

export async function notifyDevotionGroupMemberJoined(params: {
  groupId: string;
  displayName: string;
}) {
  return withExpiredJwtRetry(() =>
    supabase.functions.invoke('notify-devotion-group-member-joined', {
      body: {
        groupId: params.groupId,
        displayName: params.displayName,
      },
    }),
  );
}

export async function fetchMyGroupReminders(groupId: string) {
  return withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_reminders')
      .select(
        'id, group_id, sender_id, recipient_id, message, created_at, read_at',
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10),
  );
}
