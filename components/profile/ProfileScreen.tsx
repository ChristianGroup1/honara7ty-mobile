import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import supabase from '../../lib/supbase';
import { logoutCurrentUser } from '../../lib/logout';

import CustomAlert, { AlertButton, AlertConfig } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';
import { getStrings } from '../../localization';
import AppHeader from '../shared/AppHeader';
import GradientSurface from '../shared/GradientSurface';
import { headerGradient, NAVY, palette, shadow } from '../shared/designTokens';
import { AppTheme, useNightMode } from '../../lib/nightMode';
import {
  readCachedDevotionLogs,
  readCachedProfileRecord,
  refreshDevotionLogs,
  refreshProfileRecord,
  saveAuthMetadata,
  saveProfileRecord,
} from '../../lib/offlineSync';
import {
  getLevelInfo,
  LevelInfo,
  persistProfileXp,
  summarizeXpFromDevotionLogs,
  XpSummary,
} from '../../lib/xp';

const BG = palette.bg;
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

type PickerType = 'birthDate' | null;

interface EditableProfileForm {
  fullName: string;
  phone: string;
  church: string;
  sect: string;
  birthDate: string;
  gender: string;
}

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseDateString = (value?: string | null): Date => {
  if (!value) {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() - 18);
    return fallback;
  }

  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() - 18);
    return fallback;
  }

  return new Date(year, month - 1, day);
};

