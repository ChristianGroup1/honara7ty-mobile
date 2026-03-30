import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import {
  localizeAuthError,
  MIN_PASSWORD_LENGTH,
  EMAIL_REGEX,
} from '../../lib/authErrors';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';
import { authPaperTheme, AUTH_GOLD, AUTH_NAVY } from '../auth/theme';
import AuthScreenShell from '../auth/AuthScreenShell';
import { authStrings } from '../auth/strings';

type Props = { navigation: any; route: any };

const ResetPasswordUI: React.FC<Props> = ({ navigation, route }) => {
  const strings = authStrings;
  // Default to true so navigating here normally (without a deep link) shows the form.
  const linkValid = route?.params?.linkValid !== false;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
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

  const shouldShowBackButton = linkValid;

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
      errors.password = strings.resetPassword.newPasswordRequired;
      hasError = true;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = strings.resetPassword.passwordTooShort(MIN_PASSWORD_LENGTH);
      hasError = true;
    }
    if (!confirm) {
      errors.confirm = strings.resetPassword.confirmPasswordRequired;
      hasError = true;
    } else if (password !== confirm) {
      errors.confirm = strings.resetPassword.confirmPasswordMismatch;
      hasError = true;
    }
    setFieldErrors(errors);
    if (hasError) {
      const firstError = errors.password || errors.confirm;
      showAlert(strings.resetPassword.invalidDataTitle, firstError, undefined, 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showAlert(strings.common.genericErrorTitle, localizeAuthError(error.message));
      } else {
        showAlert(
          strings.resetPassword.successTitle,
          strings.resetPassword.successMessage,
          [
            {
              text: strings.resetPassword.footerAction,
              onPress: () => navigation.navigate('Login'),
            },
          ],
          'success',
        );
      }
    } catch (err: any) {
      showAlert(strings.common.genericErrorTitle, localizeAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async () => {
    const trimmed = requestEmail.trim();
    if (!trimmed) {
      setRequestEmailError(strings.resetPassword.requestEmailRequired);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setRequestEmailError(strings.resetPassword.requestEmailInvalid);
      return;
    }
    setRequestEmailError('');
    setRequestLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'honara7ty://reset-password',
      });
      if (error) {
        showAlert(strings.common.genericErrorTitle, localizeAuthError(error.message));
      } else {
        setRequestSent(true);
      }
    } catch (err: any) {
      showAlert(strings.common.genericErrorTitle, localizeAuthError(err.message));
    } finally {
      setRequestLoading(false);
    }
  };

  const getHeaderTitle = (): string => {
    if (!linkValid) {
      return requestSent
        ? strings.resetPassword.requestSentTitle
        : strings.resetPassword.invalidLinkTitle;
    }
    return strings.resetPassword.newPasswordTitle;
  };

  return (
    <PaperProvider theme={authPaperTheme}>
      <AuthScreenShell
        title={getHeaderTitle()}
        onBack={() => navigation.goBack()}
        showBackButton={shouldShowBackButton}
      >
        {!linkValid ? (
          /* ── Invalid Link State ── */
          requestSent ? (
            /* ── Sent Confirmation ── */
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={52}
                  color={AUTH_GOLD}
                />
              </View>
              <Text style={styles.successTitle}>
                {strings.resetPassword.requestSentCheckTitle}
              </Text>
              <Text style={styles.successMessage}>
                {strings.resetPassword.requestSentCheckMessage}
              </Text>
              <View style={styles.emailBadge}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={16}
                  color={AUTH_NAVY}
                  style={styles.emailBadgeIcon}
                />
                <Text style={styles.emailBadgeText}>{requestEmail.trim()}</Text>
              </View>
              <Text style={styles.successHint}>{strings.resetPassword.requestSentHint}</Text>
              <TouchableOpacity
                style={styles.resendBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setRequestSent(false);
                  setRequestEmail('');
                }}
              >
                <Text style={styles.resendText}>{strings.resetPassword.resend}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="login-submit"
                style={styles.submitBtn}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.submitText}>{strings.resetPassword.footerAction}</Text>
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
              <Text style={styles.invalidMessage}>{strings.resetPassword.linkOffMessage}</Text>
              <CustomInput
                fieldLabel={strings.common.email}
                icon="email-outline"
                placeholder={strings.common.emailPlaceholder}
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
                    <Text style={styles.submitText}>{strings.resetPassword.sendNewLink}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.footerContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>{strings.resetPassword.footerAction}</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}>{strings.resetPassword.footerPrefix}</Text>
              </View>
            </View>
          )
        ) : (
          /* ── Form ── */
          <>
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.infoTitle}>{strings.resetPassword.infoTitle}</Text>
              <Text style={styles.infoDescription}>
                {strings.resetPassword.infoDescription}
              </Text>
            </View>
            <CustomInput
              fieldLabel={`${strings.resetPassword.newPassword} `}
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
              fieldLabel={`${strings.resetPassword.confirmPassword} `}
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
                {strings.resetPassword.minPasswordHint(MIN_PASSWORD_LENGTH)}
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
                  <Text style={styles.submitText}>{strings.resetPassword.submit}</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </AuthScreenShell>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: '#F6F0E6',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E8DCCD',
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#A98252',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  infoTitle: {
    color: AUTH_NAVY,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#6F6558',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
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
    backgroundColor: '#0A1124',
    height: 58,
    width: '100%',
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
  submitRow: { flexDirection: 'row', alignItems: 'center' },
  submitIcon: { marginLeft: 8 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  /* ── Sent Confirmation ── */
  successBox: {
    alignItems: 'center',
    paddingTop: 10,
    height: '100%',
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AUTH_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AUTH_NAVY,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(10,17,36,0.06)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emailBadgeIcon: { marginLeft: 6 },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: AUTH_NAVY,
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
    color: AUTH_NAVY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* ── Footer ── */
  footerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: AUTH_NAVY, fontWeight: 'bold', fontSize: 14 },
});

export default ResetPasswordUI;
