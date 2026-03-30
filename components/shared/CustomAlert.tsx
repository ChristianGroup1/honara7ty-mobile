import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  buttons?: AlertButton[];
}

interface Props extends AlertConfig {
  visible: boolean;
  onDismiss: () => void;
}

const TYPE_CONFIG = {
  error:   { icon: 'alert-circle-outline', color: '#FF3B30', bgColor: 'rgba(255,59,48,0.12)' },
  warning: { icon: 'alert-outline',         color: '#FF9500', bgColor: 'rgba(255,149,0,0.12)' },
  success: { icon: 'check-circle-outline',  color: '#34C759', bgColor: 'rgba(52,199,89,0.12)' },
  info:    { icon: 'information-outline',   color: '#0A1124', bgColor: 'rgba(10,17,36,0.12)' },
} as const;

const CustomAlert: React.FC<Props> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onDismiss,
}) => {
  const { icon, color, bgColor } = TYPE_CONFIG[type];
  const strings = getStrings().shared;
  const resolvedButtons: AlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: strings.alert.ok }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
            <MaterialCommunityIcons name={icon} size={44} color={color} />
          </View>

          <Text style={styles.title}>{title}</Text>

          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.divider} />

          <View style={styles.buttonsRow}>
            {resolvedButtons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const isLast = i === resolvedButtons.length - 1;
              const buttonTextStyle = isDestructive
                ? styles.btnTextDestructive
                : isCancel
                  ? styles.btnTextCancel
                  : styles.btnTextDefault;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.btn, !isLast && styles.btnBorderRight]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onDismiss();
                    btn.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      buttonTextStyle,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingTop: 28,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A1124',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnTextDestructive: { color: '#FF3B30' },
  btnTextCancel: { color: '#888' },
  btnTextDefault: { color: '#0A1124' },
});

export default CustomAlert;
