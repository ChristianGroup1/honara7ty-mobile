import * as Sentry from '@sentry/react-native';

const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

let isSentryInitialized = false;

export function initializeSentry() {
  const dsn = 'https://7048b94c71a6d883a2cfd0aff6c6ac75@o4511268451254272.ingest.de.sentry.io/4511268453875792';

  if (isSentryInitialized || !dsn) {
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: 'production',
    integrations: [
      sentryNavigationIntegration,
      Sentry.mobileReplayIntegration(),
    ],
    replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });

  isSentryInitialized = true;
}

export function registerSentryNavigationContainer(
  navigationContainerRef: unknown,
) {
  if (!isSentryInitialized) {
    return;
  }

  sentryNavigationIntegration.registerNavigationContainer(
    navigationContainerRef,
  );
}

export function setSentryUser(user: {
  id: string;
  email?: string | null;
  username?: string | null;
}) {
  if (!isSentryInitialized) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    username: user.username ?? undefined,
  });
}

export function clearSentryUser() {
  if (!isSentryInitialized) {
    return;
  }

  Sentry.setUser(null);
}

export function trackSentryScreen(screenName: string) {
  if (!isSentryInitialized) {
    return;
  }

  Sentry.addBreadcrumb({
    category: 'navigation',
    type: 'navigation',
    level: 'info',
    message: `Viewed ${screenName}`,
    data: {
      screen: screenName,
    },
  });
  Sentry.setTag('current_screen', screenName);
}

export { Sentry };
