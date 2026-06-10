/**
 * Daily devotion-time reminder helper using @notifee/react-native.
 *
 * Android permissions required in AndroidManifest.xml:
 *   POST_NOTIFICATIONS, USE_EXACT_ALARM, SCHEDULE_EXACT_ALARM,
 *   RECEIVE_BOOT_COMPLETED, WAKE_LOCK
 */

import notifee, {
  AlarmType,
  AndroidBigTextStyle,
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  AuthorizationStatus,
  Notification,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Linking, Platform } from 'react-native';
import { getStrings } from '../localization';

const CHANNEL_ID = 'devotion_reminder';
const NOTIFICATION_ID = 'daily_devotion';
const FOLLOW_UP_NOTIFICATION_ID = 'daily_devotion_follow_up';
export const DEVOTION_PRESS_ACTION_ID = 'open_devotion';
export const DEVOTION_REMINDER_SCHEDULE_DAYS = 30;

const ANDROID_MAX_TIMESTAMP_TRIGGERS = 50;
const DEVOTION_REMINDER_CLEAR_DAYS = Math.max(
  DEVOTION_REMINDER_SCHEDULE_DAYS,
  90,
);

export type NotificationPermissionState =
  | 'allowed'
  | 'denied'
  | 'not_determined';

function buildDevotionNotificationId(dayOffset: number) {
  return `${NOTIFICATION_ID}_${dayOffset}`;
}

function buildDevotionFollowUpNotificationId(dayOffset: number) {
  return `${FOLLOW_UP_NOTIFICATION_ID}_${dayOffset}`;
}

function buildDevotionNotificationIds(days = DEVOTION_REMINDER_CLEAR_DAYS) {
  const ids: string[] = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    ids.push(buildDevotionNotificationId(dayOffset));
    ids.push(buildDevotionFollowUpNotificationId(dayOffset));
  }
  return ids;
}

function getEffectiveScheduleDays(options?: { includeFollowUp?: boolean }) {
  if (Platform.OS !== 'android') {
    return DEVOTION_REMINDER_SCHEDULE_DAYS;
  }

  const triggersPerDay = options?.includeFollowUp === false ? 1 : 2;
  return Math.min(
    DEVOTION_REMINDER_SCHEDULE_DAYS,
    Math.floor(ANDROID_MAX_TIMESTAMP_TRIGGERS / triggersPerDay),
  );
}

export async function clearDevotionNotifications(): Promise<void> {
  const ids = buildDevotionNotificationIds();
  await Promise.all([
    notifee.cancelDisplayedNotifications(ids),
    notifee.cancelTriggerNotifications(ids),
  ]);
}

async function ensureChannel(): Promise<void> {
  const strings = getStrings().notifications;

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: strings.channelName,
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission({
    alert: true,
    badge: true,
    sound: true,
  });
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
  options?: { startTomorrow?: boolean; dayOffset?: number },
): Date {
  const now = new Date();
  const trigger = new Date(now);

  if (options?.startTomorrow || options?.dayOffset) {
    trigger.setDate(
      trigger.getDate() +
        (options?.startTomorrow ? 1 : 0) +
        (options?.dayOffset ?? 0),
    );
  }

  trigger.setHours(hours, minutes, 0, 0);

  if (!options?.startTomorrow && !options?.dayOffset && trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  return trigger;
}

function buildFollowUpTriggerDate(
  primaryTrigger: Date,
  hours: number,
  minutes: number,
): Date | null {
  const followUpTriggerDate = new Date(primaryTrigger);
  const minimumFollowUpTime = new Date(
    primaryTrigger.getTime() + 30 * 60 * 1000,
  );

  if (hours < 12) {
    followUpTriggerDate.setHours(hours + 12, minutes, 0, 0);
    return followUpTriggerDate;
  }

  const dayEnd = new Date(primaryTrigger);
  dayEnd.setHours(23, 59, 0, 0);
  const remainingMs = dayEnd.getTime() - primaryTrigger.getTime();

  if (remainingMs < 30 * 60 * 1000) {
    return null;
  }

  const halfRemainingMs = Math.floor(remainingMs / 2);
  followUpTriggerDate.setTime(primaryTrigger.getTime() + halfRemainingMs);

  if (followUpTriggerDate < minimumFollowUpTime) {
    return minimumFollowUpTime;
  }

  return followUpTriggerDate;
}

function buildTimestampTrigger(timestamp: number): TimestampTrigger {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
  };

  if (Platform.OS === 'android') {
    trigger.alarmManager = {
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    };
  }

  return trigger;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 4294967296;
  }
  return hash;
}

function seededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 0x100000000;
  };
}

function shuffleVerses(verses: readonly string[], seed: number) {
  const shuffled = verses.slice();
  const random = seededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function buildVersePlan(
  verses: readonly string[],
  startDate: Date,
  count: number,
) {
  if (!verses.length) {
    return [];
  }

  const seed = hashString(startDate.toISOString().slice(0, 10));
  const plan: string[] = [];
  let cycle = 0;

  while (plan.length < count) {
    plan.push(...shuffleVerses(verses, seed + cycle));
    cycle += 1;
  }

  return plan.slice(0, count);
}

function buildDevotionNotificationPayload(params: {
  id: string;
  title: string;
  verse: string;
  actionText: string;
  summary: string;
}): Notification {
  return {
    id: params.id,
    title: params.title,
    body: params.verse,
    data: {
      kind: 'devotion_reminder',
      target: 'DevotionModal',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        banner: true,
        list: true,
        sound: true,
        badge: true,
      },
    },
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification',
      color: '#78A1BD',
      pressAction: {
        id: DEVOTION_PRESS_ACTION_ID,
        launchActivity: 'default',
      },
      visibility: AndroidVisibility.PUBLIC,
      category: AndroidCategory.REMINDER,
      vibrationPattern: [100, 300, 200, 300],
      style: {
        type: AndroidStyle.BIGTEXT,
        text: `📖 ${params.verse}\n\n${params.actionText}`,
        title: params.title,
        summary: params.summary,
      } as AndroidBigTextStyle,
    },
  };
}

async function createDevotionTriggerNotification(
  payload: ReturnType<typeof buildDevotionNotificationPayload>,
  trigger: TimestampTrigger,
) {
  try {
    await notifee.createTriggerNotification(payload, trigger);
  } catch (error) {
    if (Platform.OS !== 'android' || !trigger.alarmManager) {
      throw error;
    }

    const fallbackTrigger = { ...trigger };
    delete fallbackTrigger.alarmManager;
    await notifee.createTriggerNotification(payload, fallbackTrigger);
  }
}

export async function openAppNotificationSettings(): Promise<void> {
  try {
    await notifee.openNotificationSettings();
  } catch {
    await Linking.openSettings();
  }
}

export async function scheduleDailyDevotionReminder(
  hours: number,
  minutes: number,
  options?: {
    startTomorrow?: boolean;
    includeFollowUp?: boolean;
    requestPermission?: boolean;
  },
): Promise<void> {
  const strings = getStrings().notifications;

  await clearDevotionNotifications();

  let permissionState = await getNotificationPermissionState();
  if (permissionState === 'denied') {
    return;
  }

  if (permissionState === 'not_determined') {
    if (options?.requestPermission === false) {
      return;
    }

    const allowed = await requestNotificationPermission();
    if (!allowed) {
      return;
    }
    permissionState = await getNotificationPermissionState();
    if (permissionState !== 'allowed') {
      return;
    }
  }

  await ensureChannel();

  const scheduleDays = getEffectiveScheduleDays(options);
  const firstTrigger = buildPrimaryTriggerDate(hours, minutes, options);
  const versePlan = buildVersePlan(strings.verses, firstTrigger, scheduleDays);

  for (let dayOffset = 0; dayOffset < scheduleDays; dayOffset += 1) {
    const verse = versePlan[dayOffset];
    if (!verse) {
      return;
    }

    const primaryTrigger = buildPrimaryTriggerDate(hours, minutes, {
      startTomorrow: options?.startTomorrow,
      dayOffset,
    });

    await createDevotionTriggerNotification(
      buildDevotionNotificationPayload({
        id: buildDevotionNotificationId(dayOffset),
        title: strings.title,
        verse,
        actionText: strings.actionText,
        summary: strings.summary,
      }),
      buildTimestampTrigger(primaryTrigger.getTime()),
    );

    if (options?.includeFollowUp === false) {
      continue;
    }

    const followUpTrigger = buildFollowUpTriggerDate(
      primaryTrigger,
      hours,
      minutes,
    );
    if (!followUpTrigger) {
      continue;
    }

    await createDevotionTriggerNotification(
      buildDevotionNotificationPayload({
        id: buildDevotionFollowUpNotificationId(dayOffset),
        title: strings.title,
        verse,
        actionText: strings.actionText,
        summary: strings.summary,
      }),
      buildTimestampTrigger(followUpTrigger.getTime()),
    );
  }
}

export async function cancelDevotionReminder(): Promise<void> {
  await clearDevotionNotifications();
}
