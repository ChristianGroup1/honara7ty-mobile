import AsyncStorage from '@react-native-async-storage/async-storage';
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

function getPosthogClient() {
  if (!isAnalyticsEnabled || analyticsInitFailed) {
    return null;
  }

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

  client
    .screen(screenName, normalizeProperties(properties))
    .catch(() => undefined);
}

export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  client.capture(eventName, normalizeProperties(properties));
}

export function identifyUser(
  userId: string,
  properties?: AnalyticsProperties,
) {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  client.identify(userId, normalizeProperties(properties));
}

export function resetAnalytics() {
  const client = getPosthogClient();
  if (!client) {
    return;
  }

  client.reset();
}
