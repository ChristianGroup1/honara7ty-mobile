import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import PostHog from 'posthog-react-native';
import { analyticsConfig } from './analyticsConfig';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;
type PostHogSafeProperties = Record<string, string | number | boolean | null>;

function normalizeProperties(
  properties?: AnalyticsProperties,
): PostHogSafeProperties | undefined {
  if (!properties) {
    return undefined;
  }

  const normalized: PostHogSafeProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
}

const isAnalyticsEnabled =
  analyticsConfig.enabled && analyticsConfig.apiKey.trim().length > 0;

let posthogClient: PostHog | null = null;
let analyticsInitFailed = false;
let analyticsNetworkMonitorStarted = false;
let analyticsConsolePatched = false;
let analyticsIsOnline = true;
let originalConsoleError: typeof console.error | null = null;

function safeCall(maybePromise: unknown) {
  if (
    maybePromise &&
    typeof maybePromise === 'object' &&
    'catch' in maybePromise &&
    typeof (maybePromise as Promise<unknown>).catch === 'function'
  ) {
    (maybePromise as Promise<unknown>).catch(() => undefined);
  }
}

function patchConsoleForOfflinePostHog() {
  if (analyticsConsolePatched) {
    return;
  }

  analyticsConsolePatched = true;
  originalConsoleError = console.error;

  console.error = (...args: unknown[]) => {
    const [firstArg] = args;
    const message =
      typeof firstArg === 'string'
        ? firstArg
        : firstArg instanceof Error
        ? firstArg.message
        : '';

    if (
      !analyticsIsOnline &&
      typeof message === 'string' &&
      message.startsWith('Error while flushing PostHog')
    ) {
      return;
    }

    originalConsoleError?.(...args);
  };
}

function applyAnalyticsConnectivityState(isOnline: boolean) {
  analyticsIsOnline = isOnline;

  if (!posthogClient) {
    return;
  }

  if (isOnline) {
    safeCall(posthogClient.flush());
    return;
  }
}

function ensureAnalyticsNetworkMonitor() {
  if (analyticsNetworkMonitorStarted || !isAnalyticsEnabled) {
    return;
  }

  analyticsNetworkMonitorStarted = true;
  patchConsoleForOfflinePostHog();

  safeCall(
    NetInfo.fetch().then(state => {
      applyAnalyticsConnectivityState(
        Boolean(state.isConnected && state.isInternetReachable !== false),
      );
    }),
  );

  NetInfo.addEventListener(state => {
    applyAnalyticsConnectivityState(
      Boolean(state.isConnected && state.isInternetReachable !== false),
    );
  });
}

function getPosthogClient() {
  if (!isAnalyticsEnabled || analyticsInitFailed) {
    return null;
  }

  ensureAnalyticsNetworkMonitor();

  if (posthogClient) {
    return posthogClient;
  }

  try {
    posthogClient = new PostHog(analyticsConfig.apiKey, {
      host: analyticsConfig.host || undefined,
      customStorage: AsyncStorage,
      captureAppLifecycleEvents: true,
    });
    return posthogClient;
  } catch (error) {
    analyticsInitFailed = true;
    console.warn('Analytics initialization failed', error);
    return null;
  }
}

export function analyticsEnabled() {
  return isAnalyticsEnabled && !analyticsInitFailed;
}

export function trackScreen(screenName: string, properties?: AnalyticsProperties) {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  safeCall(client.screen(screenName, normalizeProperties(properties)));
}

export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  safeCall(client.capture(eventName, normalizeProperties(properties)));
}

export function identifyUser(
  userId: string,
  properties?: AnalyticsProperties,
) {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  safeCall(client.identify(userId, normalizeProperties(properties)));
}

export function resetAnalytics() {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  safeCall(client.reset());
}
