import * as Sentry from '@sentry/react-native';

const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

let isSentryInitialized = false;

type SentryHint = {
  originalException?: unknown;
};

function isExpectedAbortError(event: Sentry.Event, hint?: SentryHint) {
  const originalException = hint?.originalException;
  const exceptionName =
    typeof originalException === 'object' && originalException !== null
      ? (originalException as { name?: string }).name
      : undefined;
  const exceptionMessage =
    typeof originalException === 'object' && originalException !== null
      ? (originalException as { message?: string }).message
      : typeof originalException === 'string'
        ? originalException
        : undefined;
  const eventException = event.exception?.values?.[0];
  const eventMessage =
    event.message ?? eventException?.value ?? eventException?.type ?? '';
  const combinedMessage = [
    exceptionName,
    exceptionMessage,
    eventException?.type,
    eventException?.value,
    eventMessage,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    combinedMessage === 'abort' ||
    combinedMessage.includes('aborterror') ||
    combinedMessage.includes('aborted') ||
    combinedMessage.includes('the operation was aborted') ||
    combinedMessage.includes('request aborted')
  );
}

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
    beforeSend(event, hint) {
      if (isExpectedAbortError(event, hint)) {
        return null;
      }

      return event;
    },
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
