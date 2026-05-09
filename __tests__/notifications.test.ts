import notifee, { AuthorizationStatus } from '@notifee/react-native';
import {
  cancelDevotionReminder,
  clearDevotionNotifications,
  scheduleDailyDevotionReminder,
} from '../lib/notifications';

const devotionNotificationIds = [
  'daily_devotion',
  'daily_devotion_follow_up',
];

describe('notifications', () => {
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
  });

  it('schedules both the primary and follow-up devotion reminders', async () => {
    await scheduleDailyDevotionReminder(7, 0);

    expect(notifee.cancelDisplayedNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelNotification).toHaveBeenNthCalledWith(
      1,
      'daily_devotion',
    );
    expect(notifee.cancelNotification).toHaveBeenNthCalledWith(
      2,
      'daily_devotion_follow_up',
    );
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(2);

    const primaryTrigger = (notifee.createTriggerNotification as jest.Mock).mock
      .calls[0][1];
    const followUpTrigger = (notifee.createTriggerNotification as jest.Mock).mock
      .calls[1][1];

    expect(primaryTrigger.timestamp).toBeLessThan(followUpTrigger.timestamp);
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
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(2);
  });

  it('clears displayed and scheduled devotion reminders', async () => {
    await clearDevotionNotifications();

    expect(notifee.cancelDisplayedNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(
      devotionNotificationIds,
    );
    expect(notifee.cancelNotification).toHaveBeenNthCalledWith(
      1,
      'daily_devotion',
    );
    expect(notifee.cancelNotification).toHaveBeenNthCalledWith(
      2,
      'daily_devotion_follow_up',
    );
  });

  it('cancels both devotion reminders through the public cancel helper', async () => {
    await cancelDevotionReminder();

    expect(notifee.cancelNotification).toHaveBeenNthCalledWith(
      1,
      'daily_devotion',
    );
    expect(notifee.cancelNotification).toHaveBeenNthCalledWith(
      2,
      'daily_devotion_follow_up',
    );
  });
});
