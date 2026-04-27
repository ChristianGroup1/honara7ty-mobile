import AsyncStorage from '@react-native-async-storage/async-storage';

const buildKey = (userId: string) => `notification_permission_seen:${userId}`;

export const hasSeenNotificationPermissionPrompt = async (
  userId?: string | null,
) => {
  if (!userId) {
    return false;
  }

  const value = await AsyncStorage.getItem(buildKey(userId));
  return value === '1';
};

export const markNotificationPermissionPromptSeen = async (
  userId?: string | null,
) => {
  if (!userId) {
    return;
  }

  await AsyncStorage.setItem(buildKey(userId), '1');
};
