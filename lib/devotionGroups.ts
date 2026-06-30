import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supbase';
import { ReadingEntry } from './readingEntries';
import { isNetworkAvailable } from './networkStatus';

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

export type DevotionGroupPrayerRequest = {
  id: string;
  group_id: string;
  author_id: string;
  author_display_name: string;
  content: string;
  created_at: string;
};

export function buildDevotionGroupInviteLink(inviteCode: string) {
  return `https://honara7ty.space/devotion-group-invite?code=${encodeURIComponent(
    inviteCode.replace(/\s+/g, ''),
  )}`;
}

const myGroupsCacheKey = (userId: string) =>
  `offline_devotion_groups:${userId}`;
const groupCacheKey = (groupId: string) => `offline_devotion_group:${groupId}`;
const groupMembersCacheKey = (groupId: string) =>
  `offline_devotion_group_members:${groupId}`;
const groupMemberCacheKey = (groupId: string, userId: string) =>
  `offline_devotion_group_member:${groupId}:${userId}`;
const groupMembersWithDevotionCacheKey = (groupId: string, date: string) =>
  `offline_devotion_group_member_status:${groupId}:${date}`;
const groupMemberHistoryCacheKey = (groupId: string, userId: string) =>
  `offline_devotion_group_member_history:${groupId}:${userId}`;
const groupPrayerRequestsCacheKey = (groupId: string) =>
  `offline_devotion_group_prayer_requests:${groupId}`;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

async function cacheMyDevotionGroups(groups: DevotionGroup[]) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return;
  }
  await writeJson(myGroupsCacheKey(userId), groups);
  await Promise.all(groups.map(group => cacheDevotionGroup(group)));
}

async function readCachedMyDevotionGroups() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }
  return readJson<DevotionGroup[]>(myGroupsCacheKey(userId), []);
}

async function cacheDevotionGroup(group: DevotionGroup) {
  await writeJson(groupCacheKey(group.id), group);
}

async function removeDevotionGroupFromMyCache(groupId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return;
  }
  const currentGroups = await readJson<DevotionGroup[]>(
    myGroupsCacheKey(userId),
    [],
  );
  await writeJson(
    myGroupsCacheKey(userId),
    currentGroups.filter(group => group.id !== groupId),
  );
}

async function readCachedDevotionGroup(groupId: string) {
  return readJson<DevotionGroup | null>(groupCacheKey(groupId), null);
}

async function cacheGroupMembers(groupId: string, members: DevotionGroupMember[]) {
  await writeJson(groupMembersCacheKey(groupId), members);
  await Promise.all(
    members.map(member =>
      writeJson(groupMemberCacheKey(groupId, member.user_id), member),
    ),
  );
}

async function readCachedGroupMembers(groupId: string) {
  return readJson<DevotionGroupMember[]>(groupMembersCacheKey(groupId), []);
}

async function removeCachedGroupMember(groupId: string, userId: string) {
  const cachedMembers = await readCachedGroupMembers(groupId);
  await writeJson(
    groupMembersCacheKey(groupId),
    cachedMembers.filter(member => member.user_id !== userId),
  );
  await AsyncStorage.removeItem(groupMemberCacheKey(groupId, userId));
  await AsyncStorage.removeItem(groupMemberHistoryCacheKey(groupId, userId));

  const keys = await AsyncStorage.getAllKeys();
  const statusKeys = keys.filter(key =>
    key.startsWith(`offline_devotion_group_member_status:${groupId}:`),
  );
  await Promise.all(
    statusKeys.map(async key => {
      const cachedStatuses = await readJson<GroupMemberStatus[]>(key, []);
      await writeJson(
        key,
        cachedStatuses.filter(member => member.user_id !== userId),
      );
    }),
  );
}

