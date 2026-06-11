import { scheduleDailyDevotionReminder } from './notifications';
import { refreshProfileRecord, saveProfileRecord } from './offlineSync';

const DEFAULT_DEVOTION_TIME = '07:00';

export const ensureDefaultDevotionTime = async (
  userId?: string | null,
  options?: { scheduleReminder?: boolean },
) => {
  if (!userId) {
    return;
  }

  const { data } = await refreshProfileRecord(userId);

  const devotionTime = data?.devotion_time || DEFAULT_DEVOTION_TIME;

  if (!data?.devotion_time) {
    await saveProfileRecord({
      userId,
      profile: {
        devotion_time: DEFAULT_DEVOTION_TIME,
        updated_at: new Date().toISOString(),
      },
    });
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
