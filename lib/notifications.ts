/**
 * notifications.ts
 *
 * Daily devotion-time reminder helper using @notifee/react-native.
 *
 * Native setup required (run after `npm install`):
 *   Android: no extra steps — Notifee auto-links.
 *   iOS:     cd ios && pod install
 *
 * Android permissions required in AndroidManifest.xml:
 *   POST_NOTIFICATIONS, USE_EXACT_ALARM, SCHEDULE_EXACT_ALARM,
 *   RECEIVE_BOOT_COMPLETED, WAKE_LOCK
 */

import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Linking } from 'react-native';
import { getStrings } from '../localization';

const CHANNEL_ID = 'devotion_reminder';
const NOTIFICATION_ID = 'daily_devotion';
const FOLLOW_UP_NOTIFICATION_ID = 'daily_devotion_follow_up';
export const DEVOTION_PRESS_ACTION_ID = 'open_devotion';

export type NotificationPermissionState =
  | 'allowed'
  | 'denied'
  | 'not_determined';

/** Ensure the Android notification channel exists (no-op on iOS). */
async function ensureChannel(): Promise<void> {
  const strings = getStrings().notifications;

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: strings.channelName,
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

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const settings = await notifee.getNotificationSettings();

  if (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  ) {
    return 'allowed';
  }

  if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
    return 'denied';
  }

  return 'not_determined';
}

function buildPrimaryTriggerDate(
  hours: number,
  minutes: number,
  options?: { startTomorrow?: boolean },
): Date {
  const now = new Date();
  const trigger = new Date(now);

  if (options?.startTomorrow) {
    trigger.setDate(trigger.getDate() + 1);
  }

  trigger.setHours(hours, minutes, 0, 0);

  if (!options?.startTomorrow && trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  return trigger;
}

function buildFollowUpTriggerDate(
  primaryTrigger: Date,
  hours: number,
  minutes: number,
): Date {
  const followUpTriggerDate = new Date(primaryTrigger);

  if (hours < 12) {
    followUpTriggerDate.setHours(hours + 12, minutes, 0, 0);
    return followUpTriggerDate;
  }

  const dayEnd = new Date(primaryTrigger);
  dayEnd.setHours(23, 59, 59, 999);
  const remainingMs = dayEnd.getTime() - primaryTrigger.getTime();
  const halfRemainingMs = Math.max(30 * 60 * 1000, Math.floor(remainingMs / 2));
  followUpTriggerDate.setTime(primaryTrigger.getTime() + halfRemainingMs);
  return followUpTriggerDate;
}

export async function openAppNotificationSettings(): Promise<void> {
  try {
    await notifee.openNotificationSettings();
  } catch {
    await Linking.openSettings();
  }
}

/**
 * Schedule (or reschedule) a daily devotion reminder at the given hour/minute.
 * Any previously scheduled reminder with the same ID is cancelled first.
 *
 * Requires AndroidManifest permissions:
 *   USE_EXACT_ALARM (API 33+) / SCHEDULE_EXACT_ALARM (API 31-32)
 *
 * @param hours   0-23
 * @param minutes 0-59
 */
export async function scheduleDailyDevotionReminder(
  hours: number,
  minutes: number,
  options?: { startTomorrow?: boolean; includeFollowUp?: boolean },
): Promise<void> {
  const strings = getStrings().notifications;
  const permissionState = await getNotificationPermissionState();
  if (permissionState !== 'allowed') {
    return;
  }

  await ensureChannel();

  // Cancel the existing reminder so we don't stack duplicates.
  await notifee.cancelNotification(NOTIFICATION_ID);
  await notifee.cancelNotification(FOLLOW_UP_NOTIFICATION_ID);

  // Build the next fire date at the requested local time.
  const trigger = buildPrimaryTriggerDate(hours, minutes, options);

  const timestampTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: trigger.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    // Use AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE to fire reliably on Android 12+
    // even when the device is in Doze mode.
    alarmManager: {
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    },
  };

  await notifee.createTriggerNotification(
    {
      id: NOTIFICATION_ID,
      title: strings.title,
      body: strings.body,
      data: {
        kind: 'devotion_reminder',
        target: 'DevotionModal',
      },
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        color: '#C9A84C',
        pressAction: { id: DEVOTION_PRESS_ACTION_ID },
        visibility: AndroidVisibility.PUBLIC,
        category: AndroidCategory.REMINDER,
        vibrationPattern: [100, 300, 200, 300],
        // Expanded (BigText) style shows the full verse when swiped down
        style: {
          type: AndroidStyle.BIGTEXT,
          text: strings.expandedText,
          title: strings.title,
          summary: strings.summary,
        },
      },
    },
    timestampTrigger,
  );

  if (options?.includeFollowUp === false) {
    return;
  }

  const followUpTrigger = buildFollowUpTriggerDate(trigger, hours, minutes);
  const followUpTimestampTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: followUpTrigger.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: {
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    },
  };

  await notifee.createTriggerNotification(
    {
      id: FOLLOW_UP_NOTIFICATION_ID,
      title: strings.title,
      body: strings.body,
      data: {
        kind: 'devotion_reminder',
        target: 'DevotionModal',
      },
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        color: '#C9A84C',
        pressAction: { id: DEVOTION_PRESS_ACTION_ID },
        visibility: AndroidVisibility.PUBLIC,
        category: AndroidCategory.REMINDER,
        vibrationPattern: [100, 300, 200, 300],
        style: {
          type: AndroidStyle.BIGTEXT,
          text: strings.expandedText,
          title: strings.title,
          summary: strings.summary,
        },
      },
    },
    followUpTimestampTrigger,
  );
}

/** Cancel the daily devotion reminder (e.g., when user removes their time). */
export async function cancelDevotionReminder(): Promise<void> {
  await notifee.cancelNotification(NOTIFICATION_ID);
  await notifee.cancelNotification(FOLLOW_UP_NOTIFICATION_ID);
}