async function updateCachedGroupMemberRole(
  groupId: string,
  userId: string,
  role: 'owner' | 'leader' | 'member',
) {
  const updateMember = <T extends DevotionGroupMember>(member: T): T =>
    member.user_id === userId ? { ...member, role } : member;

  const cachedMembers = await readCachedGroupMembers(groupId);
  await writeJson(groupMembersCacheKey(groupId), cachedMembers.map(updateMember));

  const cachedMember = await readJson<DevotionGroupMember | null>(
    groupMemberCacheKey(groupId, userId),
    null,
  );
  if (cachedMember) {
    await writeJson(groupMemberCacheKey(groupId, userId), {
      ...cachedMember,
      role,
    });
  }

  const cachedHistory = await readCachedGroupMemberHistory(groupId, userId);
  if (cachedHistory) {
    await writeJson(groupMemberHistoryCacheKey(groupId, userId), {
      ...cachedHistory,
      member: { ...cachedHistory.member, role },
    });
  }

  const keys = await AsyncStorage.getAllKeys();
  const statusKeys = keys.filter(key =>
    key.startsWith(`offline_devotion_group_member_status:${groupId}:`),
  );
  await Promise.all(
    statusKeys.map(async key => {
      const cachedStatuses = await readJson<GroupMemberStatus[]>(key, []);
      await writeJson(key, cachedStatuses.map(updateMember));
    }),
  );
}

async function cacheGroupMembersWithDevotion(
  groupId: string,
  date: string,
  statuses: GroupMemberStatus[],
) {
  await writeJson(groupMembersWithDevotionCacheKey(groupId, date), statuses);
  await cacheGroupMembers(groupId, statuses);
}

async function readCachedGroupMembersWithDevotion(
  groupId: string,
  date: string,
) {
  const cachedStatuses = await readJson<GroupMemberStatus[]>(
    groupMembersWithDevotionCacheKey(groupId, date),
    [],
  );
  if (cachedStatuses.length > 0) {
    return cachedStatuses;
  }
  return readCachedGroupMembers(groupId);
}

async function cacheGroupMemberHistory(params: {
  groupId: string;
  member: DevotionGroupMember;
  logs: GroupMemberDevotionHistoryItem[];
}) {
  await writeJson(groupMemberHistoryCacheKey(params.groupId, params.member.user_id), {
    member: params.member,
    logs: params.logs,
  });
  await writeJson(
    groupMemberCacheKey(params.groupId, params.member.user_id),
    params.member,
  );
}

async function readCachedGroupMemberHistory(groupId: string, userId: string) {
  return readJson<{
    member: DevotionGroupMember;
    logs: GroupMemberDevotionHistoryItem[];
  } | null>(groupMemberHistoryCacheKey(groupId, userId), null);
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
  if (!(await isNetworkAvailable())) {
    return { data: await readCachedMyDevotionGroups(), error: null };
  }

  const result = await withExpiredJwtRetry(() =>
    supabase.rpc('my_devotion_groups'),
  );
  if (result.error) {
    return { data: await readCachedMyDevotionGroups(), error: null };
  }

  await cacheMyDevotionGroups((result.data ?? []) as DevotionGroup[]);
  return result;
}

export async function fetchDevotionGroupById(groupId: string) {
  if (!(await isNetworkAvailable())) {
    return { data: await readCachedDevotionGroup(groupId), error: null };
  }

  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_groups')
      .select(
        'id, owner_id, name, invite_code, shared_reading_book, shared_selected_chapters, shared_target_days, created_at',
      )
      .eq('id', groupId)
      .single(),
  );

  if (result.error) {
    return { data: await readCachedDevotionGroup(groupId), error: null };
  }

  if (result.data) {
    await cacheDevotionGroup(result.data as DevotionGroup);
  }
  return result;
}

export async function createDevotionGroup(params: {
  name: string;
  displayName: string;
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase
      .rpc('create_devotion_group', {
        group_name: params.name,
        owner_display_name: params.displayName.trim() || 'قائد مجموعة الخلوة',
      })
      .single(),
  );

  const createdGroup = result.data as DevotionGroup | null;
  if (!result.error && createdGroup?.id) {
    await cacheDevotionGroup(createdGroup);
    const currentGroups = await readCachedMyDevotionGroups();
    await cacheMyDevotionGroups([
      createdGroup,
      ...currentGroups.filter(group => group.id !== createdGroup.id),
    ]);
  }

  return result;
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
    await cacheDevotionGroup(joinedGroup);
    const currentGroups = await readCachedMyDevotionGroups();
    await cacheMyDevotionGroups([
      joinedGroup,
      ...currentGroups.filter(group => group.id !== joinedGroup.id),
    ]);
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
  const result = await withExpiredJwtRetry(() =>
    supabase.from('devotion_groups').delete().eq('id', groupId),
  );
  if (!result.error) {
    await removeDevotionGroupFromMyCache(groupId);
    await AsyncStorage.removeItem(groupCacheKey(groupId));
  }
  return result;
}

