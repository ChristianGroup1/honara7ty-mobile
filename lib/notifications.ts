/**
 * notifications.ts
 *
 * Daily devotion-time reminder helper using @notifee/react-native.
 *
 * Native setup required (run after `npm install`) : 
 *   Android :  no extra steps — Notifee auto-links.
 *   iOS :      cd ios && pod install
 *
 * Android permissions required in AndroidManifest.xml : 
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
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Linking, Platform } from 'react-native';
import { getStrings } from '../localization';

const CHANNEL_ID = 'devotion_reminder';
const NOTIFICATION_ID = 'daily_devotion';
const FOLLOW_UP_NOTIFICATION_ID = 'daily_devotion_follow_up';
export const DEVOTION_PRESS_ACTION_ID = 'open_devotion';
const DAYS_TO_SCHEDULE = 30; // 👈 هنجدول لمدة 30 يوم

export type NotificationPermissionState =
  | 'allowed'
  | 'denied'
  | 'not_determined';

export async function clearDevotionNotifications() :  Promise<void> {
  const ids :  string[] = [];
  for (let i = 0; i < DAYS_TO_SCHEDULE; i++) {
    ids.push(`${NOTIFICATION_ID}_${i}`);
    ids.push(`${FOLLOW_UP_NOTIFICATION_ID}_${i}`);
  }
  
  await Promise.all([
    notifee.cancelDisplayedNotifications(ids),
    notifee.cancelTriggerNotifications(ids),
  ]);
}

/** Ensure the Android notification channel exists (no-op on iOS). */
async function ensureChannel() :  Promise<void> {
  const strings = getStrings().notifications;

  await notifee.createChannel({
    id :  CHANNEL_ID,
    name :  strings.channelName,
    importance :  AndroidImportance.HIGH,
    sound :  'default',
  });
}

/**
 * Request permission if not already granted.
 * Returns true when notifications are allowed.
 */
