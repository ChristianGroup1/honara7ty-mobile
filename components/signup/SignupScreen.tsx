import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from 'react-native-paper';
import supabase from '../../lib/supbase';
import { ensureDefaultDevotionTime } from '../../lib/ensureDefaultDevotionTime';
import { configureGoogleSignIn } from '../../lib/googleSignInConfig';
import {
  localizeAuthError,
  MIN_PASSWORD_LENGTH,
  EMAIL_REGEX,
} from '../../lib/authErrors';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';
import { authPaperTheme, AUTH_GOLD } from '../auth/theme';
import AuthScreenShell from '../auth/AuthScreenShell';
import { authStrings } from '../auth/strings';
import GoogleIcon from '../../assets/images/google-icon.svg';
import { trackEvent, identifyUser } from '../../lib/analytics';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { startFacebookAuth } from '../../lib/socialAuth';

type Props = { navigation: any };

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

const SignupUI: React.FC<Props> = ({ navigation }) => {
  const strings = authStrings;
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

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleRegister = async () => {
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const { password, confirmPassword } = formData;

    const errors = {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    };
    let hasError = false;

    if (!trimmedName) {
      errors.name = strings.signup.fullNameRequired;
      hasError = true;
    }
    if (!trimmedEmail) {
      errors.email = strings.signup.emailRequired;
      hasError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = strings.signup.emailInvalid;
      hasError = true;
    }
    if (!trimmedPhone) {
      errors.phone = strings.signup.phoneRequired;
      hasError = true;
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = strings.signup.phoneInvalid;
      hasError = true;
    }
    if (!password) {
      errors.password = strings.signup.passwordRequired;
      hasError = true;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = strings.signup.passwordTooShort(MIN_PASSWORD_LENGTH);
      hasError = true;
    }
    if (!confirmPassword) {
      errors.confirmPassword = strings.signup.confirmPasswordRequired;
      hasError = true;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = strings.signup.confirmPasswordMismatch;
      hasError = true;
    }

    setFieldErrors(errors);
    if (hasError) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            phone: trimmedPhone,
          },
        },
      });

      if (error) {
        showAlert(strings.signup.signUpErrorTitle, localizeAuthError(error.message));
      } else {
        const signedInUserId = data.session?.user?.id ?? data.user?.id;
        navigation.navigate('ProfileCompletion', {
          userId: signedInUserId,
          email: trimmedEmail,
          requires_login_before_submit: !data.session?.user,
        });
      }
    } catch (err: any) {
      showAlert(strings.common.genericErrorTitle, localizeAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      configureGoogleSignIn();
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;

      if (idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          showAlert(strings.common.genericErrorTitle, localizeAuthError(error.message));
        } else {
          if (data?.user?.id) {
            identifyUser(data.user.id, {
              email: data.user.email ?? undefined,
              name: data.user.user_metadata?.full_name ?? undefined,
            });
          }
          trackEvent('user_signed_up_google', { method: 'google' });
          await ensureDefaultDevotionTime(data?.user?.id);
          navigation.replace('Onboarding');
        }
      } else {
        return;
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showAlert(
          strings.common.cancelledTitle,
          strings.signup.cancelledMessage,
          undefined,
          'warning',
        );
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showAlert(
          strings.common.signUpInProgressTitle,
          strings.signup.inProgressMessage,
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
        showAlert(strings.common.genericErrorTitle, localizeAuthError(error.message));
      }
    }
  };

  const handleFacebookSignUp = async () => {
    setLoading(true);
    try {
      await startFacebookAuth();
      trackEvent('user_signed_up_facebook', { method: 'facebook' });
    } catch (error: any) {
      showAlert(strings.common.genericErrorTitle, localizeAuthError(error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider theme={authPaperTheme}>
      <AuthScreenShell
        title={strings.signup.title}
        onBack={() => navigation.goBack()}
        headerExtras={
          <View style={styles.stepContainer}>
            <View style={styles.stepActive} />
            <View style={styles.stepInactive} />
          </View>
        }
        scrollProps={{
          keyboardShouldPersistTaps: 'always',
          enableResetScrollToCoords: false,
          enableAutomaticScroll: Platform.OS === 'ios',
        }}
      >
        <CustomInput
          fieldLabel={strings.signup.fullName}
          placeholder={strings.signup.fullNamePlaceholder}
          icon="account-outline"
          value={formData.name}
          onChangeText={(t: string) => {
            setFormData(prev => ({ ...prev, name: t }));
            if (fieldErrors.name)
              setFieldErrors(prev => ({ ...prev, name: '' }));
          }}
          error={fieldErrors.name}
        />
        <CustomInput
          fieldLabel={strings.common.email}
          placeholder={strings.common.emailPlaceholder}
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(t: string) => {
            setFormData(prev => ({ ...prev, email: t }));
            if (fieldErrors.email)
              setFieldErrors(prev => ({ ...prev, email: '' }));
          }}
          error={fieldErrors.email}
        />
        <CustomInput
          fieldLabel={strings.signup.phone}
          placeholder={strings.signup.phonePlaceholder}
          icon="phone-outline"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(t: string) => {
            setFormData(prev => ({ ...prev, phone: t }));
            if (fieldErrors.phone)
              setFieldErrors(prev => ({ ...prev, phone: '' }));
          }}
          error={fieldErrors.phone}
        />
        <CustomInput
          fieldLabel={`${strings.common.password} `}
          placeholder={strings.signup.passwordPlaceholder}
          icon="lock-outline"
          isPassword={true}
          secureText={secureText}
          setSecureText={setSecureText}
          value={formData.password}
          onChangeText={(t: string) => {
            setFormData(prev => ({ ...prev, password: t }));
            if (fieldErrors.password)
              setFieldErrors(prev => ({ ...prev, password: '' }));
          }}
          error={fieldErrors.password}
        />
        <CustomInput
          fieldLabel={`${strings.signup.confirmPassword} `}
          placeholder={strings.signup.confirmPasswordPlaceholder}
          icon="lock-check-outline"
          isPassword={true}
          secureText={secureConfirm}
          setSecureText={setSecureConfirm}
          value={formData.confirmPassword}
          onChangeText={(t: string) => {
            setFormData(prev => ({ ...prev, confirmPassword: t }));
            if (fieldErrors.confirmPassword)
              setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
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
              <Text style={styles.submitText}>{strings.common.next}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{strings.common.or}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignUp}
          disabled={loading}
        >
          <GoogleIcon width={20} height={20} style={styles.googleIcon} />
          <Text style={styles.googleText}>{strings.signup.googleButton}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.facebookButton}
          onPress={handleFacebookSignUp}
          disabled={loading}
        >
          <MaterialCommunityIcons
            name="facebook"
            size={20}
            color="#1877F2"
            style={styles.facebookIcon}
          />
          <Text style={styles.googleText}>{strings.signup.facebookButton}</Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>{strings.signup.footerAction}</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>{strings.signup.footerPrefix}</Text>
        </View>
      </AuthScreenShell>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
  },
  stepActive: {
    height: 5,
    width: 36,
    borderRadius: 3,
    backgroundColor: AUTH_GOLD,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  introCard: {
    backgroundColor: '#F6F0E6',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8DCCD',
  },
  introIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#A98252',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  introTitle: {
    color: '#0A1124',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  introDescription: {
    color: '#6F6558',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
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
  metaRow: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F1E8',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  metaText: {
    color: '#8A7E6C',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitIcon: { marginLeft: 4 },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
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
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#a5a39fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  facebookButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#a5a39fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginTop: 12,
  },
  googleIcon: { width: 20, height: 20, marginLeft: 10 },
  facebookIcon: { marginLeft: 10 },
  googleText: { fontSize: 14, color: '#22304A', fontWeight: '600' },
  footerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginTop: 22,
    paddingBottom: 10,
  },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: '#0A1124', fontWeight: 'bold', fontSize: 14 },
});

export default SignupUI;
