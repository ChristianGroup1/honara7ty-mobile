import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  cancelDevotionReminder,
  clearDevotionNotifications,
  DEVOTION_PRESS_ACTION_ID,
  DEVOTION_REMINDER_SCHEDULE_DAYS,
  scheduleDailyDevotionReminder,
} from '../lib/notifications';

const devotionNotificationIds = [
  ...Array.from({ length: 90 }).flatMap((_, dayOffset) => [
    `daily_devotion_${dayOffset}`,
    `daily_devotion_follow_up_${dayOffset}`,
  ]),
];

describe('notifications', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T06:00:00.000Z'));
    jest.clearAllMocks();
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it('schedules primary and follow-up devotion reminders with varying verses', async () => {
    await scheduleDailyDevotionReminder(7, 0);

    expect(notifee.cancelDisplayedNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(
      DEVOTION_REMINDER_SCHEDULE_DAYS * 2,
    );

    const primaryTrigger = (notifee.createTriggerNotification as jest.Mock).mock
      .calls[0][1];
    const followUpTrigger = (notifee.createTriggerNotification as jest.Mock)
      .mock.calls[1][1];
    const firstPayload = (notifee.createTriggerNotification as jest.Mock).mock
      .calls[0][0];
    const secondDayPayload = (notifee.createTriggerNotification as jest.Mock)
      .mock.calls[2][0];

    expect(primaryTrigger.timestamp).toBeLessThan(followUpTrigger.timestamp);
    expect(firstPayload.id).toBe('daily_devotion_0');
    expect(firstPayload.android.pressAction.id).toBe(DEVOTION_PRESS_ACTION_ID);
    expect(firstPayload.android.pressAction.launchActivity).toBe('default');
    expect(primaryTrigger.repeatFrequency).toBeUndefined();
    expect(firstPayload.body).not.toBe(secondDayPayload.body);
  });

  it('skips scheduling when notifications are not allowed', async () => {
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    });

    await scheduleDailyDevotionReminder(7, 0);

    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    expect(notifee.cancelDisplayedNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
  });

  it('caps Android timestamp triggers so real devices keep scheduling', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    await scheduleDailyDevotionReminder(7, 0);

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(50);
  });

  it('falls back on Android when exact alarm scheduling fails', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    (notifee.createTriggerNotification as jest.Mock)
      .mockRejectedValueOnce(new Error('exact alarm denied'))
      .mockResolvedValue(undefined);

    await scheduleDailyDevotionReminder(7, 0, { includeFollowUp: false });

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(
      DEVOTION_REMINDER_SCHEDULE_DAYS + 1,
    );
    const exactTrigger = (notifee.createTriggerNotification as jest.Mock).mock
      .calls[0][1];
    const fallbackTrigger = (notifee.createTriggerNotification as jest.Mock)
      .mock.calls[1][1];
    expect(exactTrigger.alarmManager).toBeTruthy();
    expect(fallbackTrigger.alarmManager).toBeUndefined();
  });

  it('requests permission before scheduling when iOS permission is not determined', async () => {
    (notifee.getNotificationSettings as jest.Mock)
      .mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
      })
      .mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      });
    (notifee.requestPermission as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });

    await scheduleDailyDevotionReminder(7, 0);

    expect(notifee.requestPermission).toHaveBeenCalledWith({
      alert: true,
      badge: true,
      sound: true,
    });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(
      DEVOTION_REMINDER_SCHEDULE_DAYS * 2,
    );
  });

  it('clears displayed and scheduled devotion reminders', async () => {
    await clearDevotionNotifications();

    expect(notifee.cancelDisplayedNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelNotification).not.toHaveBeenCalled();
  });

  it('cancels devotion reminders through the public cancel helper', async () => {
    await cancelDevotionReminder();

    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
  });
});
