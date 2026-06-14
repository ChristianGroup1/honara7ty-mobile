import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import CustomAlert from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import supabase from '../../lib/supbase';
import {
  createDevotionGroupPrayerRequest,
  deleteDevotionGroupPrayerRequest,
  DevotionGroupMember,
  DevotionGroupPrayerRequest,
  fetchDevotionGroupPrayerRequests,
  updateDevotionGroupPrayerRequest,
} from '../../lib/devotionGroups';

import { BG, GOLD, NAVY } from '../shared/designTokens';

const formatRequestDate = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const DevotionGroupPrayerRequestsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().devotionGroups;
  const insets = useSafeAreaInsets();
  const groupId = route?.params?.groupId as string | undefined;
  const groupName = route?.params?.groupName as string | undefined;
  const [userId, setUserId] = useState<string | null>(null);
  const [membership, setMembership] = useState<DevotionGroupMember | null>(null);
  const [requests, setRequests] = useState<DevotionGroupPrayerRequest[]>([]);
  const [text, setText] = useState('');
  const [editingRequest, setEditingRequest] =
    useState<DevotionGroupPrayerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasLoadedRequestsRef = useRef(false);
  const [alertConfig, setAlertConfig] = useState<any>({
    visible: false,
    title: '',
  });

  const canSubmit = Boolean(text.trim()) && !saving;
  const canManageRequests =
    membership?.role === 'owner' || membership?.role === 'leader';

  const loadRequests = useCallback(
    async ({
      showLoader = false,
      showRefreshing = false,
    }: { showLoader?: boolean; showRefreshing?: boolean } = {}) => {
      if (!groupId) {
        navigation.goBack();
        return;
      }

      if (showLoader) {
        setLoading(true);
      }
      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const nextUserId = sessionData?.session?.user?.id ?? null;
        setUserId(nextUserId);

        const [{ data: nextRequests, error }, { data: member }] =
          await Promise.all([
            fetchDevotionGroupPrayerRequests(groupId),
            supabase
              .from('devotion_group_members')
              .select('group_id, user_id, role, display_name, joined_at, last_reminded_at')
              .eq('group_id', groupId)
              .eq('user_id', nextUserId)
              .maybeSingle(),
          ]);

        if (error) {
          throw error;
        }

        setRequests((nextRequests ?? []) as DevotionGroupPrayerRequest[]);
        setMembership((member as DevotionGroupMember | null) ?? null);
      } catch {
        setAlertConfig({
          visible: true,
          title: strings.genericErrorTitle,
          message: strings.genericErrorMessage,
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, navigation, strings.genericErrorMessage, strings.genericErrorTitle],
  );

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedRequestsRef.current;
      hasLoadedRequestsRef.current = true;
      loadRequests({ showLoader: shouldShowLoader });
    }, [loadRequests]),
  );

  const resetEditor = () => {
    setText('');
    setEditingRequest(null);
  };

  const handleSubmit = async () => {
    const content = text.trim();
    if (!groupId || !userId || !membership || !content) {
      return;
    }

    setSaving(true);
    try {
      const result = editingRequest
        ? await updateDevotionGroupPrayerRequest({
            requestId: editingRequest.id,
            content,
          })
        : await createDevotionGroupPrayerRequest({
            groupId,
            authorId: userId,
            authorDisplayName: membership.display_name,
            content,
          });

      if (result.error) {
        throw result.error;
      }

      const savedRequest = result.data as DevotionGroupPrayerRequest;
      setRequests(current =>
        editingRequest
          ? current.map(item =>
              item.id === savedRequest.id ? savedRequest : item,
            )
          : [savedRequest, ...current],
      );
      resetEditor();
    } catch {
      setAlertConfig({
        visible: true,
        title: strings.genericErrorTitle,
        message: strings.genericErrorMessage,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (request: DevotionGroupPrayerRequest) => {
    setEditingRequest(request);
    setText(request.content);
  };

  const confirmDelete = (request: DevotionGroupPrayerRequest) => {
    setAlertConfig({
      visible: true,
      title: strings.deletePrayerRequestTitle,
      message: strings.deletePrayerRequestMessage,
      type: 'warning',
      buttons: [
        {
          text: strings.deletePrayerRequest,
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await deleteDevotionGroupPrayerRequest(
                request.id,
              );
              if (error) {
                throw error;
              }
              setRequests(current =>
                current.filter(item => item.id !== request.id),
              );
              if (editingRequest?.id === request.id) {
                resetEditor();
              }
            } catch {
              setAlertConfig({
                visible: true,
                title: strings.genericErrorTitle,
                message: strings.genericErrorMessage,
                type: 'error',
              });
            } finally {
              setSaving(false);
            }
          },
        },
        { text: strings.cancel, style: 'cancel' },
      ],
    });
  };

  const renderRequest = ({ item }: { item: DevotionGroupPrayerRequest }) => {
    const isAuthor = item.author_id === userId;
    const canEdit = isAuthor;
    const canDelete = isAuthor || canManageRequests;

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestTopRow}>
          <View style={styles.requestIcon}>
            <MaterialCommunityIcons name="hands-pray" size={18} color="#FFF" />
          </View>
          <View style={styles.requestMeta}>
            <Text style={styles.requestAuthor} numberOfLines={1}>
              {item.author_display_name}
            </Text>
            <Text style={styles.requestDate}>
              {formatRequestDate(item.created_at)}
            </Text>
          </View>
        </View>
        <Text style={styles.requestText}>{item.content}</Text>
        {canEdit || canDelete ? (
          <View style={styles.requestActions}>
            {canEdit ? (
              <TouchableOpacity
                style={styles.requestActionButton}
                onPress={() => startEdit(item)}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.requestActionText}>
                  {strings.editPrayerRequest}
                </Text>
              </TouchableOpacity>
            ) : null}
            {canDelete ? (
              <TouchableOpacity
                style={[styles.requestActionButton, styles.deleteButton]}
                onPress={() => confirmDelete(item)}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={16}
                  color="#B42318"
                />
                <Text style={styles.deleteButtonText}>
                  {strings.deletePrayerRequest}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const listHeader = (
    <View style={styles.editorCard}>
      <View style={styles.editorHeader}>
        <View style={styles.editorIcon}>
          <MaterialCommunityIcons name="send" size={20} color="#FFF" />
        </View>
        <View style={styles.editorCopy}>
          <Text style={styles.editorTitle}>
            {editingRequest
              ? strings.editPrayerRequestTitle
              : strings.sharePrayerRequest}
          </Text>
          <Text style={styles.editorSubtitle}>
            {strings.groupPrayerRequestsSubtitle}
          </Text>
        </View>
      </View>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={strings.groupPrayerRequestPlaceholder}
        placeholderTextColor="#8A94A3"
        multiline
        maxLength={1000}
        textAlign="right"
        textAlignVertical="top"
      />
      <View style={styles.editorActions}>
        {editingRequest ? (
          <TouchableOpacity style={styles.cancelButton} onPress={resetEditor}>
            <Text style={styles.cancelButtonText}>{strings.cancel}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editingRequest
                ? strings.savePrayerRequest
                : strings.sharePrayerRequest}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets.top}
        title={groupName ?? strings.groupPrayerRequestsTitle}
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
        titleNumberOfLines={2}
      />

      {loading && requests.length === 0 ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderRequest}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{strings.emptyGroupPrayerRequests}</Text>
          }
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRequests({ showRefreshing: true })}
            />
          }
        />
      )}

      <CustomAlert
        {...alertConfig}
        onDismiss={() =>
          setAlertConfig((current: any) => ({ ...current, visible: false }))
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 36 },
  loadingBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editorCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  editorHeader: { flexDirection: 'row', alignItems: 'center' },
  editorIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorCopy: { flex: 1, marginHorizontal: 10 },
  editorTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'left',
  },
  editorSubtitle: {
    color: '#5F6874',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    textAlign: 'left',
  },
  input: {
    minHeight: 108,
    backgroundColor: '#F6F8FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.08)',
    color: NAVY,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginTop: 12,
  },
  editorActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  submitButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.48 },
  submitButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  cancelButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2F8',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: NAVY, fontSize: 13, fontWeight: '900' },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  requestTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  requestIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestMeta: { flex: 1, marginHorizontal: 10 },
  requestAuthor: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'left',
  },
  requestDate: {
    color: '#7A818B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'left',
  },
  requestText: {
    color: '#445064',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10,17,36,0.08)',
  },
  requestActionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  requestActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.16)',
  },
  deleteButtonText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: '#7A818B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default DevotionGroupPrayerRequestsScreen;
