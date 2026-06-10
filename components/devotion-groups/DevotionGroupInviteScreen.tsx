import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import CustomAlert, { AlertConfig } from '../shared/CustomAlert';
import { getStrings } from '../../localization';
import { getDisplayName } from '../home/utils';
import supabase from '../../lib/supbase';
import {
  DevotionGroup,
  fetchMyDevotionGroups,
  joinDevotionGroupByCode,
} from '../../lib/devotionGroups';

const NAVY = '#0A1124';
const GOLD = '#78A1BD';
const BG = '#F2F4F8';

const DevotionGroupInviteScreen = ({ navigation, route }: any) => {
  const strings = getStrings().devotionGroups;
  const insets = useSafeAreaInsets();
  const inviteCode = String(route?.params?.inviteCode ?? '').replace(
    /\s+/g,
    '',
  );
  const [saving, setSaving] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [existingGroup, setExistingGroup] = useState<DevotionGroup | null>(
    null,
  );
  const [alreadyJoinedAlertShown, setAlreadyJoinedAlertShown] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const checkExistingMembership = useCallback(async () => {
    if (!inviteCode) {
      setCheckingMembership(false);
      return;
    }

    setCheckingMembership(true);
    try {
      const { data, error } = await fetchMyDevotionGroups();
      if (error) {
        throw error;
      }

      const matchedGroup =
        ((data ?? []) as DevotionGroup[]).find(
          group => group.invite_code === inviteCode,
        ) ?? null;
      setExistingGroup(matchedGroup);

      if (matchedGroup && !alreadyJoinedAlertShown) {
        setAlreadyJoinedAlertShown(true);
        setAlertConfig({
          visible: true,
          title: strings.alreadyJoinedGroupTitle,
          message: strings.alreadyJoinedGroup,
          type: 'success',
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(
          '[devotion-groups] failed to check invite membership',
          error,
        );
      }
    } finally {
      setCheckingMembership(false);
    }
  }, [
    alreadyJoinedAlertShown,
    inviteCode,
    strings.alreadyJoinedGroup,
    strings.alreadyJoinedGroupTitle,
  ]);

  useEffect(() => {
    checkExistingMembership();
  }, [checkExistingMembership]);

  const openExistingGroup = () => {
    if (existingGroup?.id) {
      navigation.navigate('DevotionGroupDetails', {
        groupId: existingGroup.id,
      });
      return;
    }

    navigation.navigate('DevotionGroups');
  };

  const goHome = () => {
    navigation.navigate('Home');
  };

  const acceptInvite = async () => {
    if (existingGroup) {
      openExistingGroup();
      return;
    }

    if (!inviteCode) {
      setAlertConfig({
        visible: true,
        title: strings.invalidInviteCodeTitle,
        message: strings.genericErrorMessage,
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      const { data, error } = await joinDevotionGroupByCode({
        code: inviteCode,
        displayName: getDisplayName(user),
      });

      if (error) {
        throw error;
      }

      navigation.navigate('DevotionGroups', { joinSuccess: Boolean(data) });
    } catch (error: any) {
      if (String(error?.message ?? '').includes('INVALID_INVITE_CODE')) {
        setAlertConfig({
          visible: true,
          title: strings.invalidInviteCodeTitle,
          message: strings.genericErrorMessage,
          type: 'error',
        });
      } else {
        setAlertConfig({
          visible: true,
          title: strings.genericErrorTitle,
          message: strings.genericErrorMessage,
          type: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const alreadyJoined = Boolean(existingGroup);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets.top}
        title={strings.inviteScreenTitle}
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconWrap,
              alreadyJoined ? styles.iconWrapSuccess : undefined,
            ]}
          >
            <MaterialCommunityIcons
              name={
                alreadyJoined ? 'check-circle-outline' : 'account-heart-outline'
              }
              size={34}
              color={alreadyJoined ? '#2E8B57' : '#FFF'}
            />
          </View>

          <Text style={styles.title}>
            {alreadyJoined
              ? strings.alreadyJoinedGroupTitle
              : strings.inviteScreenHeading}
          </Text>
          <Text style={styles.body}>
            {alreadyJoined
              ? strings.alreadyJoinedGroupMessage
              : strings.inviteScreenBody}
          </Text>

          <View style={styles.codePill}>
            <Text style={styles.codeLabel}>{strings.inviteCode}</Text>
            <Text style={styles.codeText}>{inviteCode || '-'}</Text>
          </View>

          {checkingMembership ? (
            <View style={styles.checkingRow}>
              <ActivityIndicator color={GOLD} />
              <Text style={styles.checkingText}>
                {strings.checkingInviteStatus}
              </Text>
            </View>
          ) : alreadyJoined ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.84}
                onPress={openExistingGroup}
              >
                <Text style={styles.primaryButtonText}>
                  {strings.openGroup}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.84}
                onPress={goHome}
              >
                <Text style={styles.secondaryButtonText}>{strings.goHome}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.disabledButton]}
                activeOpacity={0.84}
                onPress={acceptInvite}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {strings.acceptInvite}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.84}
                onPress={goHome}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>
                  {strings.declineInvite}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.07)',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#78A1BD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconWrapSuccess: {
    backgroundColor: 'rgba(46,139,87,0.12)',
  },
  title: {
    color: NAVY,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    color: '#626A75',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10,
  },
  codePill: {
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: '#F4F6FA',
    padding: 14,
    alignItems: 'center',
  },
  codeLabel: {
    color: '#7A818B',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  codeText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
  },
  checkingRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkingText: {
    color: '#626A75',
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
});

export default DevotionGroupInviteScreen;
