/**
 * notifications.ts
 *
 * Daily devotion-time reminder helper using @notifee/react-native.
 *
 * Native setup required (run after `npm install`):
 *   Android: no extra steps — Notifee auto-links.
 *   iOS:     cd ios && pod install
 *
 * Permissions are requested lazily on first call to scheduleDailyDevotionReminder.
 */

import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

const CHANNEL_ID = 'devotion_reminder';
const NOTIFICATION_ID = 'daily_devotion';

/** Ensure the Android notification channel exists (no-op on iOS). */
async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'تذكير الخلوة اليومية',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

/**
 * Request permission if not already granted.
 * Returns true when notifications are allowed.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Schedule (or reschedule) a daily devotion reminder at the given hour/minute.
 * Any previously scheduled reminder with the same ID is cancelled first.
 *
 * @param hours   0-23
 * @param minutes 0-59
 */
export async function scheduleDailyDevotionReminder(
  hours: number,
  minutes: number,
): Promise<void> {
  await requestNotificationPermission();
  await ensureChannel();

  // Cancel the existing reminder so we don't stack duplicates.
  await notifee.cancelNotification(NOTIFICATION_ID);

  // Build the next fire date at the requested local time.
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(hours, minutes, 0, 0);
  // If that time has already passed today, fire tomorrow.
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  const timestampTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: trigger.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  await notifee.createTriggerNotification(
    {
      id: NOTIFICATION_ID,
      title: '⏰ وقت خلوتك مع الله',
      body: 'تذكّر تأخذ خلوتك النهارده 🙏',
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    },
    timestampTrigger,
  );
}

/** Cancel the daily devotion reminder (e.g., when user removes their time). */
export async function cancelDevotionReminder(): Promise<void> {
  await notifee.cancelNotification(NOTIFICATION_ID);
}
