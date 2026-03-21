import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Provider as PaperProvider,
  DefaultTheme,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase'; // ← استورد supabase
import CustomAlert, { AlertButton } from './CustomAlert';
import CustomInput from './CustomInput';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOLD = '#fdfcf9ff';

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: '#0A1124', outline: '#E0E0E0' },
};

const ProfileCompletionUI: React.FC<any> = ({ navigation, route }) => {
  // ← استقبل userId من Signup
  const { userId } = route?.params || {};

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

  // ✅ دالة حفظ البروفايل في Supabase
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      // ✅ تأكد إن اليوزر logged in فعلاً
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      console.log('userId from params:', userId);
      console.log('userId from session:', currentUserId);

      // استخدم الـ session userId دايماً أأمن
      const finalUserId = currentUserId || userId;

      if (!finalUserId) {
        showAlert('خطأ', 'لازم تسجل دخول الأول');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: finalUserId, // ← من الـ session مش params
        church: profileData.church || null,
        sect: profileData.sect || null,
        birth_date: profileData.birthDate || null,
        gender: profileData.gender || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log('Supabase error:', error);
        showAlert('خطأ', error.message);
      } else {
        // New users always go through onboarding after completing their profile
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (err: any) {
      showAlert('خطأ', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.darkHeaderLayer} />

        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.backBtnCircle}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="white"
              />
            </View>
          </TouchableOpacity>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>إكمال الملف الشخصي</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.headerSubtitle}>
            أهلاً وسهلاً! خلينا نتعرف عليك أكثر.
          </Text>
          <View style={styles.stepContainer}>
            <View style={styles.stepDone} />
            <View style={styles.stepActive} />
          </View>
          <Text style={styles.stepLabel}>الخطوة 2 من 2</Text>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          decelerationRate="normal"
          enableOnAndroid={true}
          extraScrollHeight={80}
          extraHeight={80}
          keyboardOpeningTime={0}
        >
          <View style={styles.formContainer} pointerEvents="box-none">
            {/* ── Section: معلومات الكنيسة ── */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="church"
                size={18}
                color={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>معلومات الكنيسة</Text>
            </View>

            <CustomInput
              fieldLabel="الكنيسة"
              placeholder="اسم الكنيسة"
              icon="home-variant-outline"
              badge="اختياري"
              value={profileData.church}
              onChangeText={(t: string) =>
                setProfileData({ ...profileData, church: t })
              }
            />

            <CustomInput
              fieldLabel="الطائفة"
              placeholder="اسم الطائفة"
              icon="home-outline"
              badge="اختياري"
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
                color={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>معلومات شخصية</Text>
            </View>

            {/* تاريخ الميلاد */}
            <CustomInput
              fieldLabel="تاريخ الميلاد"
              placeholder="اضغط لاختيار التاريخ"
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
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.pickerCancelText}>إلغاء</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>تاريخ الميلاد</Text>
                      <TouchableOpacity onPress={confirmDate}>
                        <Text style={styles.pickerConfirmText}>تأكيد</Text>
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
              <Text style={styles.fieldLabel}>الجنس</Text>
              <View style={styles.genderRow}>
                {[
                  { label: 'ذكر', icon: 'gender-male' },
                  { label: 'أنثى', icon: 'gender-female' },
                ].map(({ label, icon }) => {
                  const active = profileData.gender === label;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.genderChip,
                        active && styles.genderChipActive,
                      ]}
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
                  <Text style={styles.submitText}>إنشاء الحساب</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  darkHeaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.42,
    backgroundColor: '#0A1124',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 14,
    paddingBottom: 24,
  },
  backBtn: { alignSelf: 'flex-start', marginLeft: 16, marginBottom: 6 },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: 76, height: 76 },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  titleAccent: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 6,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
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
    backgroundColor: GOLD,
    marginHorizontal: 4,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
  },
  scrollContainer: { flexGrow: 1 },
  formContainer: {
    backgroundColor: '#F5F6FA',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  sectionIcon: { marginLeft: 6 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1124',
  },
  inputWrapper: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A1124',
    textAlign: 'right',
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
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitIcon: { marginLeft: 8 },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});

export default ProfileCompletionUI;
