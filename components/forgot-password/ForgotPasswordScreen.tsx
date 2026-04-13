import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import { localizeAuthError, EMAIL_REGEX } from '../../lib/authErrors';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import CustomInput from '../shared/CustomInput';
import { authPaperTheme, AUTH_GOLD, AUTH_NAVY } from '../auth/theme';
import AuthScreenShell from '../auth/AuthScreenShell';
import { authStrings } from '../auth/strings';
import { NAVY } from '../bible-memorization/utils';

type Props = { navigation: any };

const ForgotPasswordUI: React.FC<Props> = ({ navigation }) => {
  const strings = authStrings;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
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

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(strings.forgotPassword.emailRequired);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError(strings.forgotPassword.emailInvalid);
      return;
    }
    setEmailError('');

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'honara7tyapp://reset-password',
      });
      if (error) {
        showAlert(
          strings.common.genericErrorTitle,
          localizeAuthError(error.message),
        );
      } else {
        setSent(true);
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

  return (
    <PaperProvider theme={authPaperTheme}>
      <AuthScreenShell
        title={strings.forgotPassword.title}
        onBack={() => navigation.goBack()}
        formPointerEvents="box-none"
      >
        {sent ? (
          /* ── Success State ── */
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons
                name="email-check-outline"
                size={52}
                color={'#fff'}
              />
            </View>

            <Text style={styles.successTitle}>
              {strings.forgotPassword.resetSentTitle}
            </Text>
            <Text style={styles.successMessage}>
              {strings.forgotPassword.resetSentMessage}
            </Text>
            <View style={styles.emailBadge}>
              <MaterialCommunityIcons
                name="email-outline"
                size={16}
                color={AUTH_NAVY}
                style={styles.emailBadgeIcon}
              />
              <Text style={styles.emailBadgeText}>{email.trim()}</Text>
            </View>

            <Text style={styles.successHint}>
              {strings.forgotPassword.resetHint}
            </Text>

            {/* <TouchableOpacity
              style={styles.resendBtn}
              activeOpacity={0.7}
              onPress={() => {
                setSent(false);
                setEmail('');
              }}
            >
              <Text style={styles.resendText}>إرسال مرة أخرى</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              testID="login-submit"
              style={styles.submitBtn}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>
                {strings.forgotPassword.footerAction}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Email Input State ── */
          <View style={{ height: '100%' }}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <MaterialCommunityIcons
                  name="email-fast-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.infoTitle}>
                {strings.forgotPassword.infoTitle}
              </Text>
              <Text style={styles.infoDescription}>
                {strings.forgotPassword.infoDescription}
              </Text>
            </View>
            <CustomInput
              fieldLabel={strings.common.email}
              icon="email-outline"
              placeholder={strings.common.emailPlaceholder}
              value={email}
              onChangeText={t => {
                setEmail(t);
                if (emailError) setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />

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
                  <Text style={styles.submitText}>
                    {strings.forgotPassword.sendRecoveryLink}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footerContainer}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.footerLink}>
                  {strings.forgotPassword.footerAction}
                </Text>
              </TouchableOpacity>
              <Text style={styles.footerText}>
                {strings.forgotPassword.footerPrefix}
              </Text>
            </View>
          </View>
        )}
      </AuthScreenShell>
      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: NAVY,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 2,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
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
  footerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: AUTH_NAVY, fontWeight: 'bold', fontSize: 14 },

  /* ── Success State ── */
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
    marginBottom: 12,
  },
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
    paddingHorizontal: 4,
    color: AUTH_NAVY,
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
    color: AUTH_GOLD,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordUI;
