import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Provider as PaperProvider,
  DefaultTheme,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import CustomAlert, { AlertButton } from './CustomAlert';
import CustomInput from './CustomInput';

type Props = { navigation: any };
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOLD = '#C9A84C';

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: '#0A1124', outline: '#E0E0E0' },
};

const SignupUI: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  // --- Scroll State ---
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleScrollBegin = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleRegister = async () => {
    const { name, email, phone, password, confirmPassword } = formData;

    const errors = {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    };
    let hasError = false;

    if (!name) {
      errors.name = 'يرجى إدخال الاسم الكامل';
      hasError = true;
    }
    if (!email) {
      errors.email = 'يرجى إدخال البريد الإلكتروني';
      hasError = true;
    }
    if (!phone) {
      errors.phone = 'يرجى إدخال رقم الهاتف';
      hasError = true;
    }
    if (!password) {
      errors.password = 'يرجى إدخال كلمة المرور';
      hasError = true;
    } else if (password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      hasError = true;
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'يرجى تأكيد كلمة المرور';
      hasError = true;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'كلمة المرور غير متطابقة';
      hasError = true;
    }

    setFieldErrors(errors);
    if (hasError) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          },
        },
      });

      if (error) {
        showAlert('خطأ في التسجيل', error.message);
      } else {
        navigation.navigate('ProfileCompletion', {
          userId: data.user?.id,
          email,
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
          <Text style={styles.title}>إنشاء حساب</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.headerSubtitle}>
            يرجى ملء المعلومات التالية لإنشاء حسابك بسهولة.
          </Text>
          <View style={styles.stepContainer}>
            <View style={styles.stepActive} />
            <View style={styles.stepInactive} />
          </View>
          <Text style={styles.stepLabel}>الخطوة 1 من 2</Text>
        </View>

        <KeyboardAwareScrollView
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollBegin={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
          bounces={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          enableOnAndroid={true}
          enableResetScrollToCoords={false}
          enableAutomaticScroll={Platform.OS === 'ios'}
        >
          <View style={styles.formContainer}>
            <CustomInput
              fieldLabel="الاسم الكامل"
              placeholder="أدخل اسمك"
              icon="account-outline"
              value={formData.name}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, name: t }));
                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
              }}
              error={fieldErrors.name}
            />
            <CustomInput
              fieldLabel="البريد الإلكتروني"
              placeholder="أدخل بريدك الإلكتروني"
              icon="email-outline"
              value={formData.email}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, email: t }));
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
              }}
              error={fieldErrors.email}
            />
            <CustomInput
              fieldLabel="رقم الهاتف"
              placeholder="أدخل رقم هاتفك"
              icon="phone-outline"
              value={formData.phone}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, phone: t }));
                if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
              }}
              error={fieldErrors.phone}
            />
            <CustomInput
              fieldLabel="كلمة المرور"
              placeholder="6 أحرف على الأقل"
              icon="lock-outline"
              isPassword={true}
              secureText={secureText}
              setSecureText={setSecureText}
              value={formData.password}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, password: t }));
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
              }}
              error={fieldErrors.password}
            />
            <CustomInput
              fieldLabel="تأكيد كلمة المرور"
              placeholder="أعد إدخال كلمة المرور"
              icon="lock-check-outline"
              isPassword={true}
              secureText={secureConfirm}
              setSecureText={setSecureConfirm}
              value={formData.confirmPassword}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, confirmPassword: t }));
                if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
              }}
              error={fieldErrors.confirmPassword}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.submitRow}>
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={22}
                    color="#FFF"
                    style={styles.submitIcon}
                  />
                  <Text style={styles.submitText}>التالي</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton}>
              <Image
                source={{ uri: 'https://i.imgur.com/w9vX99X.png' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleText}>إنشاء حساب باستخدام جوجل</Text>
            </TouchableOpacity>

            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.footerLink}>تسجيل الدخول</Text>
              </TouchableOpacity>
              <Text style={styles.footerText}>لديك حساب بالفعل؟ </Text>
            </View>
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
  stepActive: {
    height: 5,
    width: 36,
    borderRadius: 3,
    backgroundColor: GOLD,
    marginHorizontal: 4,
  },
  stepInactive: {
    height: 5,
    width: 18,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    paddingTop: 32,
    paddingBottom: 40,
  },
  submitBtn: {
    backgroundColor: '#0A1124',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
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
  submitIcon: { marginRight: 4 },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#AAA',
    fontSize: 13,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row-reverse',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  googleIcon: { width: 20, height: 20, marginLeft: 10 },
  googleText: { fontSize: 14, color: '#333', fontWeight: '500' },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
    paddingBottom: 10,
  },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: GOLD, fontWeight: 'bold', fontSize: 14 },
});

export default SignupUI;
