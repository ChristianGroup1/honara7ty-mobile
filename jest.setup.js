/* eslint-env jest */

// Polyfill crypto.getRandomValues for Jest (react-native-get-random-values
// relies on native modules that are unavailable in the Jest environment).
jest.mock('react-native-get-random-values', () => {
  if (typeof global.crypto === 'undefined') {
    global.crypto = {};
  }
  if (typeof global.crypto.getRandomValues === 'undefined') {
    global.crypto.getRandomValues = function (array) {
      if (array == null) {
        return array;
      }
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-gesture-handler', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signInSilently: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    }),
  },
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
    SENTRY_ENVIRONMENT: 'test',
  },
}));

jest.mock('@sentry/react-native', () => {
  const integration = {
    registerNavigationContainer: jest.fn(),
  };

  return {
    __esModule: true,
    addBreadcrumb: jest.fn(),
    init: jest.fn(),
    mobileReplayIntegration: jest.fn(() => ({ name: 'MobileReplay' })),
    setTag: jest.fn(),
    setUser: jest.fn(),
    wrap: jest.fn(component => component),
    reactNavigationIntegration: jest.fn(() => integration),
  };
});

jest.mock('@microsoft/react-native-clarity', () => ({
  __esModule: true,
  LogLevel: {
    None: 'None',
    Verbose: 'Verbose',
  },
  initialize: jest.fn(),
  setCustomUserId: jest.fn().mockResolvedValue(true),
  setCurrentScreenName: jest.fn().mockResolvedValue(true),
  setOnSessionStartedCallback: jest.fn(() => true),
  startNewSession: jest.fn(callback => callback?.('clarity-session-id')),
}));

jest.mock('@notifee/react-native', () => {
  const notifee = {
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(() => jest.fn()),
    createChannel: jest.fn(),
    createTriggerNotification: jest.fn(),
    cancelTriggerNotifications: jest.fn(),
    cancelTriggerNotification: jest.fn(),
    requestPermission: jest.fn(),
    getNotificationSettings: jest.fn(),
  };

  return {
    __esModule: true,
    default: notifee,
    EventType: {
      PRESS: 'PRESS',
      DISMISSED: 'DISMISSED',
    },
    AlarmType: {
      SET_EXACT_AND_ALLOW_WHILE_IDLE: 'SET_EXACT_AND_ALLOW_WHILE_IDLE',
    },
    AndroidCategory: {
      REMINDER: 'REMINDER',
    },
    AndroidImportance: {
      HIGH: 'HIGH',
    },
    AndroidStyle: {
      BIGTEXT: 'BIGTEXT',
    },
    AndroidVisibility: {
      PUBLIC: 'PUBLIC',
    },
    TriggerType: {
      TIMESTAMP: 'TIMESTAMP',
    },
    RepeatFrequency: {
      DAILY: 'DAILY',
    },
    TimestampTriggerAlarmManagerType: {
      SET_EXACT_AND_ALLOW_WHILE_IDLE: 'SET_EXACT_AND_ALLOW_WHILE_IDLE',
    },
    AuthorizationStatus: {
      AUTHORIZED: 1,
      DENIED: 0,
    },
  };
});
