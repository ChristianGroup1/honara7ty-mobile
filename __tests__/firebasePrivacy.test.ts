describe('Firebase privacy configuration', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('enables analytics while denying all advertising consent', () => {
    const setAnalyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined);
    const setConsent = jest.fn().mockResolvedValue(undefined);
    const analytics = require('@react-native-firebase/analytics').default as jest.Mock;

    analytics.mockReturnValue({
      setAnalyticsCollectionEnabled,
      setConsent,
      setUserId: jest.fn().mockResolvedValue(undefined),
      logScreenView: jest.fn().mockResolvedValue(undefined),
      logEvent: jest.fn().mockResolvedValue(undefined),
    });

    const { initializeFirebase } = require('../lib/firebase');
    initializeFirebase();

    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(true);
    expect(setConsent).toHaveBeenCalledWith({
      analytics_storage: true,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    });
  });
});
