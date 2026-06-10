import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import supabase from '../../lib/supbase';
import { ensureDefaultDevotionTime } from '../../lib/ensureDefaultDevotionTime';
import {
  hasSeenNotificationPermissionPrompt,
  markNotificationPermissionPromptSeen,
} from '../../lib/notificationPermissionFlow';
import {
  getNotificationPermissionState,
  openAppNotificationSettings,
  requestNotificationPermission,
} from '../../lib/notifications';
import { registerPushToken } from '../../lib/pushTokens';

const NAVY = '#0A1124';
const GOLD = '#78A1BD';
const SKY = '#EEF3F8';

const NotificationPermissionScreen = ({ navigation }: any) => {
  const strings = getStrings().notificationPermission;
  const [loading, setLoading] = useState(false);

  const goMain = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const resolveUserId = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id;
  };

  const handleAllow = async () => {
    setLoading(true);
    try {
      const userId = await resolveUserId();
      const permissionState = await getNotificationPermissionState();
      const seenPrompt = await hasSeenNotificationPermissionPrompt(userId);

      if (permissionState === 'allowed') {
        await markNotificationPermissionPromptSeen(userId);
        await ensureDefaultDevotionTime(userId, { scheduleReminder: true });
        await registerPushToken(userId, { requestPermission: false });
        return;
      }

      if (!seenPrompt) {
        await requestNotificationPermission();
        await markNotificationPermissionPromptSeen(userId);
        await ensureDefaultDevotionTime(userId, { scheduleReminder: true });
        await registerPushToken(userId, { requestPermission: false });
        return;
      }

      if (permissionState === 'denied') {
        await openAppNotificationSettings();
      }
      await markNotificationPermissionPromptSeen(userId);
      await ensureDefaultDevotionTime(userId, { scheduleReminder: true });
      await registerPushToken(userId, { requestPermission: false });
    } finally {
      setLoading(false);
      goMain();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="bell" size={28} color="#FFF" />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{strings.eyebrow}</Text>
          </View>
        </View>

        <Text style={styles.title}>{strings.title}</Text>
        <Text style={styles.body}>{strings.body}</Text>
      </View>

      <View style={styles.pointsCard}>
        {strings.points.map(point => (
          <View key={point} style={styles.pointRow}>
            <View style={styles.pointIconWrap}>
              <MaterialCommunityIcons name="check" size={16} color={NAVY} />
            </View>
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleAllow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{strings.allow}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SKY,
    padding: 18,
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(120,161,189,0.24)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#F5E8BE',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 12,
  },
  body: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'left',
  },
  pointsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    marginTop: 18,
    marginBottom: 18,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  pointIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F6EBCD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  pointText: {
    flex: 1,
    color: NAVY,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
    marginLeft: 12,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#78A1BD',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default NotificationPermissionScreen;
