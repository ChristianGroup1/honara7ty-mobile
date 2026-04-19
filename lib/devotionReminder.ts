import supabase from './supbase';
import {
  cancelDevotionReminder,
  scheduleDailyDevotionReminder,
} from './notifications';
import { refreshProfileRecord } from './offlineSync';

const DEFAULT_DEVOTION_TIME = '07:00';

export async function syncDevotionReminderSchedule(
  userId?: string | null,
  options?: { startTomorrow?: boolean },
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
  });

  return { error: null };
}
