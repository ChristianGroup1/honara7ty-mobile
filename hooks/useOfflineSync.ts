import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineQueue } from '../lib/offlineSync';
import {
  clearNetworkAvailabilityCache,
  isNetworkAvailable,
} from '../lib/networkStatus';

function flushQueueSafely() {
  if (AppState.currentState !== 'active') {
    return;
  }

  flushOfflineQueue().catch(error => {
    if (__DEV__) {
      console.warn('[offline-sync] failed to flush queue', error);
    }
  });
}

export function useOfflineSync() {
  useEffect(() => {
    let flushTimeout: ReturnType<typeof setTimeout> | undefined;
    const debouncedFlush = () => {
      if (AppState.currentState !== 'active') {
        return;
      }

      if (flushTimeout) clearTimeout(flushTimeout);
      flushTimeout = setTimeout(() => {
        flushQueueSafely();
      }, 2000);
    };

    NetInfo.fetch()
      .then(async () => {
        if (AppState.currentState !== 'active') {
          return;
        }

        if (await isNetworkAvailable()) {
          debouncedFlush();
        }
      })
      .catch(error => {
        if (__DEV__) {
          console.warn('[offline-sync] failed to read network state', error);
        }
      });

    const unsubscribeNetInfo = NetInfo.addEventListener(async () => {
      clearNetworkAvailabilityCache();
      if (AppState.currentState !== 'active') {
        return;
      }

      if (await isNetworkAvailable()) {
        debouncedFlush();
      }
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          flushQueueSafely();
        } else if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = undefined;
        }
      },
    );

    return () => {
      if (flushTimeout) clearTimeout(flushTimeout);
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, []);
}
