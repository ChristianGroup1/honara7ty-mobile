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
import TextInputInteractive from 'react-native-text-input-interactive';
import {
  Provider as PaperProvider,
  DefaultTheme,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import CustomAlert, { AlertButton } from './CustomAlert';

type Props = { navigation: any };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const GOLD = '#C9A84C';
const NAVY = '#0A1124';

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: NAVY, outline: '#E0E0E0' },
};

const ForgotPasswordUI: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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

  const hideAlert = () =>
    setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      showAlert('خطأ', 'يرجى إدخال البريد الإلكتروني');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      showAlert('خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'honara7ty://reset-password',
      });
      if (error) {
        showAlert('خطأ', error.message);
      } else {
        setSent(true);
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

        {/* ── Header ── */}
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

          <View style={styles.iconCircleHeader}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={38}
              color={GOLD}
            />
          </View>

          <Text style={styles.title}>نسيت كلمة المرور؟</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.headerSubtitle}>
            {sent
              ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.'
              : 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.'}
          </Text>
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
          keyboardOpeningTime={0}
        >
            <View style={styles.formContainer} pointerEvents="box-none">
              {sent ? (
                /* ── Success State ── */
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
                    <Text style={styles.emailBadgeText}>{email.trim()}</Text>
                  </View>

                  <Text style={styles.successHint}>
                    إذا لم تجد الرسالة، تحقق من مجلد الرسائل غير المرغوب فيها.
                  </Text>

                  <TouchableOpacity
                    style={styles.resendBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSent(false);
                      setEmail('');
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
                      <Text style={styles.submitText}>العودة لتسجيل الدخول</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ── Email Input State ── */
                <>
                  <Text style={styles.fieldLabel}>البريد الإلكتروني</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconLeft}>
                      <MaterialCommunityIcons
                        name="email-outline"
                        size={22}
                        color="#999"
                      />
                    </View>
                    <TextInputInteractive
                      value={email}
                      onChangeText={setEmail}
                      placeholder="example@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      textAlign="right"
                      style={{ width: '100%' }}
                      textInputStyle={[styles.inputStyle, { paddingLeft: 48 }]}
                      mainColor={NAVY}
                      originalColor="#E8E8E8"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.8}
                    onPress={handleSend}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.submitRow}>
                        <MaterialCommunityIcons
                          name="send"
                          size={20}
                          color="#FFF"
                          style={styles.submitIcon}
                        />
                        <Text style={styles.submitText}>إرسال رابط الاستعادة</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.footerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                      <Text style={styles.footerLink}>تسجيل الدخول</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerText}>تذكرت كلمة المرور؟ </Text>
                  </View>
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
    height: SCREEN_HEIGHT * 0.42,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 6,
  },
  inputWrapper: { marginBottom: 22 },
  inputIconLeft: {
    position: 'absolute',
    left: 12,
    bottom: 0,
    height: 54,
    justifyContent: 'center',
    zIndex: 1,
  },
  inputStyle: { backgroundColor: '#FFF', height: 54, textAlign: 'right', borderRadius: 14, width: '100%' },
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
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: GOLD, fontWeight: 'bold', fontSize: 14 },

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
    marginBottom: 12,
  },
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
    color: GOLD,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordUI;
