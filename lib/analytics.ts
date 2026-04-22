import Smartlook, { Properties } from 'react-native-smartlook-analytics';
import { analyticsConfig } from './analyticsConfig';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const isAnalyticsEnabled =
  analyticsConfig.enabled && analyticsConfig.projectKey.trim().length > 0;

let smartlookStarted = false;
let analyticsInitFailed = false;
let analyticsStartPromise: Promise<void> | null = null;

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

function toSmartlookProperties(properties?: AnalyticsProperties) {
  if (!properties) {
    return undefined;
  }

  const smartlookProperties = new Properties();
  let hasProperties = false;

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null) {
      continue;
    }

    smartlookProperties.putString(key, String(value));
    hasProperties = true;
  }

  return hasProperties ? smartlookProperties : undefined;
}

function ensureSmartlookStarted() {
  if (!isAnalyticsEnabled || analyticsInitFailed) {
    return false;
  }

  if (smartlookStarted) {
    return true;
  }

  if (!analyticsStartPromise) {
    analyticsStartPromise = (async () => {
      await Smartlook.instance.preferences.setProjectKey(
        analyticsConfig.projectKey,
      );
      await Smartlook.instance.preferences.setAdaptiveFrameRateEnabled(false);
      await Smartlook.instance.start();
      smartlookStarted = true;
    })().catch(error => {
      analyticsInitFailed = true;
      console.warn('Analytics initialization failed', error);
    });
  }

  safeCall(analyticsStartPromise);
  return true;
}

function runWithSmartlook(callback: () => Promise<void>) {
  if (!ensureSmartlookStarted()) {
    return;
  }

  safeCall((analyticsStartPromise ?? Promise.resolve()).then(callback));
}

export function analyticsEnabled() {
  return isAnalyticsEnabled && !analyticsInitFailed;
}

export function trackScreen(
  screenName: string,
  properties?: AnalyticsProperties,
) {
  runWithSmartlook(() =>
    Smartlook.instance.analytics.trackNavigationEnter(
      screenName,
      toSmartlookProperties(properties),
    ),
  );
}

export function trackEvent(
  eventName: string,
  properties?: AnalyticsProperties,
) {
  runWithSmartlook(() =>
    Smartlook.instance.analytics.trackEvent(
      eventName,
      toSmartlookProperties(properties),
    ),
  );
}

export function identifyUser(userId: string, properties?: AnalyticsProperties) {
  runWithSmartlook(async () => {
    await Smartlook.instance.user.setIdentifier(userId);

    const email = properties?.email;
    if (typeof email === 'string' && email.trim()) {
      await Smartlook.instance.user.setEmail(email);
    }

    const name = properties?.name;
    if (typeof name === 'string' && name.trim()) {
      await Smartlook.instance.user.setName(name);
    }

    for (const [key, value] of Object.entries(properties ?? {})) {
      if (
        value === undefined ||
        value === null ||
        key === 'email' ||
        key === 'name'
      ) {
        continue;
      }

      await Smartlook.instance.user.setUserProperty(key, String(value));
    }
  });
}

export function resetAnalytics() {
  if (!isAnalyticsEnabled || analyticsInitFailed) {
    return;
  }

  safeCall(
    Promise.resolve(Smartlook.instance.reset()).then(() => {
      smartlookStarted = false;
      analyticsStartPromise = null;
    }),
  );
}
