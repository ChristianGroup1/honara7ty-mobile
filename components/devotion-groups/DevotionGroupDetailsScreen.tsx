import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
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
import { toggleChapterSelection } from '../shared/chapterSelection';
import { CUSTOM_TARGET_VALUE, GOLD, NAVY } from './details/constants';
import {
  InviteCodeCard,
  PersonalStatsCard,
  PushRegistrationCard,
  SharedReadingCard,
  SummaryCards,
} from './details/GroupCards';
import MembersList from './details/MembersList';
import SharedReadingEditorModal from './details/SharedReadingEditorModal';
import { styles } from './details/styles';
import { useDevotionGroupDetails } from './details/useDevotionGroupDetails';

const DevotionGroupDetailsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().devotionGroups;
  const insets = useSafeAreaInsets();
  const groupId = route?.params?.groupId as string | undefined;
  const { state, actions } = useDevotionGroupDetails(navigation, groupId);
  const { loadDetails } = actions;

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
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.deleteGroup,
          style: 'destructive',
          onPress: actions.handleDeleteGroup,
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets.top}
        title={state.group?.name ?? strings.groupDetailsTitle}
        leading={<AppHeaderAction icon="chevron-right" onPress={() => navigation.goBack()} />}
        trailing={
          state.isOwner ? (
            <AppHeaderAction
              icon="trash-can-outline"
              onPress={confirmDeleteGroup}
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
            refreshing={state.loading}
            onRefresh={() => actions.loadDetails(false, false)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {state.group ? (
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
              onCopy={() => Clipboard.setString(state.group?.invite_code ?? '')}
            />
            <SummaryCards
              membersCount={state.members.length}
              completedCount={state.completedCount}
              strings={strings}
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
                <MaterialCommunityIcons name="bell-ring" size={19} color="#FFF" />
                <Text style={styles.pendingReminderButtonText}>
                  {strings.sendPendingReminders}
                </Text>
              </TouchableOpacity>
            ) : null}
            <MembersList
              members={state.members}
              userId={state.user?.id}
              groupId={groupId}
              strings={strings}
              navigation={navigation}
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
