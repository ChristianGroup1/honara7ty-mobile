import {
  cancelDevotionReminder,
  scheduleDailyDevotionReminder,
} from './notifications';
import { refreshProfileRecord } from './offlineSync';
import { getFocusModePreference, scheduleFocusMode, cancelScheduledFocusMode } from './focusMode';
import { Platform } from 'react-native';

const DEFAULT_DEVOTION_TIME = '07:00';

export async function syncDevotionReminderSchedule(
  userId?: string | null,
  options?: { startTomorrow?: boolean; requestPermission?: boolean },
) {
  await cancelDevotionReminder();

  if (!userId) {
    return { error: null };
  }

  const { data } = await refreshProfileRecord(userId);

  const devotionTime = data?.devotion_time || DEFAULT_DEVOTION_TIME;
  const [hours, minutes] = devotionTime.split(':').map(Number);

  await scheduleDailyDevotionReminder(hours, minutes, {
    startTomorrow: options?.startTomorrow,
    requestPermission: options?.requestPermission,
  });

  if (Platform.OS === 'android') {
    const pref = await getFocusModePreference();
    if (pref === 'automatic') {
      await scheduleFocusMode(hours, minutes);
    } else {
      await cancelScheduledFocusMode();
    }
  }

  return { error: null };
}