const ProfileScreen = ({ navigation }: any) => {
  const strings = getStrings().profile;
  const insets = useSafeAreaInsets();
  const { colors, isNightMode } = useNightMode();
  const styles = useMemo(() => createThemedProfileStyles(colors), [colors]);
  const heroGradientColors = isNightMode
    ? headerGradient.dark
    : headerGradient.light;
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 360;
  const hasLoadedProfileRef = useRef(false);
  const sessionUserRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<EditableProfileForm>({
    fullName: '',
    phone: '',
    church: '',
    sect: '',
    birthDate: '',
    gender: '',
  });
  const [initialForm, setInitialForm] = useState<EditableProfileForm | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentDevotionTime, setCurrentDevotionTime] =
    useState<string>('07:00');
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() - 18);
    return fallback;
  });
  const [fieldErrors, setFieldErrors] = useState<{
    fullName: string;
    phone: string;
  }>({ fullName: '', phone: '' });
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'info',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const applyProfileForm = React.useCallback(
    (currentUser: any, profile: any) => {
      const nextForm: EditableProfileForm = {
        fullName:
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          '',
        phone: currentUser.user_metadata?.phone || '',
        church: profile?.church || '',
        sect: profile?.sect || '',
        birthDate: profile?.birth_date || '',
        gender: profile?.gender || '',
      };

      setCurrentDevotionTime(profile?.devotion_time || '07:00');
      setForm(nextForm);
      setInitialForm(nextForm);
      setPickerDate(parseDateString(nextForm.birthDate));
    },
    [],
  );

  const loadProfile = React.useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        let currentUser = sessionUserRef.current;
        if (!currentUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          currentUser = sessionData?.session?.user;
        }
        if (!currentUser) {
          setUser(null);
          return;
        }

        sessionUserRef.current = currentUser;
        setUser(currentUser);

        const cachedProfile = await readCachedProfileRecord(currentUser.id);
        applyProfileForm(currentUser, cachedProfile);
        setLoading(false);

        const cachedLogs = await readCachedDevotionLogs(currentUser.id);
        setXpSummary(summarizeXpFromDevotionLogs(cachedLogs));

        const { data: profile } = await refreshProfileRecord(currentUser.id);
        applyProfileForm(currentUser, profile);

        const { data: logs } = await refreshDevotionLogs(currentUser.id);
        const freshSummary = summarizeXpFromDevotionLogs(logs);
        setXpSummary(freshSummary);
        persistProfileXp(currentUser.id, freshSummary.xp);
      } finally {
        setLoading(false);
      }
    },
    [applyProfileForm],
  );

  useFocusEffect(
    React.useCallback(() => {
      const shouldShowLoader = !hasLoadedProfileRef.current;
      hasLoadedProfileRef.current = true;
      loadProfile(shouldShowLoader).catch(error => {
        if (__DEV__) {
          console.warn('[profile] failed to refresh profile', error);
        }
      });
    }, [loadProfile]),
  );

  const hasChanges = useMemo(() => {
    if (!initialForm) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const levelInfo = useMemo<LevelInfo | null>(
    () => (xpSummary ? getLevelInfo(xpSummary.completedDays) : null),
    [xpSummary],
  );

  const displayName =
    form.fullName.trim() ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    strings.defaultUser;

  const initials =
    displayName
      .split(' ')
      .filter((word: string) => word.length > 0)
      .slice(0, 2)
      .map((word: string) => word[0] ?? '')
      .join('')
      .toUpperCase() || '🙏';

  const handlePickerOpen = () => {
    setActivePicker('birthDate');
    setPickerDate(parseDateString(form.birthDate));
  };

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setActivePicker(null);
      return;
    }

    if (!selected) {
      return;
    }

    setPickerDate(selected);

    if (Platform.OS === 'android') {
      setForm(prev => ({ ...prev, birthDate: formatDate(selected) }));
      setActivePicker(null);
    }
  };

  const confirmPickerSelection = () => {
    setForm(prev => ({ ...prev, birthDate: formatDate(pickerDate) }));
    setActivePicker(null);
  };

  const handleSave = async () => {
    const trimmedFullName = form.fullName.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedChurch = form.church.trim();
    const trimmedSect = form.sect.trim();
    const nextErrors = { fullName: '', phone: '' };
    let hasError = false;

    if (!trimmedFullName) {
      nextErrors.fullName = strings.validation.fullNameRequired;
      hasError = true;
    }

    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      nextErrors.phone = strings.validation.phoneInvalid;
      hasError = true;
    }

    setFieldErrors(nextErrors);

    if (hasError || !user) {
      return;
    }

    const nextProfilePayload = {
      id: user.id,
      church: trimmedChurch || null,
      sect: trimmedSect || null,
      birth_date: form.birthDate || null,
      gender: form.gender || null,
      devotion_time: currentDevotionTime || '07:00',
      updated_at: new Date().toISOString(),
    };

    const authMetadataChanged =
      (user.user_metadata?.full_name || '') !== trimmedFullName ||
      (user.user_metadata?.phone || '') !== trimmedPhone;

    setSaving(true);
    try {
      const [profileResult, authResult] = await Promise.all([
        saveProfileRecord({
          userId: user.id,
          profile: nextProfilePayload,
        }),
        authMetadataChanged
          ? saveAuthMetadata({
              userId: user.id,
              metadata: {
                ...user.user_metadata,
                full_name: trimmedFullName,
                phone: trimmedPhone || null,
              },
            })
          : Promise.resolve({ offline: false }),
      ]);

      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          full_name: trimmedFullName,
          phone: trimmedPhone || null,
        },
      };

      sessionUserRef.current = updatedUser;
      setUser(updatedUser);

      const normalizedForm: EditableProfileForm = {
        ...form,
        fullName: trimmedFullName,
        phone: trimmedPhone,
        church: trimmedChurch,
        sect: trimmedSect,
      };

      setForm(normalizedForm);
      setInitialForm(normalizedForm);

      showAlert(
        strings.saveSuccessTitle,
        profileResult.offline || authResult.offline
          ? strings.saveOfflineMessage
          : strings.saveSuccessMessage,
        undefined,
        'success',
      );
    } catch (err: any) {
      showAlert(
        strings.saveErrorTitle,
        err.message ?? strings.saveErrorMessage,
        undefined,
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert(
      strings.logoutTitle,
      strings.logoutMessage,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              sessionUserRef.current = null;
              await logoutCurrentUser();
              const parentNavigation = navigation.getParent?.();
              if (parentNavigation) {
                parentNavigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              } else {
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              }
            } catch (err: any) {
              showAlert(
                strings.saveErrorTitle,
                err.message,
                undefined,
                'error',
              );
            }
          },
        },
      ],
      'warning',
    );
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="account-off-outline"
            size={54}
            color={colors.mutedText}
          />
          <Text style={styles.emptyTitle}>{strings.noSessionTitle}</Text>
          <Text style={styles.emptyText}>{strings.noSessionMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader topInsetHeight={insets?.top ?? 0} title={strings.title} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <GradientSurface colors={heroGradientColors} />
          <View style={styles.heroGlow} />
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={16}
                color="#FFF"
              />
            </View>
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.emailText}>{user.email}</Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={15}
                color="#FFF"
              />
              <Text style={styles.heroMetaText}>
                {strings.accountSavedBadge}
              </Text>
            </View>
          </View>
        </View>

        {levelInfo && xpSummary ? (
          <View style={styles.levelCard}>
            <View style={styles.levelTopRow}>
              <View style={styles.levelIconWrap}>
                <MaterialCommunityIcons
                  name="star-four-points"
                  size={22}
                  color="#FFF"
                />
              </View>
              <View style={styles.levelCopy}>
                <Text style={styles.levelTitle}>
                  {strings.level.levelLabel(levelInfo.level)} ·{' '}
                  {levelInfo.title}
                </Text>
                <Text style={styles.levelSubtitle}>
                  {strings.level.cardSubtitle}
                </Text>
              </View>
              <Text style={styles.levelXpValue}>
                {strings.level.xpValue(levelInfo.xp)}
              </Text>
            </View>

            <View style={styles.levelProgressTrack}>
              <View
                style={[
                  styles.levelProgressFill,
                  { width: `${Math.round(levelInfo.progress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.levelToNext}>
              {strings.level.toNext(
                levelInfo.daysToNextLevel,
                levelInfo.nextLevelBonusXp,
              )}
            </Text>

            <View style={styles.levelStatsRow}>
              <View style={styles.levelStatBox}>
                <Text style={styles.levelStatNum}>
                  {xpSummary.completedDays}
                </Text>
                <Text style={styles.levelStatLabel}>
                  {strings.level.daysLabel}
                </Text>
              </View>
              <View style={styles.levelStatDivider} />
              <View style={styles.levelStatBox}>
                <Text style={styles.levelStatNum}>{xpSummary.streak}</Text>
                <Text style={styles.levelStatLabel}>
                  {strings.level.streakLabel}
                </Text>
              </View>
              <View style={styles.levelStatDivider} />
              <View style={styles.levelStatBox}>
                <Text style={styles.levelStatNum}>
                  {xpSummary.earnedBadges}
                </Text>
                <Text style={styles.levelStatLabel}>
                  {strings.level.badgesLabel}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons
                name="account-edit-outline"
                size={18}
                color="#FFF"
              />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>{strings.basicInfoTitle}</Text>
              <Text style={styles.sectionSubtitle}>
                {strings.basicInfoSubtitle}
              </Text>
            </View>
          </View>

          <CustomInput
            fieldLabel={strings.name}
            placeholder={strings.namePlaceholder}
            value={form.fullName}
            onChangeText={text => {
              setForm(prev => ({ ...prev, fullName: text }));
              if (fieldErrors.fullName) {
                setFieldErrors(prev => ({ ...prev, fullName: '' }));
              }
            }}
            icon="account-outline"
            error={fieldErrors.fullName}
          />

          <CustomInput
            fieldLabel={strings.email}
            placeholder={strings.emailPlaceholder}
            value={user.email ?? ''}
            icon="email-outline"
            editable={false}
            badge={strings.fixed}
          />

          <CustomInput
            fieldLabel={strings.phone}
            placeholder={strings.phonePlaceholder}
            value={form.phone}
            onChangeText={text => {
              setForm(prev => ({ ...prev, phone: text }));
              if (fieldErrors.phone) {
                setFieldErrors(prev => ({ ...prev, phone: '' }));
              }
            }}
            icon="phone-outline"
            keyboardType="phone-pad"
            error={fieldErrors.phone}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="church" size={18} color="#FFF" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>{strings.churchTitle}</Text>
              <Text style={styles.sectionSubtitle}>
                {strings.churchSubtitle}
              </Text>
            </View>
          </View>

          <CustomInput
            fieldLabel={strings.church}
            placeholder={strings.churchPlaceholder}
            value={form.church}
            onChangeText={text => setForm(prev => ({ ...prev, church: text }))}
            icon="church"
            badge={strings.optional}
          />

          <CustomInput
            fieldLabel={strings.sect}
            placeholder={strings.sectPlaceholder}
            value={form.sect}
            onChangeText={text => setForm(prev => ({ ...prev, sect: text }))}
            icon="account-group-outline"
            badge={strings.optional}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons
                name="calendar-heart"
                size={18}
                color="#FFF"
              />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>{strings.personalTitle}</Text>
              <Text style={styles.sectionSubtitle}>
                {strings.personalSubtitle}
              </Text>
            </View>
          </View>

          <CustomInput
            fieldLabel={strings.birthDate}
            placeholder={strings.birthDatePlaceholder}
            value={form.birthDate}
            icon="calendar-blank-outline"
            onPress={handlePickerOpen}
          />

          <View style={styles.genderBlock}>
            <Text style={styles.genderLabel}>{strings.gender}</Text>
            <View
              style={[
                styles.genderRow,
                isCompactWidth && styles.genderRowCompact,
              ]}
            >
              {[
                { label: strings.male, icon: 'gender-male' },
                { label: strings.female, icon: 'gender-female' },
              ].map(option => {
                const active = form.gender === option.label;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.genderChip,
                      active && styles.genderChipActive,
                    ]}
                    onPress={() =>
                      setForm(prev => ({ ...prev, gender: option.label }))
                    }
                  >
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={20}
                      color={active ? '#FFF' : colors.mutedText}
                    />
                    <Text
                      style={[
                        styles.genderChipText,
                        active && styles.genderChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!hasChanges || saving) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="content-save-outline"
                size={20}
                color="#FFF"
              />
              <Text style={styles.saveBtnText}>
                {hasChanges ? strings.save : strings.noChanges}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FFF" />
          <Text style={styles.logoutText}>{strings.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      {activePicker && Platform.OS === 'ios' ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHandle} />
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setActivePicker(null)}>
                  <Text style={styles.pickerActionSecondary}>
                    {strings.cancel}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  {strings.datePickerTitle}
                </Text>
                <TouchableOpacity onPress={confirmPickerSelection}>
                  <Text style={styles.pickerActionPrimary}>
                    {strings.confirm}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={handlePickerChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                locale="ar"
                style={styles.pickerSpinner}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {activePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      ) : null}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  topInset: { backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 40 },
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    ...shadow.hero,
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(120,161,189,0.18)',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#78A1BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 30, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    left: -2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#78A1BD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: NAVY,
  },
  displayName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  emailText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroMetaText: {
    color: '#FFF',
    fontSize: 12,

    fontWeight: '700',
  },
  levelCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...shadow.soft,
  },
  levelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  levelIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#78A1BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  levelCopy: { flex: 1 },
  levelTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'left',
  },
  levelSubtitle: {
    color: '#737B86',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    textAlign: 'left',
  },
  levelXpValue: {
    color: '#78A1BD',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  levelProgressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#78A1BD',
  },
  levelToNext: {
    color: '#737B86',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'left',
  },
  levelStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  levelStatBox: { flex: 1, alignItems: 'center' },
  levelStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E7EBF1',
  },
  levelStatNum: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '800',
  },
  levelStatLabel: {
    color: '#737B86',
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 14,
    ...shadow.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#78A1BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'left',
  },
  sectionSubtitle: {
    color: '#737B86',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },
  genderBlock: { marginBottom: 14 },
  genderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 6,
    textAlign: 'left',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderRowCompact: {
    flexDirection: 'column',
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E6EB',
    backgroundColor: '#FAFBFC',
    gap: 8,
  },
  genderChipActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  genderChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5B6270',
  },
  genderChipTextActive: {
    color: '#FFF',
  },
  saveBtn: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
    ...shadow.hero,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: '#E74C3C',
    borderRadius: 18,
    paddingVertical: 17,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingHorizontal: 20,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D8DE',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1F4',
  },
  pickerTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '800',
  },
  pickerActionSecondary: {
    color: '#8B9098',
    fontSize: 15,
  },
  pickerActionPrimary: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '800',
  },
  pickerSpinner: {
    width: '100%',
    height: 220,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: NAVY,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    color: '#79808A',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});

const mergeStyle = (...style: any[]) => StyleSheet.flatten(style);

const createThemedProfileStyles = (colors: AppTheme['colors']) => ({
  ...styles,
  container: mergeStyle(styles.container, {
    backgroundColor: colors.background,
  }),
  loadingContainer: mergeStyle(styles.loadingContainer, {
    backgroundColor: colors.background,
  }),
  content: styles.content,
  levelCard: mergeStyle(styles.levelCard, {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
  }),
  levelTitle: mergeStyle(styles.levelTitle, {
    color: colors.text,
  }),
  levelSubtitle: mergeStyle(styles.levelSubtitle, {
    color: colors.mutedText,
  }),
  levelProgressTrack: mergeStyle(styles.levelProgressTrack, {
    backgroundColor: colors.cardMuted,
  }),
  levelToNext: mergeStyle(styles.levelToNext, {
    color: colors.mutedText,
  }),
  levelStatDivider: mergeStyle(styles.levelStatDivider, {
    backgroundColor: colors.border,
  }),
  levelStatNum: mergeStyle(styles.levelStatNum, {
    color: colors.text,
  }),
  levelStatLabel: mergeStyle(styles.levelStatLabel, {
    color: colors.mutedText,
  }),
  sectionCard: mergeStyle(styles.sectionCard, {
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
  }),
  sectionTitle: mergeStyle(styles.sectionTitle, {
    color: colors.text,
  }),
  sectionSubtitle: mergeStyle(styles.sectionSubtitle, {
    color: colors.mutedText,
  }),
  genderLabel: mergeStyle(styles.genderLabel, {
    color: colors.text,
  }),
  genderChip: mergeStyle(styles.genderChip, {
    backgroundColor: colors.cardMuted,
    borderColor: colors.border,
  }),
  genderChipActive: mergeStyle(styles.genderChipActive, {
    backgroundColor: colors.header,
    borderColor: colors.header,
  }),
  genderChipText: mergeStyle(styles.genderChipText, {
    color: colors.mutedText,
  }),
  saveBtn: mergeStyle(styles.saveBtn, {
    backgroundColor: colors.header,
    shadowColor: colors.shadow,
  }),
  pickerSheet: mergeStyle(styles.pickerSheet, {
    backgroundColor: colors.card,
  }),
  pickerHandle: mergeStyle(styles.pickerHandle, {
    backgroundColor: colors.border,
  }),
  pickerHeader: mergeStyle(styles.pickerHeader, {
    borderBottomColor: colors.border,
  }),
  pickerTitle: mergeStyle(styles.pickerTitle, {
    color: colors.text,
  }),
  pickerActionSecondary: mergeStyle(styles.pickerActionSecondary, {
    color: colors.mutedText,
  }),
  pickerActionPrimary: mergeStyle(styles.pickerActionPrimary, {
    color: colors.accent,
  }),
  emptyTitle: mergeStyle(styles.emptyTitle, {
    color: colors.text,
  }),
  emptyText: mergeStyle(styles.emptyText, {
    color: colors.mutedText,
  }),
});

export default ProfileScreen;
