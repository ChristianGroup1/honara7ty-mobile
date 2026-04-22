import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Smartlook, { Properties } from 'react-native-smartlook-analytics';
import { analyticsConfig } from './analyticsConfig';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const isAnalyticsEnabled =
  analyticsConfig.enabled && analyticsConfig.projectKey.trim().length > 0;
const ANALYTICS_QUEUE_KEY = 'analytics_offline_queue_v1';
const MAX_QUEUED_ANALYTICS_ITEMS = 200;

let smartlookStarted = false;
let analyticsInitFailed = false;
let analyticsStartPromise: Promise<void> | null = null;
let networkListenerStarted = false;
let onlineStatus: boolean | null = null;
let flushInProgress = false;

type QueuedAnalyticsItem =
  | {
      id: string;
      type: 'screen';
      name: string;
      properties?: AnalyticsProperties;
      createdAt: number;
    }
  | {
      id: string;
      type: 'event';
      name: string;
      properties?: AnalyticsProperties;
      createdAt: number;
    };

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

function isOnlineState(state: NetInfoState) {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

function createQueuedItem(
  type: QueuedAnalyticsItem['type'],
  name: string,
  properties?: AnalyticsProperties,
): QueuedAnalyticsItem {
  return {
    id: `${Date.now()}:${Math.random().toString(36).slice(2)}`,
    type,
    name,
    properties,
    createdAt: Date.now(),
  };
}

async function readQueue(): Promise<QueuedAnalyticsItem[]> {
  const rawQueue = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);

  if (!rawQueue) {
    return [];
  }

  try {
    const parsedQueue = JSON.parse(rawQueue);
    return Array.isArray(parsedQueue) ? parsedQueue : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAnalyticsItem[]) {
  if (!queue.length) {
    await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    ANALYTICS_QUEUE_KEY,
    JSON.stringify(queue.slice(-MAX_QUEUED_ANALYTICS_ITEMS)),
  );
}

async function enqueueAnalyticsItem(item: QueuedAnalyticsItem) {
  if (!isAnalyticsEnabled || analyticsInitFailed) {
    return;
  }

  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
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
    return Promise.resolve(false);
  }

  return (analyticsStartPromise ?? Promise.resolve())
    .then(callback)
    .then(() => true)
    .catch(() => false);
}

async function sendAnalyticsItem(item: QueuedAnalyticsItem, replayed = false) {
  if (item.type === 'screen') {
    await Smartlook.instance.analytics.trackNavigationEnter(
      item.name,
      toSmartlookProperties(item.properties),
    );
    await Smartlook.instance.analytics.trackEvent(
      'screen_viewed',
      toSmartlookProperties({
        ...item.properties,
        screen_name: item.name,
        offline_queued: replayed,
        queued_at: item.createdAt,
      }),
    );
    return;
  }

  await Smartlook.instance.analytics.trackEvent(
    item.name,
    toSmartlookProperties({
      ...item.properties,
      offline_queued: replayed,
      queued_at: item.createdAt,
    }),
  );
}

async function sendOrQueue(item: QueuedAnalyticsItem) {
  if (!isAnalyticsEnabled || analyticsInitFailed) {
    return;
  }

  if (onlineStatus === null) {
    onlineStatus = isOnlineState(await NetInfo.fetch());
  }

  if (!onlineStatus) {
    await enqueueAnalyticsItem(item);
    return;
  }

  const sent = await runWithSmartlook(() => sendAnalyticsItem(item));

  if (!sent) {
    await enqueueAnalyticsItem(item);
  }
}

export async function flushAnalyticsQueue() {
  if (!isAnalyticsEnabled || analyticsInitFailed || flushInProgress) {
    return;
  }

  flushInProgress = true;

  try {
    onlineStatus = isOnlineState(await NetInfo.fetch());

    if (!onlineStatus) {
      return;
    }

    const queue = await readQueue();

    if (!queue.length) {
      return;
    }

    const remainingQueue: QueuedAnalyticsItem[] = [];

    for (const item of queue) {
      const sent = await runWithSmartlook(() => sendAnalyticsItem(item, true));

      if (!sent) {
        remainingQueue.push(item);
      }
    }

    await writeQueue(remainingQueue);
  } finally {
    flushInProgress = false;
  }
}

export function initializeAnalyticsNetworkListener() {
  if (!isAnalyticsEnabled || networkListenerStarted) {
    return () => undefined;
  }

  networkListenerStarted = true;

  safeCall(flushAnalyticsQueue());

  const unsubscribe = NetInfo.addEventListener(state => {
    onlineStatus = isOnlineState(state);

    if (onlineStatus) {
      safeCall(flushAnalyticsQueue());
    }
  });

  return () => {
    networkListenerStarted = false;
    unsubscribe();
  };
}

export function analyticsEnabled() {
  return isAnalyticsEnabled && !analyticsInitFailed;
}

export function trackScreen(
  screenName: string,
  properties?: AnalyticsProperties,
) {
  safeCall(
    sendOrQueue(
      createQueuedItem('screen', screenName, {
        ...properties,
        screen_name: screenName,
      }),
    ),
  );
}

export function trackEvent(
  eventName: string,
  properties?: AnalyticsProperties,
) {
  safeCall(sendOrQueue(createQueuedItem('event', eventName, properties)));
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
    AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY)
      .then(() => Smartlook.instance.reset())
      .then(() => {
        smartlookStarted = false;
        analyticsStartPromise = null;
      }),
  );
}

export function __resetAnalyticsStateForTests() {
  smartlookStarted = false;
  analyticsInitFailed = false;
  analyticsStartPromise = null;
  networkListenerStarted = false;
  onlineStatus = null;
  flushInProgress = false;
}
