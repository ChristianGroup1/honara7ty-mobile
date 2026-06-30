import NetInfo from '@react-native-community/netinfo';

const HEALTH_CHECK_URL = 'https://pphbwecwwotrfqjyrsai.supabase.co/auth/v1/health';
const SLOW_NETWORK_TIMEOUT_MS = 1500;
const CACHE_TTL_MS = 2500;

let cachedAvailability:
  | {
      checkedAt: number;
      available: boolean;
    }
  | undefined;

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function isNetworkAvailable() {
  const now = Date.now();
  if (
    cachedAvailability &&
    now - cachedAvailability.checkedAt < CACHE_TTL_MS
  ) {
    return cachedAvailability.available;
  }

  const state = await NetInfo.fetch();
  const netInfoAvailable = Boolean(
    state.isConnected && state.isInternetReachable !== false,
  );

  if (!netInfoAvailable) {
    cachedAvailability = { checkedAt: now, available: false };
    return false;
  }

  const responsive = await fetchWithTimeout(
    HEALTH_CHECK_URL,
    SLOW_NETWORK_TIMEOUT_MS,
  );
  cachedAvailability = { checkedAt: Date.now(), available: responsive };
  return responsive;
}

export function clearNetworkAvailabilityCache() {
  cachedAvailability = undefined;
}
