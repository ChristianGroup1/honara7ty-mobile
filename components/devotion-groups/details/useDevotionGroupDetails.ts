import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStrings } from '../../../localization';
import supabase from '../../../lib/supbase';
import {
  deleteDevotionGroup,
  DevotionGroup,
  fetchDevotionGroupById,
  fetchGroupMembersWithDevotion,
  GroupMemberStatus,
  leaveDevotionGroup,
  removeDevotionGroupMember,
  sendGroupRemindersToPending,
  updateDevotionGroupSharedReading,
  updateDevotionGroupMemberRole,
} from '../../../lib/devotionGroups';
import { refreshDevotionLogs, saveDevotionLog } from '../../../lib/offlineSync';
import { registerPushToken } from '../../../lib/pushTokens';
import {
  getNotificationPermissionState,
  openAppNotificationSettings,
  requestNotificationPermission,
} from '../../../lib/notifications';
import { getTodayDate } from '../../home/utils';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../../data/bibleMetadata';
import {
  normalizeSelectedChapters,
} from '../../shared/chapterSelection';
import { AlertConfig } from '../../shared/CustomAlert';
import { ReadingEntry } from '../../../lib/readingEntries';
import { CUSTOM_TARGET_VALUE } from './constants';
import {
  buildPersonalGroupStats,
  getTargetEditorValue,
  PersonalGroupStats,
} from './utils';

