import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase'; // ← استورد supabase
import { trackEvent, identifyUser } from '../../lib/analytics';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';
import { authPaperTheme, AUTH_GOLD } from '../auth/theme';
import AuthScreenShell from '../auth/AuthScreenShell';
import { authStrings } from '../auth/strings';
import { saveProfileRecord } from '../../lib/offlineSync';

const ProfileCompletionUI: React.FC<any> = ({ navigation, route }) => {
  const strings = authStrings;
  const { width: windowWidth } = useWindowDimensions();
  const isCompactWidth = windowWidth < 360;
  const requiresLoginBeforeSubmit =
    route?.params?.requires_login_before_submit === true;
  const pendingEmail = route?.params?.email as string | undefined;

  const [profileData, setProfileData] = useState({
    church: '',
    sect: '',
    birthDate: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // The actual Date object driving the picker; defaults to 18 years ago.
  const [pickerDate, setPickerDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  });
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const formatDate = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (selected) {
      setPickerDate(selected);
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
        setProfileData({ ...profileData, birthDate: formatDate(selected) });
      }
    }
  };

  const confirmDate = () => {
    setShowDatePicker(false);
    setProfileData({ ...profileData, birthDate: formatDate(pickerDate) });
  };

  const profileNotice = useMemo(() => {
    if (!requiresLoginBeforeSubmit) {
      return null;
    }

    return pendingEmail
      ? strings.profileCompletion.requiresLoginNotice(pendingEmail)
      : strings.profileCompletion.requiresLoginNotice();
  }, [pendingEmail, requiresLoginBeforeSubmit]);

  // ✅ دالة حفظ البروفايل في Supabase
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      // ✅ تأكد إن اليوزر logged in فعلاً
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (!currentUserId) {
        showAlert(
          strings.profileCompletion.requiresLoginTitle,
          strings.profileCompletion.requiresLoginMessage,
          [
            {
              text: strings.common.login,
              onPress: () => navigation.navigate('Login'),
            },
          ],
          'warning',
        );
        return;
      }

      const result = await saveProfileRecord({
        userId: currentUserId,
        profile: {
          church: profileData.church || null,
          sect: profileData.sect || null,
          birth_date: profileData.birthDate || null,
          gender: profileData.gender || null,
          devotion_time: '07:00',
          updated_at: new Date().toISOString(),
        },
      });

      identifyUser(currentUserId, {
        email: sessionData?.session?.user?.email ?? undefined,
        name: sessionData?.session?.user?.user_metadata?.full_name ?? undefined,
      });
      trackEvent('user_signed_up', {
        has_church: Boolean(profileData.church),
        has_gender: Boolean(profileData.gender),
        has_birth_date: Boolean(profileData.birthDate),
      });
      if (result.offline) {
        showAlert(
          strings.common.genericErrorTitle,
          'تم حفظ البيانات على الجهاز، وسيتم رفعها عند عودة الإنترنت.',
          [
            {
              text: strings.common.next,
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Onboarding' }],
                }),
            },
          ],
          'info',
        );
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (err: any) {
      showAlert(strings.common.genericErrorTitle, err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider theme={authPaperTheme}>
      <AuthScreenShell
        title={strings.profileCompletion.title}
        onBack={() => navigation.goBack()}
        headerExtras={
          <View style={styles.stepContainer}>
            <View style={styles.stepDone} />
            <View style={styles.stepActive} />
          </View>
        }
        formPointerEvents="box-none"
      >
        {profileNotice ? (
          <View style={styles.noticeCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#8A6A3F"
              style={styles.noticeIcon}
            />
            <Text style={styles.noticeText}>{profileNotice}</Text>
          </View>
        ) : null}

        {/* ── Section: معلومات الكنيسة ── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="church"
            size={18}
            color={authPaperTheme.colors.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>
            {strings.profileCompletion.churchSection}
          </Text>
        </View>

        <CustomInput
          fieldLabel={strings.profileCompletion.church}
          placeholder={strings.profileCompletion.churchPlaceholder}
          icon="home-variant-outline"
          badge={strings.profileCompletion.optional}
          value={profileData.church}
          onChangeText={(t: string) =>
            setProfileData({ ...profileData, church: t })
          }
        />

        <CustomInput
          fieldLabel={strings.profileCompletion.sect}
          placeholder={strings.profileCompletion.sectPlaceholder}
          icon="home-outline"
          badge={strings.profileCompletion.optional}
          value={profileData.sect}
          onChangeText={(t: string) =>
            setProfileData({ ...profileData, sect: t })
          }
        />

        {/* ── Section: معلومات شخصية ── */}
        <View style={styles.sectionHeader2}>
          <MaterialCommunityIcons
            name="account-details"
            size={18}
            color={authPaperTheme.colors.primary}
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>
            {strings.profileCompletion.personalSection}
          </Text>
        </View>

        {/* تاريخ الميلاد */}
        <CustomInput
          fieldLabel={strings.profileCompletion.birthDate}
          placeholder={strings.profileCompletion.birthDatePlaceholder}
          icon="calendar-blank-outline"
          value={profileData.birthDate}
          onPress={() => setShowDatePicker(true)}
        />

        {/* ── Date Picker Modal (iOS bottom sheet / Android native) ── */}
        {Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHandle} />
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerCancelText}>
                      {strings.profileCompletion.cancel}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>
                    {strings.profileCompletion.datePickerTitle}
                  </Text>
                  <TouchableOpacity onPress={confirmDate}>
                    <Text style={styles.pickerConfirmText}>
                      {strings.profileCompletion.confirm}
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  locale="ar"
                  style={styles.pickerSpinner}
                />
              </View>
            </View>
          </Modal>
        ) : (
          showDatePicker && (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )
        )}

        {/* الجنس – inline chips */}
        <View style={styles.inputWrapper}>
          <Text style={styles.fieldLabel}>
            {strings.profileCompletion.gender}
          </Text>
          <View
            style={[
              styles.genderRow,
              isCompactWidth && styles.genderRowCompact,
            ]}
          >
            {[
              { label: strings.profileCompletion.male, icon: 'gender-male' },
              {
                label: strings.profileCompletion.female,
                icon: 'gender-female',
              },
            ].map(({ label, icon }) => {
              const active = profileData.gender === label;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.genderChip, active && styles.genderChipActive]}
                  activeOpacity={0.7}
                  onPress={() =>
                    setProfileData({ ...profileData, gender: label })
                  }
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={22}
                    color={active ? '#FFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.genderChipText,
                      active && styles.genderChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* زرار إنشاء الحساب */}
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.8}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.submitRow}>
              <MaterialCommunityIcons
                name="check"
                size={22}
                color="#FFF"
                style={styles.submitIcon}
              />
              <Text style={styles.submitText}>
                {strings.profileCompletion.submit}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </AuthScreenShell>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  noticeCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#FFF6E7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECD9AE',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  noticeIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    color: '#7A6441',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  stepContainer: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
  },
  stepDone: {
    height: 5,
    width: 18,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  stepActive: {
    height: 5,
    width: 36,
    borderRadius: 3,
    backgroundColor: AUTH_GOLD,
    marginHorizontal: 4,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    backgroundColor: '#e5e4e2ff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sectionHeader2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
    backgroundColor: '#e5e4e2ff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sectionIcon: { marginLeft: 6 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1124',
    paddingLeft: 6,
  },
  inputWrapper: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A1124',
    textAlign: 'left',
    marginBottom: 6,
  },
  /* ── Date Picker Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 20,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1124',
  },
  pickerCancelText: {
    fontSize: 15,
    color: '#888',
  },
  pickerConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1124',
  },
  pickerSpinner: {
    height: 220,
    width: '100%',
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
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    gap: 8,
  },
  genderChipActive: {
    backgroundColor: '#0A1124',
    borderColor: '#0A1124',
  },
  genderChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  genderChipTextActive: {
    color: '#FFF',
  },
  submitBtn: {
    backgroundColor: '#0A1124',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    elevation: 4,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitIcon: { marginLeft: 8 },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});

export default ProfileCompletionUI;
