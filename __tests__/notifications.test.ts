import notifee, { AuthorizationStatus } from '@notifee/react-native';
import {
  cancelDevotionReminder,
  scheduleDailyDevotionReminder,
} from '../lib/notifications';

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

    expect(notifee.cancelTriggerNotification).toHaveBeenNthCalledWith(
      1,
      'daily_devotion',
    );
    expect(notifee.cancelTriggerNotification).toHaveBeenNthCalledWith(
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
    expect(notifee.cancelTriggerNotification).not.toHaveBeenCalled();
  });

  it('cancels both scheduled devotion reminders', async () => {
    await cancelDevotionReminder();

    expect(notifee.cancelTriggerNotification).toHaveBeenNthCalledWith(
      1,
      'daily_devotion',
    );
    expect(notifee.cancelTriggerNotification).toHaveBeenNthCalledWith(
      2,
      'daily_devotion_follow_up',
    );
  });
});