export async function leaveDevotionGroup(params: {
  groupId: string;
  userId?: string | null;
}) {
  if (!params.userId) {
    return { data: null, error: new Error('AUTH_REQUIRED') };
  }

  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_members')
      .delete()
      .eq('group_id', params.groupId)
      .eq('user_id', params.userId),
  );
  if (!result.error) {
    await removeDevotionGroupFromMyCache(params.groupId);
  }
  return result;
}

export async function fetchGroupMembersWithDevotion(params: {
  groupId: string;
  date: string;
}) {
  if (!(await isNetworkAvailable())) {
    return {
      data: await readCachedGroupMembersWithDevotion(params.groupId, params.date),
      error: null,
    };
  }

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
    return {
      data: await readCachedGroupMembersWithDevotion(params.groupId, params.date),
      error: null,
    };
  }

  const groupMembers = members as DevotionGroupMember[];
  await cacheGroupMembers(params.groupId, groupMembers);
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
    return {
      data: await readCachedGroupMembersWithDevotion(params.groupId, params.date),
      error: null,
    };
  }

  const logsByUserId = new Map(
    ((logs ?? []) as GroupDevotionLog[]).map(log => [log.user_id, log]),
  );

  const statuses: GroupMemberStatus[] = groupMembers.map(member => ({
    ...member,
    devotionLog: logsByUserId.get(member.user_id) ?? null,
  }));

  await cacheGroupMembersWithDevotion(params.groupId, params.date, statuses);
  return { data: statuses, error: null };
}

export async function fetchDevotionGroupMember(params: {
  groupId: string;
  userId?: string | null;
}) {
  if (!params.userId) {
    return { data: null, error: null };
  }

  const cached = await readJson<DevotionGroupMember | null>(
    groupMemberCacheKey(params.groupId, params.userId),
    null,
  );

  if (!(await isNetworkAvailable())) {
    return { data: cached, error: null };
  }

  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_members')
      .select('group_id, user_id, role, display_name, joined_at, last_reminded_at')
      .eq('group_id', params.groupId)
      .eq('user_id', params.userId)
      .maybeSingle(),
  );

  if (result.error) {
    return { data: cached, error: null };
  }

  if (result.data) {
    await writeJson(
      groupMemberCacheKey(params.groupId, params.userId),
      result.data as DevotionGroupMember,
    );
  }

  return result;
}

export async function updateDevotionGroupSharedReading(params: {
  groupId: string;
  readingBook: string | null;
  selectedChapters: number[] | null;
  targetDays: number | null;
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase.rpc('set_devotion_group_shared_reading', {
      target_group_id: params.groupId,
      reading_book_input: params.readingBook,
      selected_chapters_input: params.selectedChapters,
      target_days_input: params.targetDays,
    }),
  );

  if (!result.error) {
    const cachedGroup = await readCachedDevotionGroup(params.groupId);
    if (cachedGroup) {
      await cacheDevotionGroup({
        ...cachedGroup,
        shared_reading_book: params.readingBook,
        shared_selected_chapters: params.selectedChapters,
        shared_target_days: params.targetDays,
      });
    }
  }

  return result;
}

export async function removeDevotionGroupMember(params: {
  groupId: string;
  userId: string;
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase.rpc('remove_devotion_group_member', {
      target_group_id: params.groupId,
      target_user_id: params.userId,
    }),
  );
  if (!result.error) {
    await removeCachedGroupMember(params.groupId, params.userId);
  }
  return result;
}

export async function updateDevotionGroupMemberRole(params: {
  groupId: string;
  userId: string;
  role: 'leader' | 'member';
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase.rpc('set_devotion_group_member_role', {
      target_group_id: params.groupId,
      target_user_id: params.userId,
      target_role: params.role,
    }),
  );
  if (!result.error) {
    await updateCachedGroupMemberRole(params.groupId, params.userId, params.role);
  }
  return result;
}

