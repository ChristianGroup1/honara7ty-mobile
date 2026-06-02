import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import CustomAlert from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import {
  normalizeSelectedChapters,
  toggleChapterSelection,
} from '../shared/chapterSelection';
import { CUSTOM_TARGET_VALUE, GOLD, NAVY } from './details/constants';
import {
  InviteCodeCard,
  PersonalStatsCard,
  PushRegistrationCard,
  SharedReadingCard,
  SummaryCards,
  TodayDevotionCard,
} from './details/GroupCards';
import MembersList from './details/MembersList';
import SharedReadingEditorModal from './details/SharedReadingEditorModal';
import { styles } from './details/styles';
import { useDevotionGroupDetails } from './details/useDevotionGroupDetails';
import {
  buildDevotionGroupInviteLink,
  GroupMemberStatus,
} from '../../lib/devotionGroups';
import HomeAnswerSheet from '../home/HomeAnswerSheet';
import {
  BIBLE_BOOKS,
  NEW_TESTAMENT_BOOKS,
  OLD_TESTAMENT_BOOKS,
  Testament,
} from '../data/bibleMetadata';
import {
  mergeReadingDraft,
  ReadingEntry,
  readingEntriesFromLegacy,
} from '../../lib/readingEntries';

const DevotionGroupDetailsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().devotionGroups;
  const homeStrings = getStrings().home;
  const insets = useSafeAreaInsets();
  const groupId = route?.params?.groupId as string | undefined;
  const { state, actions } = useDevotionGroupDetails(navigation, groupId);
  const { loadDetails } = actions;
  const [answerSheetVisible, setAnswerSheetVisible] = useState(false);
  const [pendingCompleted, setPendingCompleted] = useState(true);
  const [answerTestament, setAnswerTestament] = useState<Testament>('old');
  const [answerBook, setAnswerBook] = useState('');
  const [answerChapters, setAnswerChapters] = useState<number[]>([]);
  const [answerReadingEntries, setAnswerReadingEntries] = useState<
    ReadingEntry[]
  >([]);

  const answerBookMeta = useMemo(
    () => BIBLE_BOOKS.find(book => book.bookName === answerBook),
    [answerBook],
  );
  const answerBooks = useMemo(
    () => (answerTestament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS),
    [answerTestament],
  );
  const answerChapterOptions = useMemo(
    () =>
      Array.from(
        { length: answerBookMeta?.chapters ?? 0 },
        (_, index) => index + 1,
      ),
    [answerBookMeta],
  );
  const canSaveAnswer =
    !pendingCompleted ||
    answerReadingEntries.length > 0 ||
    Boolean(answerBook && answerChapters.length > 0);
  const inviteLink = useMemo(
    () =>
      state.group?.invite_code
        ? buildDevotionGroupInviteLink(state.group.invite_code)
        : '',
    [state.group?.invite_code],
  );

  useFocusEffect(
    useCallback(() => {
      loadDetails(true, true);
    }, [loadDetails]),
  );

  const confirmDeleteGroup = () => {
    actions.setAlertConfig({
      visible: true,
      title: strings.deleteGroupTitle,
      message: strings.deleteGroupMessage,
      type: 'warning',
      buttons: [
        {
          text: strings.deleteGroup,
          style: 'destructive',
          onPress: actions.handleDeleteGroup,
        },
        { text: strings.cancel, style: 'cancel' },
      ],
    });
  };

  const confirmLeaveGroup = () => {
    actions.setAlertConfig({
      visible: true,
      title: strings.leaveGroupTitle,
      message: strings.leaveGroupMessage,
      type: 'warning',
      buttons: [
        {
          text: strings.leaveGroup,
          style: 'destructive',
          onPress: actions.handleLeaveGroup,
        },
        { text: strings.cancel, style: 'cancel' },
      ],
    });
  };

  const confirmRemoveMember = (member: GroupMemberStatus) => {
    actions.setAlertConfig({
      visible: true,
      title: strings.removeMemberTitle,
      message: strings.removeMemberMessage(member.display_name),
      type: 'warning',
      buttons: [
        {
          text: strings.removeMember,
          style: 'destructive',
          onPress: () => actions.handleRemoveMember(member.user_id),
        },
        { text: strings.cancel, style: 'cancel' },
      ],
    });
  };

  const confirmSetMemberAdmin = (member: GroupMemberStatus) => {
    actions.setAlertConfig({
      visible: true,
      title: strings.makeMemberAdminTitle,
      message: strings.makeMemberAdminMessage(member.display_name),
      type: 'info',
      buttons: [
        {
          text: strings.makeMemberAdmin,
          onPress: () => actions.handleSetMemberAdmin(member.user_id),
        },
        { text: strings.cancel, style: 'cancel' },
      ],
    });
  };

  const confirmUnsetMemberAdmin = (member: GroupMemberStatus) => {
    actions.setAlertConfig({
      visible: true,
      title: strings.removeMemberAdminTitle,
      message: strings.removeMemberAdminMessage(member.display_name),
      type: 'warning',
      buttons: [
        {
          text: strings.removeMemberAdmin,
          onPress: () => actions.handleUnsetMemberAdmin(member.user_id),
        },
        { text: strings.cancel, style: 'cancel' },
      ],
    });
  };

  const openTodayDevotionSheet = () => {
    const log = state.currentMembership?.devotionLog;
    const existingEntries = log
      ? log.reading_entries ??
        readingEntriesFromLegacy({
          readingBook: log.reading_book,
          readingChapter: log.reading_chapter,
          chaptersRead: log.chapters_read,
          selectedChapters: log.selected_chapters,
        })
      : [];
    const firstEntry = existingEntries[0];
    const fallbackBook = state.group?.shared_reading_book ?? '';
    const fallbackBookMeta = BIBLE_BOOKS.find(
      book => book.bookName === fallbackBook,
    );
    const fallbackChapters =
      fallbackBookMeta && Array.isArray(state.group?.shared_selected_chapters)
        ? normalizeSelectedChapters(
            state.group.shared_selected_chapters.map(Number),
            fallbackBookMeta.chapters,
          )
        : [];
    const nextBook = firstEntry?.reading_book ?? fallbackBook;
    const nextBookMeta = BIBLE_BOOKS.find(book => book.bookName === nextBook);

    setPendingCompleted(log ? Boolean(log.completed) : true);
    setAnswerReadingEntries(existingEntries);
    setAnswerBook(nextBook);
    setAnswerChapters(firstEntry?.selected_chapters ?? fallbackChapters);
    setAnswerTestament(nextBookMeta?.testament ?? 'old');
    setAnswerSheetVisible(true);
  };

  const handleSetAnswerTestament = (value: Testament) => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    if (answerBook && normalizedChapters.length > 0) {
      setAnswerReadingEntries(current =>
        mergeReadingDraft(current, answerBook, normalizedChapters),
      );
    }
    setAnswerTestament(value);
    setAnswerBook('');
    setAnswerChapters([]);
  };

  const handleSetAnswerBook = (nextBook: string) => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    if (answerBook && normalizedChapters.length > 0) {
      setAnswerReadingEntries(current =>
        mergeReadingDraft(current, answerBook, normalizedChapters),
      );
    }
    const existingEntry = answerReadingEntries.find(
      entry => entry.reading_book === nextBook,
    );
    setAnswerBook(nextBook);
    setAnswerChapters(existingEntry?.selected_chapters ?? []);
  };

  const handleAddAnswerReading = () => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    if (!answerBook || normalizedChapters.length === 0) {
      return;
    }
    setAnswerReadingEntries(current =>
      mergeReadingDraft(current, answerBook, normalizedChapters),
    );
    setAnswerBook('');
    setAnswerChapters([]);
  };

  const handleRemoveAnswerReading = (index: number) => {
    setAnswerReadingEntries(current => {
      const removed = current[index];
      if (removed?.reading_book === answerBook) {
        setAnswerBook('');
        setAnswerChapters([]);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSaveTodayDevotion = async () => {
    const normalizedChapters = normalizeSelectedChapters(
      answerChapters,
      answerBookMeta?.chapters ?? 0,
    );
    const nextEntries = pendingCompleted
      ? mergeReadingDraft(answerReadingEntries, answerBook, normalizedChapters)
      : [];
    setAnswerSheetVisible(false);
    await actions.handleSetTodayDevotion(pendingCompleted, nextEntries);
  };

  const shareInviteLink = async () => {
    if (!inviteLink) {
      return;
    }

    try {
      await Share.share({ message: strings.inviteShareMessage(inviteLink) });
    } catch {
      Clipboard.setString(inviteLink);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets.top}
        title={state.group?.name ?? strings.groupDetailsTitle}
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
        trailing={
          state.isOwner ? (
            <AppHeaderAction
              icon="trash-can-outline"
              onPress={confirmDeleteGroup}
              backgroundColor="rgba(255,59,48,0.18)"
            />
          ) : state.currentMembership ? (
            <AppHeaderAction
              icon="logout"
              onPress={confirmLeaveGroup}
              backgroundColor="rgba(255,59,48,0.18)"
            />
          ) : null
        }
        titleNumberOfLines={2}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={state.loading && Boolean(state.group)}
            onRefresh={() => actions.loadDetails(false, false)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {state.loading && !state.group ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : state.group ? (
          <>
            {(state.notificationPermissionState !== 'allowed' ||
              !state.pushTokenRegistered) && (
              <PushRegistrationCard
                notificationPermissionState={state.notificationPermissionState}
                saving={state.saving}
                onPress={actions.handleEnableNotifications}
              />
            )}
            <InviteCodeCard
              group={state.group}
              strings={strings}
              inviteLink={inviteLink}
              onCopy={() => Clipboard.setString(state.group?.invite_code ?? '')}
              onCopyLink={() => Clipboard.setString(inviteLink)}
              onShare={shareInviteLink}
            />
            <SummaryCards
              membersCount={state.members.length}
              completedCount={state.completedCount}
              strings={strings}
            />
            <TodayDevotionCard
              member={state.currentMembership}
              strings={strings}
              saving={state.saving}
              onOpen={openTodayDevotionSheet}
            />
            <PersonalStatsCard stats={state.personalStats} strings={strings} />
            <SharedReadingCard
              group={state.group}
              strings={strings}
              canManage={state.canSendReminders}
              saving={state.saving}
              onEdit={() => actions.setSharedReadingEditorVisible(true)}
            />
            {state.canSendReminders ? (
              <TouchableOpacity
                style={styles.pendingReminderButton}
                onPress={actions.handleSendPendingReminders}
                disabled={state.saving}
              >
                <MaterialCommunityIcons
                  name="bell-ring"
                  size={19}
                  color="#FFF"
                />
                <Text style={styles.pendingReminderButtonText}>
                  {strings.sendPendingReminders}
                </Text>
              </TouchableOpacity>
            ) : null}
            {!state.isOwner && state.currentMembership ? (
              <TouchableOpacity
                style={styles.leaveGroupButton}
                onPress={confirmLeaveGroup}
                disabled={state.saving}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={19}
                  color="#B42318"
                />
                <Text style={styles.leaveGroupButtonText}>
                  {strings.leaveGroup}
                </Text>
              </TouchableOpacity>
            ) : null}
            <MembersList
              members={state.members}
              userId={state.user?.id}
              groupId={groupId}
              strings={strings}
              navigation={navigation}
              canManageMembers={state.canManageMembers}
              saving={state.saving}
              onConfirmRemoveMember={confirmRemoveMember}
              onConfirmSetMemberAdmin={confirmSetMemberAdmin}
              onConfirmUnsetMemberAdmin={confirmUnsetMemberAdmin}
            />
          </>
        ) : null}
      </ScrollView>

      {state.saving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : null}
      <CustomAlert {...state.alertConfig} onDismiss={actions.hideAlert} />
      <HomeAnswerSheet
        visible={answerSheetVisible}
        strings={homeStrings}
        pendingCompleted={pendingCompleted}
        selectedTestament={answerTestament}
        books={answerBooks}
        readingBook={answerBook}
        chapterOptions={answerChapterOptions}
        selectedChapters={answerChapters}
        readingEntries={answerReadingEntries}
        canSaveReading={canSaveAnswer}
        onClose={() => setAnswerSheetVisible(false)}
        onSetPendingCompleted={setPendingCompleted}
        onSetSelectedTestament={handleSetAnswerTestament}
        onSetReadingBook={handleSetAnswerBook}
        onToggleChapter={chapter =>
          setAnswerChapters(current =>
            toggleChapterSelection(
              current,
              chapter,
              answerBookMeta?.chapters ?? 0,
            ),
          )
        }
        onAddReadingEntry={handleAddAnswerReading}
        onRemoveReadingEntry={handleRemoveAnswerReading}
        onSave={handleSaveTodayDevotion}
      />
      <SharedReadingEditorModal
        visible={state.sharedReadingEditorVisible}
        strings={strings}
        saving={state.saving}
        hasSharedReading={state.hasSharedReading}
        selectedTestament={state.selectedTestament}
        selectedBook={state.selectedBook}
        selectedChapters={state.selectedChapters}
        selectedTargetDays={state.selectedTargetDays}
        customTargetDays={state.customTargetDays}
        booksForTestament={state.booksForTestament}
        chapterOptions={state.chapterOptions}
        canSave={state.canSaveSharedReading}
        onClose={() => actions.setSharedReadingEditorVisible(false)}
        onClear={() => actions.saveSharedReading(null, null, null)}
        onSave={actions.handleSaveSharedReading}
        onSetTestament={actions.setSelectedTestament}
        onSetBook={actions.setSelectedBook}
        onClearChapters={() => actions.setSelectedChapters([])}
        onToggleChapter={chapter =>
          actions.setSelectedChapters(current =>
            toggleChapterSelection(
              current,
              chapter,
              state.selectedBookMeta?.chapters ?? 1,
            ),
          )
        }
        onSelectAllChapters={() =>
          state.selectedBookMeta &&
          actions.setSelectedChapters(
            Array.from(
              { length: state.selectedBookMeta.chapters },
              (_, idx) => idx + 1,
            ),
          )
        }
        onSelectTargetDays={targetDays => {
          actions.setSelectedTargetDays(targetDays);
          if (targetDays !== CUSTOM_TARGET_VALUE) {
            actions.setCustomTargetDays('');
          }
        }}
        onSetCustomTargetDays={actions.setCustomTargetDays}
      />
    </SafeAreaView>
  );
};

export default DevotionGroupDetailsScreen;
