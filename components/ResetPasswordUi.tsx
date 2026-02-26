import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  TextInput,
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
const MIN_PASSWORD_LENGTH = 6;

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: NAVY, outline: '#E0E0E0' },
};

const ResetPasswordUI: React.FC<Props> = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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

  const handleUpdate = async () => {
    if (!password) {
      showAlert('خطأ', 'يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      showAlert(
        'خطأ',
        `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
      );
      return;
    }
    if (password !== confirm) {
      showAlert('خطأ', 'كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showAlert('خطأ', error.message);
      } else {
        setDone(true);
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
          <View style={styles.iconCircleHeader}>
            <MaterialCommunityIcons
              name={done ? 'shield-check' : 'lock-reset'}
              size={38}
              color={GOLD}
            />
          </View>
          <Text style={styles.title}>
            {done ? 'تم التغيير!' : 'تعيين كلمة مرور جديدة'}
          </Text>
          <View style={styles.titleAccent} />
          <Text style={styles.headerSubtitle}>
            {done
              ? 'تم تغيير كلمة مرورك بنجاح.'
              : 'أدخل كلمة المرور الجديدة وأكدها.'}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          >
            <View style={styles.formContainer}>
              {done ? (
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
                    تم تعيين كلمة مرورك الجديدة بنجاح. يمكنك الآن تسجيل
                    الدخول باستخدامها.
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
                  <Text style={styles.fieldLabel}>كلمة المرور الجديدة</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      mode="outlined"
                      placeholder="••••••••"
                      secureTextEntry={securePassword}
                      textAlign="right"
                      style={styles.inputStyle}
                      outlineStyle={styles.inputOutline}
                      contentStyle={styles.inputContent}
                      right={
                        <TextInput.Icon
                          icon={() => (
                            <MaterialCommunityIcons
                              name={
                                securePassword
                                  ? 'eye-off-outline'
                                  : 'eye-outline'
                              }
                              size={22}
                              color="#999"
                            />
                          )}
                          onPress={() => setSecurePassword(v => !v)}
                        />
                      }
                      left={
                        <TextInput.Icon
                          icon={() => (
                            <MaterialCommunityIcons
                              name="lock-outline"
                              size={22}
                              color="#999"
                            />
                          )}
                        />
                      }
                    />
                  </View>

                  <Text style={styles.fieldLabel}>تأكيد كلمة المرور</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={confirm}
                      onChangeText={setConfirm}
                      mode="outlined"
                      placeholder="••••••••"
                      secureTextEntry={secureConfirm}
                      textAlign="right"
                      style={styles.inputStyle}
                      outlineStyle={styles.inputOutline}
                      contentStyle={styles.inputContent}
                      right={
                        <TextInput.Icon
                          icon={() => (
                            <MaterialCommunityIcons
                              name={
                                secureConfirm ? 'eye-off-outline' : 'eye-outline'
                              }
                              size={22}
                              color="#999"
                            />
                          )}
                          onPress={() => setSecureConfirm(v => !v)}
                        />
                      }
                      left={
                        <TextInput.Icon
                          icon={() => (
                            <MaterialCommunityIcons
                              name="lock-check-outline"
                              size={22}
                              color="#999"
                            />
                          )}
                        />
                      }
                    />
                  </View>

                  <View style={styles.hintRow}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={14}
                      color="#AAA"
                    />
                    <Text style={styles.hintText}>
                      كلمة المرور يجب أن تكون {MIN_PASSWORD_LENGTH} أحرف على
                      الأقل
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
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
  inputWrapper: { marginBottom: 20 },
  inputStyle: { backgroundColor: '#FFF', height: 54, textAlign: 'right' },
  inputOutline: { borderRadius: 14, borderColor: '#E8E8E8' },
  inputContent: { writingDirection: 'rtl', textAlign: 'right' },
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
});

export default ResetPasswordUI;
