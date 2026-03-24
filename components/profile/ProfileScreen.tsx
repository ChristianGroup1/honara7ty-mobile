import React, { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertButton, AlertConfig } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F2F4F8';
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 360;

  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<EditableProfileForm>({
    fullName: '',
    phone: '',
    church: '',
    sect: '',
    birthDate: '',
    gender: '',
  });
  const [initialForm, setInitialForm] = useState<EditableProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const loadProfile = React.useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;
      if (!currentUser) {
        setUser(null);
        return;
      }

      setUser(currentUser);

      const { data: profile } = await supabase
        .from('profiles')
        .select('church, sect, birth_date, gender, devotion_time')
        .eq('id', currentUser.id)
        .maybeSingle();

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

      setForm(nextForm);
      setInitialForm(nextForm);
      setPickerDate(parseDateString(nextForm.birthDate));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile(true);
  }, [loadProfile]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile(false);
    }, [loadProfile]),
  );

  const hasChanges = useMemo(() => {
    if (!initialForm) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const displayName =
    form.fullName.trim() ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'مستخدم';

  const initials = displayName
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

  const handlePickerChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
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
    const nextErrors = { fullName: '', phone: '' };
    let hasError = false;

    if (!trimmedFullName) {
      nextErrors.fullName = 'يرجى إدخال الاسم';
      hasError = true;
    }

    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      nextErrors.phone = 'يرجى إدخال رقم هاتف صحيح';
      hasError = true;
    }

    setFieldErrors(nextErrors);

    if (hasError || !user) {
      return;
    }

    setSaving(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: trimmedFullName,
          phone: trimmedPhone || null,
        },
      });

      if (authError) {
        throw authError;
      }

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          church: form.church.trim() || null,
          sect: form.sect.trim() || null,
          birth_date: form.birthDate || null,
          gender: form.gender || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (profileError) {
        throw profileError;
      }

      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          full_name: trimmedFullName,
          phone: trimmedPhone || null,
        },
      };

      setUser(updatedUser);

      const normalizedForm: EditableProfileForm = {
        ...form,
        fullName: trimmedFullName,
        phone: trimmedPhone,
        church: form.church.trim(),
        sect: form.sect.trim(),
      };

      setForm(normalizedForm);
      setInitialForm(normalizedForm);

      showAlert(
        'تم الحفظ',
        'تم تحديث بياناتك بنجاح.',
        undefined,
        'success',
      );
    } catch (err: any) {
      showAlert('خطأ', err.message ?? 'حدث خطأ أثناء حفظ البيانات.', undefined, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showAlert(
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await GoogleSignin.signOut();
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
              showAlert('خطأ', err.message, undefined, 'error');
            }
          },
        },
      ],
      'warning',
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-off-outline" size={54} color="#9AA0AA" />
          <Text style={styles.emptyTitle}>لا توجد جلسة نشطة</Text>
          <Text style={styles.emptyText}>
            سجّل الدخول أولاً للوصول إلى الملف الشخصي.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={[styles.topInset, { height: insets.top }]} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={NAVY} />
            </View>
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.emailText}>{user.email}</Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <MaterialCommunityIcons name="book-open-variant" size={15} color={NAVY} />
              <Text style={styles.heroMetaText}>بياناتك محفوظة على الحساب</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="account-edit-outline" size={18} color={NAVY} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>البيانات الأساسية</Text>
              <Text style={styles.sectionSubtitle}>
                يمكنك تعديل الاسم والهاتف والبيانات الشخصية من هنا.
              </Text>
            </View>
          </View>

          <CustomInput
            fieldLabel="الاسم"
            placeholder="أدخل اسمك"
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
            fieldLabel="البريد الإلكتروني"
            placeholder="البريد الإلكتروني"
            value={user.email ?? ''}
            icon="email-outline"
            editable={false}
            badge="ثابت"
          />

          <CustomInput
            fieldLabel="رقم الهاتف"
            placeholder="أدخل رقم هاتفك"
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
              <MaterialCommunityIcons name="church" size={18} color={NAVY} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>الكنيسة والانتماء</Text>
              <Text style={styles.sectionSubtitle}>
                أضف معلوماتك الكنسية لتبقى بياناتك مكتملة.
              </Text>
            </View>
          </View>

          <CustomInput
            fieldLabel="الكنيسة"
            placeholder="اسم الكنيسة"
            value={form.church}
            onChangeText={text => setForm(prev => ({ ...prev, church: text }))}
            icon="church"
            badge="اختياري"
          />

          <CustomInput
            fieldLabel="الطائفة"
            placeholder="اسم الطائفة"
            value={form.sect}
            onChangeText={text => setForm(prev => ({ ...prev, sect: text }))}
            icon="account-group-outline"
            badge="اختياري"
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="calendar-heart" size={18} color={NAVY} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>بيانات شخصية وروحية</Text>
              <Text style={styles.sectionSubtitle}>
                اضبط تاريخ الميلاد والجنس من هنا.
              </Text>
            </View>
          </View>

          <CustomInput
            fieldLabel="تاريخ الميلاد"
            placeholder="اختر تاريخ الميلاد"
            value={form.birthDate}
            icon="calendar-blank-outline"
            onPress={handlePickerOpen}
          />

          <View style={styles.genderBlock}>
            <Text style={styles.genderLabel}>الجنس</Text>
            <View
              style={[
                styles.genderRow,
                isCompactWidth && styles.genderRowCompact,
              ]}
            >
              {[
                { label: 'ذكر', icon: 'gender-male' },
                { label: 'أنثى', icon: 'gender-female' },
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
                      color={active ? '#FFF' : '#636A74'}
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
              <MaterialCommunityIcons name="content-save-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>
                {hasChanges ? 'حفظ التعديلات' : 'لا توجد تغييرات'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FFF" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
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
                  <Text style={styles.pickerActionSecondary}>إلغاء</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>تاريخ الميلاد</Text>
                <TouchableOpacity onPress={confirmPickerSelection}>
                  <Text style={styles.pickerActionPrimary}>تأكيد</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: NAVY, fontSize: 30, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    left: -2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7DF',
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
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(201,168,76,0.16)',
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
  },
  sectionSubtitle: {
    color: '#737B86',
    fontSize: 13,
    lineHeight: 20,
  },
  genderBlock: { marginBottom: 14 },
  genderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 6,
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
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: '#E74C3C',
    borderRadius: 16,
    paddingVertical: 16,
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

export default ProfileScreen;