export const useDevotionGroupDetails = (navigation: any, groupId?: string) => {
  const strings = getStrings().devotionGroups;
  const [user, setUser] = useState<any>(null);
  const [group, setGroup] = useState<DevotionGroup | null>(null);
  const [members, setMembers] = useState<GroupMemberStatus[]>([]);
  const [personalStats, setPersonalStats] =
    useState<PersonalGroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharedReadingEditorVisible, setSharedReadingEditorVisible] =
    useState(false);
  const [selectedTestament, setSelectedTestament] = useState<Testament>('old');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number | null>(
    null,
  );
  const [customTargetDays, setCustomTargetDays] = useState('');
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<'allowed' | 'denied' | 'not_determined'>('not_determined');
  const [pushTokenRegistered, setPushTokenRegistered] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });
  const hasGroupRef = useRef(false);
  const requestIdRef = useRef(0);

  const currentMembership = useMemo(
    () => members.find(member => member.user_id === user?.id) ?? null,
    [members, user?.id],
  );
  const isOwner = currentMembership?.role === 'owner';
  const canSendReminders =
    currentMembership?.role === 'owner' || currentMembership?.role === 'leader';
  const canManageMembers = canSendReminders;
  const completedCount = members.filter(
    member => member.devotionLog?.completed,
  ).length;
  const hasSharedReading = Boolean(group?.shared_reading_book);
  const selectedBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === selectedBook),
    [selectedBook],
  );
  const booksForTestament = useMemo(
    () =>
      selectedTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS,
    [selectedTestament],
  );
  const chapterOptions = useMemo(
    () =>
      Array.from(
        { length: selectedBookMeta?.chapters ?? 0 },
        (_, idx) => idx + 1,
      ),
    [selectedBookMeta],
  );
  const canSaveSharedReading = Boolean(
    selectedBook && selectedChapters.length > 0,
  );

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));
  const showError = useCallback((title: string, message: string) => {
    setAlertConfig({ visible: true, title, message, type: 'error' });
  }, []);

  const refreshPushState = (userId?: string | null) => {
    getNotificationPermissionState()
      .then(setNotificationPermissionState)
      .catch(() => setNotificationPermissionState('not_determined'));
    registerPushToken(userId, { requestPermission: false })
      .then(result => setPushTokenRegistered(Boolean(result.registered)))
      .catch(() => setPushTokenRegistered(false));
  };

  const mergeCurrentUserLog = async (
    nextMembers: GroupMemberStatus[],
    userId: string,
    today: string,
  ) => {
    const { data: currentUserLogs } = await refreshDevotionLogs(userId);
    const membership = nextMembers.find(member => member.user_id === userId);
    const todayLog = currentUserLogs[today];
    const nextPersonalStats = buildPersonalGroupStats(
      currentUserLogs,
      membership?.joined_at,
    );
    if (!todayLog) {
      return { members: nextMembers, personalStats: nextPersonalStats };
    }
    return {
      members: nextMembers.map(member =>
        member.user_id === userId
          ? { ...member, devotionLog: { user_id: userId, date: today, ...todayLog } }
          : member,
      ),
      personalStats: nextPersonalStats,
    };
  };

  const loadDetails = useCallback(
    async (showLoader = false, showAlertOnError = false) => {
      if (!groupId) {
        navigation.goBack();
        return;
      }
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      if (showLoader) {
        setLoading(true);
        setGroup(null);
        setMembers([]);
        setPersonalStats(null);
        setSharedReadingEditorVisible(false);
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        if (requestId !== requestIdRef.current) {
          return;
        }
        setUser(sessionUser ?? null);
        refreshPushState(sessionUser?.id);

        const today = getTodayDate();
        const [groupResult, membersResult] = await Promise.allSettled([
          fetchDevotionGroupById(groupId),
          fetchGroupMembersWithDevotion({ groupId, date: today }),
        ]);

        if (groupResult.status === 'rejected' || groupResult.value.error) {
          throw groupResult.status === 'rejected'
            ? groupResult.reason
            : groupResult.value.error;
        }
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (membersResult.status === 'rejected' || membersResult.value.error) {
          setPersonalStats(null);
        } else {
          let nextMembers = membersResult.value.data ?? [];
          if (sessionUser?.id) {
            const merged = await mergeCurrentUserLog(nextMembers, sessionUser.id, today);
            if (requestId !== requestIdRef.current) {
              return;
            }
            nextMembers = merged.members;
            setPersonalStats(merged.personalStats);
          } else {
            setPersonalStats(null);
          }
          setMembers(nextMembers);
        }
        hasGroupRef.current = true;
        setGroup(groupResult.value.data as DevotionGroup);
      } catch (error) {
        if (__DEV__) {
          console.warn('[devotion-groups] failed to refresh group', error);
        }
        if (showAlertOnError || !hasGroupRef.current) {
          showError(strings.genericErrorTitle, strings.genericErrorMessage);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [groupId, navigation, showError, strings.genericErrorMessage, strings.genericErrorTitle],
  );

  useEffect(() => {
    const readingBook = group?.shared_reading_book ?? '';
    const bookMeta = BIBLE_BOOKS.find(book => book.bookName === readingBook);
    const nextTargetDays = group?.shared_target_days ?? null;
    const editorTarget = getTargetEditorValue(nextTargetDays);
    setSelectedBook(readingBook);
    setSelectedTestament(bookMeta?.testament ?? 'old');
    setSelectedChapters(
      bookMeta && Array.isArray(group?.shared_selected_chapters)
        ? normalizeSelectedChapters(
            group.shared_selected_chapters.map(Number),
            bookMeta.chapters,
          )
        : [],
    );
    setSelectedTargetDays(editorTarget);
    setCustomTargetDays(editorTarget === CUSTOM_TARGET_VALUE ? String(nextTargetDays) : '');
  }, [
    group?.shared_reading_book,
    group?.shared_selected_chapters,
    group?.shared_target_days,
  ]);

  useEffect(() => {
    if (selectedBook && selectedBookMeta?.testament !== selectedTestament) {
      setSelectedBook('');
      setSelectedChapters([]);
    }
  }, [selectedBook, selectedBookMeta, selectedTestament]);

  const normalizeTargetDays = () => {
    if (selectedTargetDays !== CUSTOM_TARGET_VALUE) {
      return selectedTargetDays;
    }
    const parsedDays = Number(customTargetDays);
    return Number.isInteger(parsedDays) && parsedDays > 0 ? parsedDays : null;
  };

  const saveSharedReading = async (
    readingBook: string | null,
    selectedChaptersValue: number[] | null,
    targetDays: number | null,
  ) => {
    if (!groupId) {
      return;
    }
    setSaving(true);
    try {
      const { error } = await updateDevotionGroupSharedReading({
        groupId,
        readingBook,
        selectedChapters: selectedChaptersValue,
        targetDays,
      });
      if (error) {
        throw error;
      }
      setSharedReadingEditorVisible(false);
      await loadDetails(false, false);
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSharedReading = async () => {
    if (!canSendReminders || !selectedBookMeta) {
      return;
    }
    const normalizedChapters = normalizeSelectedChapters(
      selectedChapters,
      selectedBookMeta.chapters,
    );
    if (!selectedBook || normalizedChapters.length === 0) {
      setAlertConfig({
        visible: true,
        title: strings.sharedReadingRequiredTitle,
        message: strings.sharedReadingRequiredMessage,
        type: 'warning',
      });
      return;
    }
    const targetDays = normalizeTargetDays();
    if (selectedTargetDays === CUSTOM_TARGET_VALUE && !targetDays) {
      setAlertConfig({
        visible: true,
        title: strings.sharedTargetRequiredTitle,
        message: strings.sharedTargetRequiredMessage,
        type: 'warning',
      });
      return;
    }
    await saveSharedReading(selectedBook, normalizedChapters, targetDays);
  };

  const handleSendPendingReminders = async () => {
    if (!groupId || !canSendReminders) {
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await sendGroupRemindersToPending({
        groupId,
        message: strings.reminderMessage,
      });
      if (error) {
        throw error;
      }
      setAlertConfig({
        visible: true,
        title: strings.pendingRemindersSentTitle,
        message: strings.pendingRemindersSentMessage({
          sent: Number(data?.sent ?? 0),
          pending: Number(data?.pending ?? 0),
          missingTokens: Number(data?.missingTokens ?? 0),
        }),
        type: 'success',
      });
      await loadDetails(false, false);
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    setSaving(true);
    try {
      let nextState = await getNotificationPermissionState();
      setNotificationPermissionState(nextState);
      if (nextState === 'denied') {
        await openAppNotificationSettings();
        nextState = await getNotificationPermissionState();
        setNotificationPermissionState(nextState);
      }
      if (nextState !== 'allowed') {
        await requestNotificationPermission();
        nextState = await getNotificationPermissionState();
        setNotificationPermissionState(nextState);
      }
      const result =
        nextState === 'allowed'
          ? await registerPushToken(user?.id, { requestPermission: false })
          : null;
      setPushTokenRegistered(Boolean(result?.registered));
      setAlertConfig({
        visible: true,
        title: result?.registered
          ? strings.pushRegistrationSuccessTitle
          : strings.pushRegistrationFailedTitle,
        message: result?.registered
          ? strings.pushRegistrationSuccessMessage
          : strings.pushRegistrationFailedMessage,
        type: result?.registered ? 'success' : 'warning',
      });
    } catch {
      setPushTokenRegistered(false);
      setAlertConfig({
        visible: true,
        title: strings.pushRegistrationFailedTitle,
        message: strings.pushRegistrationFailedMessage,
        type: 'warning',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId || !isOwner) {
      return;
    }
    setSaving(true);
    try {
      const { error } = await deleteDevotionGroup(groupId);
      if (error) {
        throw error;
      }
      navigation.goBack();
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || isOwner) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await leaveDevotionGroup({
        groupId,
        userId: user?.id,
      });
      if (error) {
        throw error;
      }
      navigation.navigate('DevotionGroups');
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSetTodayDevotion = async (
    completed: boolean,
    readingEntries: ReadingEntry[] = [],
  ) => {
    if (!user?.id) {
      return;
    }

    setSaving(true);
    try {
      const firstEntry = completed ? readingEntries[0] : null;

      const { offline } = await saveDevotionLog({
        userId: user.id,
        date: getTodayDate(),
        payload: {
          completed,
          reading_book: firstEntry?.reading_book ?? null,
          reading_chapter: completed
            ? firstEntry?.selected_chapters[0] ?? null
            : null,
          chapters_read: completed
            ? firstEntry?.selected_chapters.length || null
            : null,
          selected_chapters: completed
            ? firstEntry?.selected_chapters ?? null
            : null,
          reading_entries: completed ? readingEntries : null,
        },
      });

      await loadDetails(false, false);
      setAlertConfig({
        visible: true,
        title: strings.todayDevotionSavedTitle,
        message: offline
          ? strings.todayDevotionSavedOffline
          : strings.todayDevotionSavedMessage,
        type: 'success',
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('[devotion-groups] failed to save today devotion', error);
      }
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId || !canManageMembers || userId === user?.id) {
      return;
    }
    setSaving(true);
    try {
      const { error } = await removeDevotionGroupMember({ groupId, userId });
      if (error) {
        throw error;
      }
      await loadDetails(false, false);
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSetMemberRole = async (
    userId: string,
    role: 'leader' | 'member',
  ) => {
    if (!groupId || !canManageMembers || userId === user?.id) {
      return;
    }
    setSaving(true);
    try {
      const { error } = await updateDevotionGroupMemberRole({
        groupId,
        userId,
        role,
      });
      if (error) {
        throw error;
      }
      await loadDetails(false, false);
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSetMemberAdmin = (userId: string) =>
    handleSetMemberRole(userId, 'leader');

  const handleUnsetMemberAdmin = (userId: string) =>
    handleSetMemberRole(userId, 'member');

  return {
    state: {
      user, group, members, personalStats, loading, saving, alertConfig,
      sharedReadingEditorVisible, selectedTestament, selectedBook,
      selectedChapters, selectedTargetDays, customTargetDays,
      notificationPermissionState, pushTokenRegistered, isOwner,
      currentMembership, canSendReminders, canManageMembers, completedCount,
      hasSharedReading, booksForTestament,
      chapterOptions, canSaveSharedReading, selectedBookMeta,
    },
    actions: {
      loadDetails, hideAlert, handleEnableNotifications, handleSendPendingReminders,
      handleDeleteGroup, handleLeaveGroup, handleSetTodayDevotion, setAlertConfig,
      setSharedReadingEditorVisible,
      setSelectedTestament, setSelectedBook, setSelectedChapters,
      setSelectedTargetDays, setCustomTargetDays, handleSaveSharedReading,
      saveSharedReading, handleRemoveMember, handleSetMemberAdmin,
      handleUnsetMemberAdmin,
    },
  };
};