export async function requestNotificationPermission() :  Promise<boolean> {
  const settings = await notifee.requestPermission({
    alert :  true,
    badge :  true,
    sound :  true,
  });
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function getNotificationPermissionState() :  Promise<NotificationPermissionState> {
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

// 👈 تعديل حساب التاريخ ليقبل عدد الأيام
function buildPrimaryTriggerDate(
  hours :  number,
  minutes :  number,
  dayOffset :  number,
  options? :  { startTomorrow? :  boolean },
) :  Date {
  const now = new Date();
  const trigger = new Date(now);

  if (options?.startTomorrow) {
    trigger.setDate(trigger.getDate() + 1);
  }

  trigger.setHours(hours, minutes, 0, 0);

  if (!options?.startTomorrow && trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }
  
  // إضافة عدد الأيام للمستقبل
  trigger.setDate(trigger.getDate() + dayOffset);

  return trigger;
}

function buildFollowUpTriggerDate(
  primaryTrigger :  Date,
  hours :  number,
  minutes :  number,
) :  Date | null {
  const followUpTriggerDate = new Date(primaryTrigger);
  const minimumFollowUpTime = new Date(primaryTrigger.getTime() + 30 * 60 * 1000);

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

function buildTimestampTrigger(timestamp :  number) :  TimestampTrigger {
  const trigger :  TimestampTrigger = {
    type :  TriggerType.TIMESTAMP,
    timestamp,
    // 👈 تم إزالة repeatFrequency تماماً
  };

  if (Platform.OS === 'android') {
    // Use AlarmManager to fire reliably on Android 12+ even in Doze mode.
    trigger.alarmManager = {
      type :  AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    };
  }

  return trigger;
}

export async function openAppNotificationSettings() :  Promise<void> {
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
 * Requires AndroidManifest permissions : 
 *   USE_EXACT_ALARM (API 33+) / SCHEDULE_EXACT_ALARM (API 31-32)
 *
 * @param hours   0-23
 * @param minutes 0-59
 */
export async function scheduleDailyDevotionReminder(
  hours :  number,
  minutes :  number,
  options? :  {
    startTomorrow? :  boolean;
    includeFollowUp? :  boolean;
    requestPermission? :  boolean;
  },
) :  Promise<void> {
  const strings = getStrings().notifications;

  // Always clear old delivered/scheduled reminders first. This removes
  // legacy iOS payloads that were scheduled with invalid image attachments.
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

  // 👈 قائمة الآيات (ضعها هنا أو استدعيها من ملف localization)
const verses = [
  '"نَصِيبِي هُوَ الرَّبُّ، قَالَتْ نَفْسِي، مِنْ أَجْلِ ذلِكَ أَرْجُوهُ" (مراثي ارميا 3 : 24)',
  '"تَحْتَ ظِلِّهِ اشْتَهَيْتُ أَنْ أَجْلِسَ، وَثَمَرَتُهُ حُلْوَةٌ لِحَلْقِي" (نشيد الانشاد 2 : 3)',
  '"كَمَا يَشْتَاقُ الإِيَّلُ إِلَى جَدَاوِلِ الْمِيَاهِ، هكَذَا تَشْتَاقُ نَفْسِي إِلَيْكَ يَا اللهُ" (المزامير 42 : 1)',
  '"تَشْتَاقُ بَلْ تَتُوقُ نَفْسِي إِلَى دِيَارِ الرَّبِّ" (المزامير 84 : 2)',
  '"حَبِيبِي لِي وَأَنَا لَهُ" (نشيد الانشاد 2 : 16)',
  '"ذُوقُوا وَانْظُرُوا مَا أَطْيَبَ الرَّبَّ" (المزامير 34 : 8)',
  '"عَطِشَتْ نَفْسِي إِلَى اللهِ، إِلَى الإِلهِ الْحَيِّ" (المزامير 42 : 2)',
  '"يَا اللهُ، إِلهِي أَنْتَ. إِلَيْكَ أُبَكِّرُ. عَطِشَتْ إِلَيْكَ نَفْسِي" (المزامير 63 : 1)',
  '"فَغَرْتُ فَمِي وَلَهَثْتُ، لأَنِّي إِلَى وَصَايَاكَ اشْتَقْتُ" (المزامير 119 : 131)',
  '"إِنْ أَحَبَّنِي أَحَدٌ يَحْفَظْ كَلاَمِي" (يوحنا 14 : 23)',
  '"تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ وَأَنَا أُرِيحُكُمْ" (متى 11 : 28)',
  '"فِي حُضُورِكَ سُرُورٌ مُمتَلِئٌ" (المزامير 16 : 11)',
  '"وَكَانَ الرَّبُّ يُكَلِّمُ مُوسَى وَجْهًا لِوَجْهٍ كَمَا يُكَلِّمُ الرَّجُلُ صَاحِبَهُ" (خروج 33 : 11)',
  '"ادْخُلْ إِلَى مِخْدَعِكَ وَأَغْلِقْ بَابَكَ وَصَلِّ إِلَى أَبِيكَ الَّذِي فِي الْخَفَاءِ" (متى 6 : 6)',
  '"وَفِي الصُّبْحِ بَاكِرًا جِدًّا قَامَ وَخَرَجَ وَمَضَى إِلَى مَوْضِعٍ خَلَاءٍ وَكَانَ يُصَلِّي هُنَاكَ" (مرقس 1 : 35)',
  '"أَمَّا هُوَ فَكَانَ يَعْتَزِلُ فِي الْبَرَارِي وَيُصَلِّي" (لوقا 5 : 16)',
  '"بِالرُّجُوعِ وَالسُّكُونِ تَخْلُصُونَ" (إشعياء 30 : 15)',
  '"اثْبُتُوا فِيَّ وَأَنَا فِيكُمْ" (يوحنا 15 : 4)',
  '"اقْتَرِبُوا إِلَى اللهِ فَيَقْتَرِبَ إِلَيْكُمْ" (رسالة يعقوب 4 : 8)',
  '"طُوبَى لِلرَّجُلِ الَّذِي يَتَّكِلُ عَلَى الرَّبِّ" (إرميا 17 : 7)',
  '"ابْحَثُوا عَنِ الرَّبِّ فِي حِينِ يُوجَدُ" (إشعياء 55 : 6)',
  '"انْتَظِرِ الرَّبَّ. لِيَتَشَدَّدْ وَلْيَتَشَجَّعْ قَلْبُكَ" (المزامير 27 : 14)',
  '"اسْكُتُوا وَاعْلَمُوا أَنِّي أَنَا اللهُ" (المزامير 46  :  10)',
  '"أَمَّا مُنْتَظِرُو الرَّبِّ فَيُجَدِّدُونَ قُوَّةً" (إشعياء 40 : 31)',
  '"يَا رَبُّ، أَنْتَ مَلْجَإِي وَرَجَائِي إِلهِي" (المزامير 71 : 5)',
  '"أَحْبَبْتُكَ يَا رَبُّ يَا قُوَّتِي" (المزامير 18 : 1)',
  '"أُرِيدُ أَنْ أَسْكُنَ فِي بَيْتِ الرَّبِّ كُلَّ أَيَّامِ حَيَاتِي" (المزامير 27 : 4)',
  '"يَوْمٌ وَاحِدٌ فِي دِيَارِكَ خَيْرٌ مِنْ أَلْفٍ" (المزامير 84 : 10)',
  '"أَمَّا أَنَا فَالْقُرْبُ مِنَ اللهِ خَيْرٌ لِي" (المزامير 73 : 28)',
  '"اِلْتَصَقْتُ بِكَ يَا رَبُّ" (المزامير 63 : 8)',
  '"أَسْتَرِيحُ فِي ظِلِّ جَنَاحَيْكَ" (المزامير 17 : 8)',
  '"أَنَا مَعَكُمْ كُلَّ الأَيَّامِ إِلَى انْقِضَاءِ الدَّهْرِ" (متى 28 : 20)',
  '"مَنْ يَثْبُتْ فِيَّ وَأَنَا فِيهِ يَأْتِي بِثَمَرٍ كَثِيرٍ" (يوحنا 15 : 5)',
  '"يَا رَبُّ، أَنْتَ أَبِي. أَنْتَ صَخْرَتِي" (المزامير 89 : 26)'
];

  // 👈 حلقة تكرارية لجدولة الـ 30 يوم القادمة
  for (let i = 0; i < DAYS_TO_SCHEDULE; i++) {
    const trigger = buildPrimaryTriggerDate(hours, minutes, i, options);
    const timestampTrigger = buildTimestampTrigger(trigger.getTime());
    
    // 👈 اختيار الآية (تتكرر القائمة إذا انتهت)
    const dailyVerse = verses[i % verses.length];
    const expandedVerseText = dailyVerse; // أو النص التفصيلي من الترجمة

    await notifee.createTriggerNotification(
      {
        id :  `${NOTIFICATION_ID}_${i}`, // 👈 ID مختلف لكل يوم
        title :  strings.title,
        body :  dailyVerse, // 👈 الآية في الإشعار من بره
        data :  {
          kind :  'devotion_reminder',
          target :  'DevotionModal',
        },
        ios :  {
          sound :  'default',
          foregroundPresentationOptions :  {
            alert :  true,
            banner :  true,
            list :  true,
            sound :  true,
            badge :  true,
          },
        },
        android :  {
          channelId :  CHANNEL_ID,
          smallIcon :  'ic_notification',
          color :  '#C9A84C',
          pressAction :  {
            id :  DEVOTION_PRESS_ACTION_ID,
            launchActivity :  'default',
          },
          visibility :  AndroidVisibility.PUBLIC,
          category :  AndroidCategory.REMINDER,
          vibrationPattern :  [100, 300, 200, 300],
          style :  {
            type :  AndroidStyle.BIGTEXT,
            text :  expandedVerseText, // 👈 الآية تظهر عند السحب للأسفل
            title :  strings.title,
            summary :  strings.summary,
          },
        },
      },
      timestampTrigger,
    );

    if (options?.includeFollowUp !== false) {
      const followUpTrigger = buildFollowUpTriggerDate(trigger, hours, minutes);
      if (followUpTrigger) {
        const followUpTimestampTrigger = buildTimestampTrigger(followUpTrigger.getTime());

        await notifee.createTriggerNotification(
          {
            id :  `${FOLLOW_UP_NOTIFICATION_ID}_${i}`, // 👈 ID للمتابعة
            title :  strings.title, // أو strings.followUpTitle لو عندك
            body :  dailyVerse,
            data :  { /* ... */ },
            ios :  { /* ... */ },
            android :  { /* ... */ }, // نفس إعدادات الأندرويد اللي فوق
          },
          followUpTimestampTrigger,
        );
      }
    }
  }
}

/** Cancel the daily devotion reminder (e.g., when user removes their time). */
export async function cancelDevotionReminder() :  Promise<void> {
  await clearDevotionNotifications();
}
