import supabase from './supbase';
import { scheduleDailyDevotionReminder } from './notifications';

const DEFAULT_DEVOTION_TIME = '07:00';

export const ensureDefaultDevotionTime = async (
  userId?: string | null,
  options?: { scheduleReminder?: boolean },
) => {
  if (!userId) {
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('devotion_time')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return;
  }

  const devotionTime = data?.devotion_time || DEFAULT_DEVOTION_TIME;

  if (!data?.devotion_time) {
    await supabase.from('profiles').upsert(
      {
        id: userId,
        devotion_time: DEFAULT_DEVOTION_TIME,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  }

  if (!options?.scheduleReminder) {
    return;
  }

  const [hours, minutes] = devotionTime.split(':').map(Number);

  try {
    await scheduleDailyDevotionReminder(hours, minutes);
  } catch {}
};

export { DEFAULT_DEVOTION_TIME };
