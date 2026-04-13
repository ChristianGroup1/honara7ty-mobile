import supabase from './supbase';
import {
  cancelDevotionReminder,
  scheduleDailyDevotionReminder,
} from './notifications';

const DEFAULT_DEVOTION_TIME = '07:00';

export async function syncDevotionReminderSchedule(
  userId?: string | null,
  options?: { startTomorrow?: boolean },
) {
  await cancelDevotionReminder();

  if (!userId) {
    return { error: null };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('devotion_time')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { error };
  }

  const devotionTime = data?.devotion_time || DEFAULT_DEVOTION_TIME;
  const [hours, minutes] = devotionTime.split(':').map(Number);

  await scheduleDailyDevotionReminder(hours, minutes, {
    startTomorrow: options?.startTomorrow,
  });

  return { error: null };
}
