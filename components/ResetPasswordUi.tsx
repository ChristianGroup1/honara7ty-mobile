import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Provider as PaperProvider,
  DefaultTheme,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import {
  localizeAuthError,
  MIN_PASSWORD_LENGTH,
  EMAIL_REGEX,
} from '../lib/authErrors';
import CustomAlert, { AlertButton } from './CustomAlert';
import CustomInput from './CustomInput';

type Props = { navigation: any; route: any };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const GOLD = '#fdfcf9ff';
const NAVY = '#0A1124';

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: NAVY, outline: '#E0E0E0' },
};

const ResetPasswordUI: React.FC<Props> = ({ navigation, route }) => {
  // Default to true so navigating here normally (without a deep link) shows the form.
  const linkValid = route?.params?.linkValid !== false;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirm: '' });

  // ── Request-new-link state (used when linkValid === false) ──
  const [requestEmail, setRequestEmail] = useState('');
  const [requestEmailError, setRequestEmailError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const shouldShowBackButton = !done && linkValid;

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleUpdate = async () => {
    const errors = { password: '', confirm: '' };
    let hasError = false;
    if (!password) {
      errors.password = 'يرجى إدخال كلمة المرور الجديدة';
      hasError = true;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`;
      hasError = true;
    }
    if (!confirm) {
      errors.confirm = 'يرجى تأكيد كلمة المرور';
      hasError = true;
    } else if (password !== confirm) {
      errors.confirm = 'كلمتا المرور غير متطابقتين';
      hasError = true;
    }
    setFieldErrors(errors);
    if (hasError) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showAlert('خطأ', localizeAuthError(error.message));
      } else {
        setDone(true);
      }
    } catch (err: any) {
      showAlert('خطأ', localizeAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async () => {
    const trimmed = requestEmail.trim();
    if (!trimmed) {
      setRequestEmailError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setRequestEmailError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    setRequestEmailError('');
    setRequestLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'honara7ty://reset-password',
      });
      if (error) {
        showAlert('خطأ', localizeAuthError(error.message));
      } else {
        setRequestSent(true);
      }
    } catch (err: any) {
      showAlert('خطأ', localizeAuthError(err.message));
    } finally {
      setRequestLoading(false);
    }
  };

  const getHeaderIconName = (): string => {
    if (!linkValid) return requestSent ? 'email-check-outline' : 'link-off';
    return done ? 'shield-check' : 'lock-reset';
  };

  const getHeaderTitle = (): string => {
    if (!linkValid) return requestSent ? 'تم الإرسال!' : 'رابط غير صالح';
    return done ? 'تم التغيير!' : 'تعيين كلمة مرور جديدة';
  };

  const getHeaderSubtitle = (): string => {
    if (!linkValid) {
      return requestSent
        ? 'تم إرسال رابط جديد إلى بريدك الإلكتروني.'
        : 'أدخل بريدك الإلكتروني لإرسال رابط استعادة جديد.';
    }
    return done
      ? 'تم تغيير كلمة مرورك بنجاح.'
      : 'أدخل كلمة المرور الجديدة وأكدها.';
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

        {/* ── Header ── */}
        <View style={styles.headerContent}>
          {shouldShowBackButton && (
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
          )}
          <View style={styles.iconCircleHeader}>
            <MaterialCommunityIcons
              name={getHeaderIconName()}
              size={38}
              color={GOLD}
            />
          </View>
          <Text style={styles.title}>{getHeaderTitle()}</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
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
            {!linkValid ? (
              /* ── Invalid Link State ── */
              requestSent ? (
                /* ── Sent Confirmation ── */
                <View style={styles.successBox}>
                  <View style={styles.successIconCircle}>
                    <MaterialCommunityIcons
                      name="email-check-outline"
                      size={52}
                      color={GOLD}
                    />
                  </View>
                  <Text style={styles.successTitle}>تحقق من بريدك!</Text>
                  <Text style={styles.successMessage}>
                    لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى:
                  </Text>
                  <View style={styles.emailBadge}>
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={16}
                      color={NAVY}
                      style={styles.emailBadgeIcon}
                    />
                    <Text style={styles.emailBadgeText}>
                      {requestEmail.trim()}
                    </Text>
                  </View>
                  <Text style={styles.successHint}>
                    إذا لم تجد الرسالة، تحقق من مجلد الرسائل غير المرغوب فيها.
                  </Text>
                  <TouchableOpacity
                    style={styles.resendBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      setRequestSent(false);
                      setRequestEmail('');
                    }}
                  >
                    <Text style={styles.resendText}>إرسال مرة أخرى</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Login')}
                  >
                    <View style={styles.submitRow}>
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={22}
                        color="#FFF"
                        style={styles.submitIcon}
                      />
                      <Text style={styles.submitText}>
                        العودة لتسجيل الدخول
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ── Email Input Form ── */
                <View>
                  <View style={styles.invalidIconCircle}>
                    <MaterialCommunityIcons
                      name="link-off"
                      size={48}
                      color="#E53935"
                      style={styles.invalidIconCentered}
                    />
                  </View>
                  <Text style={styles.invalidMessage}>
                    رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.
                    {'\n'}أدخل بريدك الإلكتروني لإرسال رابط جديد.
                  </Text>
                  <CustomInput
                    fieldLabel="البريد الإلكتروني"
                    icon="email-outline"
                    placeholder="أدخل بريدك الإلكتروني"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={requestEmail}
                    onChangeText={(t: string) => {
                      setRequestEmail(t);
                      if (requestEmailError) setRequestEmailError('');
                    }}
                    error={requestEmailError}
                  />
                  <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.8}
                    onPress={handleRequestNewLink}
                    disabled={requestLoading}
                  >
                    {requestLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.submitRow}>
                        <MaterialCommunityIcons
                          name="send"
                          size={20}
                          color="#FFF"
                          style={styles.submitIcon}
                        />
                        <Text style={styles.submitText}>إرسال رابط جديد</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.footerContainer}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Text style={styles.footerLink}>تسجيل الدخول</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerText}>تذكرت كلمة المرور؟ </Text>
                  </View>
                </View>
              )
            ) : done ? (
              /* ── Success State ── */
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={52}
                    color={GOLD}
                  />
                </View>
                <Text style={styles.successTitle}>تم بنجاح!</Text>
                <Text style={styles.successMessage}>
                  تم تعيين كلمة مرورك الجديدة بنجاح. يمكنك الآن تسجيل الدخول
                  باستخدامها.
                </Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Login')}
                >
                  <View style={styles.submitRow}>
                    <MaterialCommunityIcons
                      name="login"
                      size={20}
                      color="#FFF"
                      style={styles.submitIcon}
                    />
                    <Text style={styles.submitText}>تسجيل الدخول</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Form ── */
              <>
                <CustomInput
                  fieldLabel="كلمة المرور الجديدة "
                  icon="lock-outline"
                  isPassword={true}
                  secureText={securePassword}
                  setSecureText={setSecurePassword}
                  value={password}
                  onChangeText={t => {
                    setPassword(t);
                    if (fieldErrors.password)
                      setFieldErrors(prev => ({ ...prev, password: '' }));
                  }}
                  error={fieldErrors.password}
                />

                <CustomInput
                  fieldLabel="تأكيد كلمة المرور "
                  icon="lock-check-outline"
                  isPassword={true}
                  secureText={secureConfirm}
                  setSecureText={setSecureConfirm}
                  value={confirm}
                  onChangeText={t => {
                    setConfirm(t);
                    if (fieldErrors.confirm)
                      setFieldErrors(prev => ({ ...prev, confirm: '' }));
                  }}
                  error={fieldErrors.confirm}
                />

                <View style={styles.hintRow}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={14}
                    color="#AAA"
                  />
                  <Text style={styles.hintText}>
                    كلمة المرور يجب أن تكون {MIN_PASSWORD_LENGTH} أحرف على الأقل
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  activeOpacity={0.8}
                  onPress={handleUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={styles.submitRow}>
                      <MaterialCommunityIcons
                        name="check-bold"
                        size={20}
                        color="#FFF"
                        style={styles.submitIcon}
                      />
                      <Text style={styles.submitText}>تعيين كلمة المرور</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    height: SCREEN_HEIGHT * 0.38,
    backgroundColor: NAVY,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 14,
    paddingBottom: 24,
  },
  backBtn: { alignSelf: 'flex-start', marginLeft: 16, marginBottom: 12 },
  backBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleHeader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201,168,76,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
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
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 36,
    lineHeight: 20,
  },
  scrollContainer: { flexGrow: 1 },
  formContainer: {
    backgroundColor: '#F5F6FA',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#AAA',
    marginLeft: 4,
  },
  submitBtn: {
    backgroundColor: NAVY,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitRow: { flexDirection: 'row', alignItems: 'center' },
  submitIcon: { marginRight: 8 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  /* ── Success State ── */
  successBox: {
    alignItems: 'center',
    paddingTop: 10,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,168,76,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NAVY,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },

  /* ── Invalid Link State ── */
  invalidIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229,57,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(229,57,53,0.25)',
  },
  invalidIconCentered: { alignSelf: 'center' },
  invalidMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  /* ── Email badge (reused in sent confirmation) ── */
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,17,36,0.06)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emailBadgeIcon: { marginLeft: 6 },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },

  /* ── Sent confirmation extras ── */
  successHint: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  resendBtn: {
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  resendText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* ── Footer ── */
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: NAVY, fontWeight: 'bold', fontSize: 14 },
});

export default ResetPasswordUI;
