import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import { ensureDefaultDevotionTime } from '../../lib/ensureDefaultDevotionTime';
import { configureGoogleSignIn } from '../../lib/googleSignInConfig';
import { hasSeenNotificationPermissionPrompt } from '../../lib/notificationPermissionFlow';
import { localizeAuthError, EMAIL_REGEX } from '../../lib/authErrors';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { authPaperTheme, AUTH_NAVY } from '../auth/theme';
import AuthScreenShell from '../auth/AuthScreenShell';
import { authStrings } from '../auth/strings';
import GoogleIcon from '../../assets/images/google-icon.svg';
import { startFacebookAuth } from '../../lib/socialAuth';

const initializingContainerStyle = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  backgroundColor: AUTH_NAVY,
};

const LoginUI: React.FC<any> = ({ navigation }) => {
  const strings = authStrings;
  const { width: windowWidth } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false); // Login action loading state
  const [initializing, setInitializing] = useState(true); // Initial Google check
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });
  const isCompactWidth = windowWidth < 360;

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  /** Navigate to Onboarding for first-time users, otherwise to HomeScreen. */
  const navigateAfterLogin = async (user: any) => {
    await ensureDefaultDevotionTime(user?.id);
    const onboardingDone = user?.user_metadata?.onboarding_completed === true;
    const seenPermissionPrompt = await hasSeenNotificationPermissionPrompt(
      user?.id,
    );
    if (onboardingDone) {
      if (seenPermissionPrompt) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'NotificationPermission' }],
        });
      }
    } else {
      navigation.replace('Onboarding');
    }
  };

  useEffect(() => {
    configureGoogleSignIn();

    // Check if user is already signed in
    checkUserSignedIn();
  }, []);

  const checkUserSignedIn = async () => {
    try {
      const userInfo = await GoogleSignin.signInSilently(); // Auto sign-in if already logged in
      if (userInfo && userInfo?.data?.user) {
        return;
      }
    } catch {
      return;
    } finally {
      setInitializing(false); // Hide loader after checking
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const errors = { email: '', password: '' };
    let hasError = false;
    if (!trimmedEmail) {
      errors.email = strings.login.emailRequired;
      hasError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = strings.login.emailInvalid;
      hasError = true;
    }
    if (!password) {
      errors.password = strings.login.passwordRequired;
      hasError = true;
    }
    setFieldErrors(errors);
    if (hasError) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        showAlert(
          strings.login.signInErrorTitle,
          localizeAuthError(error.message),
        );
      } else {
        await navigateAfterLogin(data.user);
      }
    } catch (err: any) {
      showAlert(
        strings.common.genericErrorTitle,
        localizeAuthError(err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;
      const googleUser = userInfo?.data?.user ?? userInfo?.user;

      if (idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          showAlert(
            strings.common.genericErrorTitle,
            localizeAuthError(error.message),
          );
        } else {
          const loggedInUser = data?.user ?? googleUser;
          if (loggedInUser?.id) {
          }
          await navigateAfterLogin(loggedInUser);
        }
      } else {
        return;
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showAlert(
          strings.common.cancelledTitle,
          strings.login.cancelledMessage,
          undefined,
          'warning',
        );
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showAlert(
          strings.common.signInInProgressTitle,
          strings.login.inProgressMessage,
          undefined,
          'warning',
        );
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert(
          strings.common.genericErrorTitle,
          strings.common.playServicesUnavailable,
          undefined,
          'warning',
        );
      } else {
        showAlert(
          strings.common.genericErrorTitle,
          localizeAuthError(error.message),
        );
      }
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    try {
      await startFacebookAuth();
    } catch (error: any) {
      showAlert(
        strings.common.genericErrorTitle,
        localizeAuthError(error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={initializingContainerStyle}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }
  return (
    <PaperProvider theme={authPaperTheme}>
      <AuthScreenShell
        title={strings.login.title}
        onBack={() => navigation.goBack()}
        formPointerEvents="box-none"
      >
        <CustomInput
          fieldLabel={strings.common.email}
          placeholder={strings.common.emailPlaceholder}
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={t => {
            setEmail(t);
            if (fieldErrors.email)
              setFieldErrors(prev => ({ ...prev, email: '' }));
          }}
          error={fieldErrors.email}
        />

        <CustomInput
          fieldLabel={`${strings.common.password}  `}
          placeholder={strings.common.passwordPlaceholder}
          icon="lock-outline"
          isPassword={true}
          secureText={secureText}
          setSecureText={setSecureText}
          value={password}
          onChangeText={t => {
            setPassword(t);
            if (fieldErrors.password)
              setFieldErrors(prev => ({ ...prev, password: '' }));
          }}
          error={fieldErrors.password}
        />

        {/* قسم "تذكرني" و "نسيت كلمة المرور" */}
        <View
          style={[
            styles.extraOptions,
            isCompactWidth && styles.extraOptionsCompact,
          ]}
        >
          <View style={styles.securityHint}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color="#6D7890"
            />
            <Text style={styles.securityHintText}>
              {strings.common.secureHint}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>
              {strings.common.forgotPasswordQuestion}
            </Text>
          </TouchableOpacity>

          {/* <View style={styles.rememberMeRow}>
                <Text style={styles.rememberMeText}>ذكرني</Text>
                <Checkbox
                  status={rememberMe ? 'checked' : 'unchecked'}
                  onPress={() => setRememberMe(!rememberMe)}
                  color="#0A1124"
                />
              </View> */}
        </View>

        <TouchableOpacity
          testID="login-submit"
          style={styles.submitBtn}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>{strings.common.login}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{strings.common.or}</Text>
          <View style={styles.dividerLine} />
        </View>
        <TouchableOpacity
          style={styles.facebookButton}
          onPress={handleFacebookSignIn}
          disabled={loading}
        >
          <MaterialCommunityIcons
            name="facebook"
            size={20}
            color="#1877F2"
            style={styles.facebookIcon}
          />
          <Text style={styles.googleText}>{strings.login.facebookButton}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon width={20} height={20} style={styles.googleIcon} />
          <Text style={styles.googleText}>{strings.login.googleButton}</Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('SignupStep1')}>
            <Text style={styles.footerLink}>{strings.login.footerAction}</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>{strings.login.footerPrefix}</Text>
        </View>
      </AuthScreenShell>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#F6F0E6',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E8DCCD',
  },
  extraOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  extraOptionsCompact: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  securityHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityHintText: {
    color: '#0A1124',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  rememberMeRow: { flexDirection: 'row', alignItems: 'center' },
  rememberMeText: { color: '#666', fontSize: 14 },
  forgotPasswordText: { color: '#0A1124', fontSize: 14, fontWeight: '700' },

  submitBtn: {
    backgroundColor: '#0A1124',
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#a5a39fff',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#0A1124',
    fontSize: 13,
    fontWeight: '600',
  },

  googleButton: {
    flexDirection: 'row',
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#a5a39fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  facebookButton: {
    flexDirection: 'row',
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#a5a39fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  googleIcon: { width: 20, height: 20, marginLeft: 12 },
  facebookIcon: { marginLeft: 12 },
  googleText: { fontSize: 15, color: '#22304A', fontWeight: '600' },
  footerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginTop: 24,
    paddingBottom: 8,
  },
  footerText: { color: '#666', fontSize: 14 },
  footerLink: { color: '#0A1124', fontWeight: 'bold', fontSize: 14 },
});

export default LoginUI;