export async function fetchDevotionGroupPrayerRequests(groupId: string) {
  if (!(await isNetworkAvailable())) {
    return {
      data: await readJson<DevotionGroupPrayerRequest[]>(
        groupPrayerRequestsCacheKey(groupId),
        [],
      ),
      error: null,
    };
  }

  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_prayer_requests')
      .select('id, group_id, author_id, author_display_name, content, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(20),
  );

  if (result.error) {
    return {
      data: await readJson<DevotionGroupPrayerRequest[]>(
        groupPrayerRequestsCacheKey(groupId),
        [],
      ),
      error: null,
    };
  }

  await writeJson(
    groupPrayerRequestsCacheKey(groupId),
    (result.data ?? []) as DevotionGroupPrayerRequest[],
  );
  return result;
}

export async function createDevotionGroupPrayerRequest(params: {
  groupId: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_prayer_requests')
      .insert({
        group_id: params.groupId,
        author_id: params.authorId,
        author_display_name:
          params.authorDisplayName.trim() || 'عضو في المجموعة',
        content: params.content.trim(),
      })
      .select('id, group_id, author_id, author_display_name, content, created_at')
      .single(),
  );

  const savedRequest = result.data as DevotionGroupPrayerRequest | null;
  if (!result.error && savedRequest?.id) {
    const cached = await readJson<DevotionGroupPrayerRequest[]>(
      groupPrayerRequestsCacheKey(params.groupId),
      [],
    );
    await writeJson(groupPrayerRequestsCacheKey(params.groupId), [
      savedRequest,
      ...cached.filter(request => request.id !== savedRequest.id),
    ]);
  }

  return result;
}

export async function updateDevotionGroupPrayerRequest(params: {
  requestId: string;
  content: string;
}) {
  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_prayer_requests')
      .update({ content: params.content.trim() })
      .eq('id', params.requestId)
      .select('id, group_id, author_id, author_display_name, content, created_at')
      .single(),
  );

  const savedRequest = result.data as DevotionGroupPrayerRequest | null;
  if (!result.error && savedRequest?.group_id) {
    const cached = await readJson<DevotionGroupPrayerRequest[]>(
      groupPrayerRequestsCacheKey(savedRequest.group_id),
      [],
    );
    await writeJson(
      groupPrayerRequestsCacheKey(savedRequest.group_id),
      cached.map(request =>
        request.id === savedRequest.id ? savedRequest : request,
      ),
    );
  }

  return result;
}

export async function deleteDevotionGroupPrayerRequest(requestId: string) {
  const result = await withExpiredJwtRetry(() =>
    supabase
      .from('devotion_group_prayer_requests')
      .delete()
      .eq('id', requestId),
  );

  if (!result.error) {
    const keys = await AsyncStorage.getAllKeys();
    const prayerRequestKeys = keys.filter(key =>
      key.startsWith('offline_devotion_group_prayer_requests:'),
    );
    await Promise.all(
      prayerRequestKeys.map(async key => {
        const cached = await readJson<DevotionGroupPrayerRequest[]>(key, []);
        await writeJson(
          key,
          cached.filter(request => request.id !== requestId),
        );
      }),
    );
  }

  return result;
}

export async function fetchGroupMemberDevotionHistory(params: {
  groupId: string;
  userId: string;
  limit?: number;
}) {
  if (!(await isNetworkAvailable())) {
    return {
      data: await readCachedGroupMemberHistory(params.groupId, params.userId),
      error: null,
    };
  }

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
    return {
      data: await readCachedGroupMemberHistory(params.groupId, params.userId),
      error: null,
    };
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
    return {
      data: await readCachedGroupMemberHistory(params.groupId, params.userId),
      error: null,
    };
  }

  const nextData = {
    member: member as DevotionGroupMember,
    logs: (logs ?? []) as GroupMemberDevotionHistoryItem[],
  };
  await cacheGroupMemberHistory({ groupId: params.groupId, ...nextData });

  return {
    data: nextData,
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
