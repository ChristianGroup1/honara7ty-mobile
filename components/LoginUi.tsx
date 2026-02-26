import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import CustomAlert, { AlertButton } from './CustomAlert';
import {
  TextInput,
  Provider as PaperProvider,
  DefaultTheme,
  Checkbox,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A1124',
    outline: '#EEE',
  },
};

const CustomInput = ({
  label,
  value,
  onChangeText,
  icon,
  isPassword = false,
  secureText,
  setSecureText,
}: any) => (
  <View style={styles.inputWrapper}>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      mode="outlined"
      placeholder={label}
      secureTextEntry={isPassword ? secureText : false}
      textAlign="right"
      style={styles.inputStyle}
      outlineStyle={styles.inputOutline}
      contentStyle={{ writingDirection: 'rtl', textAlign: 'right' }}
      // الأيقونات في اليمين حسب تصميم شاشة تسجيل الدخول
      right={
        isPassword ? (
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons
                name={secureText ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#666"
              />
            )}
            onPress={() => setSecureText(!secureText)}
          />
        ) : (
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons name={icon} size={24} color="#666" />
            )}
          />
        )
      }
    />
  </View>
);

const LoginUI: React.FC<any> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const navigation2 = useNavigation();
  const [loading, setLoading] = useState(false); // Login action loading state
  const [initializing, setInitializing] = useState(true); // Initial Google check
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

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      webClientId:
        '496533823141-ngb38njinb595ndm6qlu1ollommpg2sl.apps.googleusercontent.com',
    });

    // Check if user is already signed in
    checkUserSignedIn();
  }, []);

  const checkUserSignedIn = async () => {
    try {
      const userInfo = await GoogleSignin.signInSilently(); // Auto sign-in if already logged in
      if (userInfo && userInfo?.data?.user) {
        console.log('User already signed in:', userInfo);
        //navigation.replace('HomeScreen', { user: userInfo.data.user }); // Fixed: userInfo.user instead of userInfo.data.user
      } else {
        console.log('No user signed in');
      }
    } catch (error) {
      console.log('User not signed in:', error);
    } finally {
      setInitializing(false); // Hide loader after checking
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        showAlert('خطأ في تسجيل الدخول', error.message);
      } else {
        navigation.replace('HomeScreen', { user: data.user });
      }
    } catch (err: any) {
      showAlert('خطأ', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();
      console.log('Google Sign-In Success:', userInfo);

      if (userInfo.data.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        console.log('Supabase Auth Response:', { data, error });

        if (error) {
          showAlert('خطأ', error.message);
        } else {
          console.log('Signed in with Google successfully');
          navigation.replace('HomeScreen', { user: userInfo.data.user });
        }
      } else {
        throw new Error('No ID token present!');
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showAlert('تم الإلغاء', 'تم إلغاء عملية تسجيل الدخول.', undefined, 'warning');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showAlert('جاري تسجيل الدخول', 'عملية تسجيل الدخول جارية بالفعل.', undefined, 'warning');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert('خطأ', 'خدمات Google Play غير متاحة أو قديمة.', undefined, 'warning');
      } else {
        showAlert('خطأ', error.message);
      }
    }
  };

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1124' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }
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
            <MaterialCommunityIcons
              name="chevron-left"
              size={35}
              color="white"
            />
          </TouchableOpacity>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>تسجيل الدخول</Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            nestedScrollEnabled={true}
            decelerationRate="normal"
            scrollEventThrottle={16}
          >
            <View style={styles.formContainer} pointerEvents="box-none">
              <CustomInput
                label="الأسم أو البريد الإلكتروني"
                icon="account-outline"
                value={email}
                onChangeText={setEmail}
              />

              <CustomInput
                label="كلمه المرور"
                icon="lock-outline"
                isPassword={true}
                secureText={secureText}
                setSecureText={setSecureText}
                value={password}
                onChangeText={setPassword}
              />

              {/* قسم "تذكرني" و "نسيت كلمة المرور" */}
              <View style={styles.extraOptions}>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotPasswordText}>
                    نسيت كلمه المرور ؟
                  </Text>
                </TouchableOpacity>

                <View style={styles.rememberMeRow}>
                  <Text style={styles.rememberMeText}>ذكرني</Text>
                  <Checkbox
                    status={rememberMe ? 'checked' : 'unchecked'}
                    onPress={() => setRememberMe(!rememberMe)}
                    color="#0A1124"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>تسجيل الدخول</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
              >
                <Image
                  source={{ uri: 'https://i.imgur.com/w9vX99X.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleText}>
                  تسجيل الدخول باستخدام جوجل
                </Text>
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('SignupStep1')}>
                  <Text style={styles.footerLink}>إنشاء حساب جديد</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}>ليس لديك حساب؟ </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  darkHeaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: '#0A1124',
  },
  headerContent: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-start', marginLeft: 20 },
  logo: { width: 100, height: 100 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 15 },

  scrollContainer: { flexGrow: 1 },
  formContainer: {
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 40,
  },
  inputWrapper: { marginBottom: 15 },
  inputStyle: { backgroundColor: '#FFF', height: 55 },
  inputOutline: { borderRadius: 12 },

  extraOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  rememberMeRow: { flexDirection: 'row', alignItems: 'center' },
  rememberMeText: { color: '#666', fontSize: 14 },
  forgotPasswordText: { color: '#666', fontSize: 14 },

  submitBtn: {
    backgroundColor: '#0A1124',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  googleButton: {
    flexDirection: 'row-reverse',
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  googleIcon: { width: 20, height: 20, marginLeft: 12 },
  googleText: { fontSize: 15, color: '#444' },

  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    paddingBottom: 20,
  },
  footerText: { color: '#666', fontSize: 14 },
  footerLink: { color: '#0A1124', fontWeight: 'bold', fontSize: 14 },
});

export default LoginUI;
