import NetInfo from '@react-native-community/netinfo';
import {
  clearNetworkAvailabilityCache,
  isNetworkAvailable,
} from '../lib/networkStatus';

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

beforeEach(() => {
  jest.useRealTimers();
  clearNetworkAvailabilityCache();
  mockedNetInfo.fetch.mockResolvedValue({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: null,
  } as any);
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
});

test('network is available when NetInfo and health check are responsive', async () => {
  await expect(isNetworkAvailable()).resolves.toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('network is unavailable when NetInfo says there is no usable internet', async () => {
  mockedNetInfo.fetch.mockResolvedValue({
    type: 'none',
    isConnected: false,
    isInternetReachable: false,
    details: null,
  } as any);

  await expect(isNetworkAvailable()).resolves.toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('slow network is treated as offline', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(
    (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      }),
  ) as unknown as typeof fetch;

  const resultPromise = isNetworkAvailable();
  await jest.advanceTimersByTimeAsync(1500);

  await expect(resultPromise).resolves.toBe(false);
});
