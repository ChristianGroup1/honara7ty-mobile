import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Smartlook from 'react-native-smartlook-analytics';
import {
  __resetAnalyticsStateForTests,
  flushAnalyticsQueue,
  trackEvent,
  trackScreen,
} from '../lib/analytics';

const flushPromises = () =>
  new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });

describe('analytics offline queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAnalyticsStateForTests();
    return AsyncStorage.clear();
  });

  it('tracks a Smartlook navigation event and screen_viewed event for screens', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    trackScreen('Home', { route_path: 'Home' });
    await flushPromises();

    expect(
      Smartlook.instance.analytics.trackNavigationEnter,
    ).toHaveBeenCalledWith('Home', expect.any(Object));
    expect(Smartlook.instance.analytics.trackEvent).toHaveBeenCalledWith(
      'screen_viewed',
      expect.any(Object),
    );
  });

  it('stores events while offline and flushes them when online', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    trackEvent('devotion_logged', { answer: 'yes' });
    await flushPromises();

    expect(Smartlook.instance.analytics.trackEvent).not.toHaveBeenCalled();

    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    await flushAnalyticsQueue();

    expect(Smartlook.instance.analytics.trackEvent).toHaveBeenCalledWith(
      'devotion_logged',
      expect.any(Object),
    );
  });
});
