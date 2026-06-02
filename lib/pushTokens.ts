import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import supabase from './supbase';

const DEVOTION_CHANNEL_ID = 'devotion_reminder';

function isExpiredJwtError(error: any) {
  return (
    error?.code === 'PGRST303' ||
    /jwt expired/i.test(String(error?.message ?? ''))
  );
}

function formatPushError(error: any) {
  const code = error?.code ? `${error.code}: ` : '';
  const message = error?.message ?? String(error ?? 'Unknown error');
  return `${code}${message}`;
}

async function upsertPushToken(params: {
  userId: string;
  token: string;
}) {
  const payload = {
    user_id: params.userId,
    token: params.token,
    platform: Platform.OS,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from('user_push_tokens')
    .upsert(payload, { onConflict: 'token' });

  if (isExpiredJwtError(result.error)) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      result = await supabase
        .from('user_push_tokens')
        .upsert(payload, { onConflict: 'token' });
    }
  }

  return result;
}

async function ensurePushChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await notifee.createChannel({
    id: DEVOTION_CHANNEL_ID,
    name: 'تذكيرات الخلوة',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function registerPushToken(
  userId?: string | null,
  options?: { requestPermission?: boolean },
) {
  if (!userId || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
    return { registered: false, reason: 'missing_user_or_platform' };
  }

  const shouldRequestPermission = options?.requestPermission !== false;
  const notifeeSettings = shouldRequestPermission
    ? await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
      })
    : await notifee.getNotificationSettings();
  const notifeeAllowed =
    notifeeSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    notifeeSettings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

  let firebaseAllowed = notifeeAllowed;
  if (shouldRequestPermission) {
    const firebasePermissionStatus = await messaging().requestPermission();
    firebaseAllowed =
      firebasePermissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      firebasePermissionStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }

  if (!notifeeAllowed && !firebaseAllowed) {
    return { registered: false, reason: 'permission_denied' };
  }

  await ensurePushChannel();

  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages();
  }

  let token: string | null = null;
  try {
    token = await messaging().getToken();
  } catch (tokenError) {
    if (__DEV__) {
      console.warn('[push] failed to get FCM token', tokenError);
    }
    return {
      registered: false,
      reason: 'fcm_token_error',
      details: formatPushError(tokenError),
      error: tokenError,
    };
  }

  if (!token) {
    return { registered: false, reason: 'missing_token' };
  }

  const { error } = await upsertPushToken({ userId, token });

  if (error) {
    if (__DEV__) {
      console.warn('[push] failed to register token', error);
    }
    return {
      registered: false,
      reason: 'supabase_error',
      details: formatPushError(error),
      error,
    };
  }

  if (__DEV__) {
    console.warn('[push] token registered', {
      userId,
      platform: Platform.OS,
      tokenPreview: `${token.slice(0, 8)}...`,
    });
  }

  return { registered: true, token };
}

export function subscribePushTokenRefresh(userId?: string | null) {
  if (!userId) {
    return () => {};
  }

  return messaging().onTokenRefresh(async token => {
    const { error } = await upsertPushToken({ userId, token });
    if (__DEV__ && error) {
      console.warn('[push] failed to refresh token', error);
    }
  });
}

export async function unregisterCurrentPushToken() {
  const token = await messaging().getToken();
  if (!token) {
    return;
  }

  await supabase.from('user_push_tokens').delete().eq('token', token);
}
