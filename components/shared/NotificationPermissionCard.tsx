import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NAVY } from './designTokens';

type Props = {
  title: string;
  body: string;
  actionLabel: string;
  onPress: () => void;
  compact?: boolean;
  loading?: boolean;
};

const NotificationPermissionCard = ({
  title,
  body,
  actionLabel,
  onPress,
  compact = false,
  loading = false,
}: Props) => (
  <View style={[styles.card, compact && styles.cardCompact]}>
    <View style={styles.topRow}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="bell" size={18} color="#FFF" />
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>الإشعارات</Text>
      </View>
    </View>

    <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
    <Text style={[styles.body, compact && styles.bodyCompact]}>{body}</Text>

    <TouchableOpacity
      style={[styles.button, compact && styles.buttonCompact]}
      activeOpacity={0.86}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.buttonText}>{actionLabel}</Text>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3E8F1',
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  cardCompact: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#78A1BD',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 15,
  },
  body: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'left',
    marginBottom: 14,
  },
  bodyCompact: {
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#78A1BD',
    borderRadius: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonCompact: {
    minHeight: 44,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default NotificationPermissionCard;
