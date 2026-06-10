import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import CustomAlert, { AlertConfig } from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import { getDisplayName } from '../home/utils';
import {
  createDevotionGroup,
  DevotionGroup,
  fetchMyDevotionGroups,
  joinDevotionGroupByCode,
} from '../../lib/devotionGroups';

const NAVY = '#0A1124';
const GOLD = '#78A1BD';
const BG = '#F2F4F8';
type ActionMode = 'create' | 'join';

const DevotionGroupsScreen = ({ navigation, route }: any) => {
  const strings = getStrings().devotionGroups;
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<DevotionGroup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [actionMode, setActionMode] = useState<ActionMode>('join');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });
  const hasGroupsRef = useRef(false);
  const hasLoadedGroupsRef = useRef(false);
  const sessionUserRef = useRef<any>(null);

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const showError = useCallback((title: string, message: string) => {
    setAlertConfig({ visible: true, title, message, type: 'error' });
  }, []);

  const loadGroups = useCallback(
    async (showLoader = false, showAlertOnError = false) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        let sessionUser = sessionUserRef.current;
        if (!sessionUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          sessionUser = sessionData?.session?.user;
        }

        sessionUserRef.current = sessionUser ?? null;
        setUser(sessionUser ?? null);

        if (!sessionUser?.id) {
          setGroups([]);
          return;
        }

        const { data, error } = await fetchMyDevotionGroups();
        if (error) {
          throw error;
        }

        const nextGroups = (data ?? []) as DevotionGroup[];
        hasGroupsRef.current = nextGroups.length > 0;
        setGroups(nextGroups);
      } catch (error) {
        if (__DEV__) {
          console.warn('[devotion-groups] failed to refresh groups', error);
        }
        if (showAlertOnError || !hasGroupsRef.current) {
          showError(strings.genericErrorTitle, strings.genericErrorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [showError, strings.genericErrorMessage, strings.genericErrorTitle],
  );

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedGroupsRef.current;
      hasLoadedGroupsRef.current = true;
      loadGroups(shouldShowLoader, shouldShowLoader);
    }, [loadGroups]),
  );

  useEffect(() => {
    if (!route?.params?.joinSuccess) {
      return;
    }

    setAlertConfig({
      visible: true,
      title: strings.joinSuccessTitle,
      message: strings.joinSuccessMessage,
      type: 'success',
    });
    navigation.setParams({ joinSuccess: undefined });
  }, [
    navigation,
    route?.params?.joinSuccess,
    strings.joinSuccessMessage,
    strings.joinSuccessTitle,
  ]);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      setAlertConfig({
        visible: true,
        title: strings.missingGroupNameTitle,
        message: strings.missingGroupNameMessage,
        type: 'warning',
      });
      return;
    }

    if (!user?.id) {
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await createDevotionGroup({
        name: groupName,
        displayName: getDisplayName(user),
      });

      if (error) {
        throw error;
      }

      setGroupName('');
      await loadGroups(false, false);

      const createdGroup = data as DevotionGroup | null;
      if (createdGroup?.id) {
        navigation.navigate('DevotionGroupDetails', {
          groupId: createdGroup.id,
        });
      }
    } catch {
      showError(strings.genericErrorTitle, strings.genericErrorMessage);
    } finally {
      setSaving(false);
    }
  }, [
    groupName,
    loadGroups,
    navigation,
    showError,
    strings.genericErrorMessage,
    strings.genericErrorTitle,
    strings.missingGroupNameMessage,
    strings.missingGroupNameTitle,
    user,
  ]);

  const handleJoinGroup = useCallback(async () => {
    if (!inviteCode.trim()) {
      setAlertConfig({
        visible: true,
        title: strings.missingInviteCodeTitle,
        message: strings.missingInviteCodeMessage,
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await joinDevotionGroupByCode({
        code: inviteCode,
        displayName: getDisplayName(user),
      });

      if (error) {
        throw error;
      }

      setInviteCode('');
      await loadGroups(false, false);

      const joinedGroup = data as DevotionGroup | null;
      if (joinedGroup?.id) {
        navigation.navigate('DevotionGroupDetails', {
          groupId: joinedGroup.id,
        });
      }
    } catch (error: any) {
      if (String(error?.message ?? '').includes('INVALID_INVITE_CODE')) {
        showError(strings.invalidInviteCodeTitle, strings.genericErrorMessage);
      } else {
        showError(strings.genericErrorTitle, strings.genericErrorMessage);
      }
    } finally {
      setSaving(false);
    }
  }, [
    inviteCode,
    loadGroups,
    navigation,
    showError,
    strings.genericErrorMessage,
    strings.genericErrorTitle,
    strings.invalidInviteCodeTitle,
    strings.missingInviteCodeMessage,
    strings.missingInviteCodeTitle,
    user,
  ]);

  const renderGroup = useCallback(
    ({ item: group }: { item: DevotionGroup }) => (
      <TouchableOpacity
        style={styles.groupCard}
        activeOpacity={0.82}
        onPress={() =>
          navigation.navigate('DevotionGroupDetails', {
            groupId: group.id,
          })
        }
      >
        <View style={styles.groupIcon}>
          <MaterialCommunityIcons name="account-group" size={22} color={GOLD} />
        </View>
        <View style={styles.groupBody}>
          <Text style={styles.groupName}>{group.name}</Text>
          <View style={styles.invitePill}>
            <MaterialCommunityIcons name="key-variant" size={13} color={GOLD} />
            <Text style={styles.groupMeta}>
              {strings.inviteCode}: {group.invite_code}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={22} color="#9AA3AE" />
      </TouchableOpacity>
    ),
    [navigation, strings.inviteCode],
  );

  const renderHeader = useCallback(
    () => (
      <>
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={28}
                color={GOLD}
              />
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {groups.length} {strings.groupsCount}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
          <Text style={styles.heroText}>{strings.heroText}</Text>
        </View>

        <View style={styles.actionPanel}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                actionMode === 'join' && styles.segmentButtonActive,
              ]}
              activeOpacity={0.84}
              onPress={() => setActionMode('join')}
            >
              <MaterialCommunityIcons
                name="login"
                size={18}
                color={actionMode === 'join' ? '#FFF' : NAVY}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  actionMode === 'join' && styles.segmentButtonTextActive,
                ]}
              >
                {strings.joinTitle}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                actionMode === 'create' && styles.segmentButtonActive,
              ]}
              activeOpacity={0.84}
              onPress={() => setActionMode('create')}
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={18}
                color={actionMode === 'create' ? '#FFF' : NAVY}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  actionMode === 'create' && styles.segmentButtonTextActive,
                ]}
              >
                {strings.createTitle}
              </Text>
            </TouchableOpacity>
          </View>

          {actionMode === 'create' ? (
            <>
              <TextInput
                style={[styles.input, styles.inviteInput]}
                value={groupName}
                onChangeText={setGroupName}
                placeholder={strings.groupNamePlaceholder}
                placeholderTextColor="#98A2B3"
                autoCapitalize="characters"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateGroup}
                disabled={saving}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}>{strings.create}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.input, styles.inviteInput]}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder={strings.inviteCodePlaceholder}
                placeholderTextColor="#98A2B3"
                autoCapitalize="characters"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleJoinGroup}
                disabled={saving}
              >
                <MaterialCommunityIcons name="login" size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}>{strings.join}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{strings.myGroupsTitle}</Text>
          <Text style={styles.sectionCaption}>
            {groups.length} {strings.groupsCount}
          </Text>
        </View>
      </>
    ),
    [
      actionMode,
      groupName,
      groups.length,
      handleCreateGroup,
      handleJoinGroup,
      inviteCode,
      saving,
      strings,
    ],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={24}
            color={GOLD}
          />
        </View>
        <Text style={styles.emptyText}>{strings.emptyGroups}</Text>
      </View>
    ),
    [strings.emptyGroups],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets.top}
        title={strings.title}
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
      />

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={group => group.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadGroups(false, false)}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />

      {saving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : null}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        dismissOnBackdrop={alertConfig.dismissOnBackdrop}
        onDismiss={hideAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -42,
    left: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(120,161,189,0.14)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBadgeText: {
    color: '#FFF4D6',
    fontSize: 12,
    fontWeight: '900',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'left',
    marginBottom: 8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'left',
  },
  actionPanel: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F4F6FA',
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: NAVY,
  },
  segmentButtonText: {
    flexShrink: 1,
    color: NAVY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentButtonTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#F6F8FC',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    color: NAVY,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  inviteInput: {
    letterSpacing: 1,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'left',
  },
  sectionCaption: {
    color: '#7A818B',
    fontSize: 12,
    fontWeight: '800',
  },
  groupCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(120,161,189,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBody: { flex: 1, marginHorizontal: 10 },
  groupName: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'left',
  },
  groupMeta: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'left',
  },
  invitePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF8E5',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF8E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#7A818B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginVertical: 12,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,17,36,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DevotionGroupsScreen;
