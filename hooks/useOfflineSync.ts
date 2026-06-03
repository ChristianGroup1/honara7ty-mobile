import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineQueue } from '../lib/offlineSync';

function flushQueueSafely() {
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
      if (flushTimeout) clearTimeout(flushTimeout);
      flushTimeout = setTimeout(() => {
        flushQueueSafely();
      }, 2000);
    };

    NetInfo.fetch()
      .then(state => {
        if (state.isConnected && state.isInternetReachable !== false) {
          debouncedFlush();
        }
      })
      .catch(error => {
        if (__DEV__) {
          console.warn('[offline-sync] failed to read network state', error);
        }
      });

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        debouncedFlush();
      }
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          flushQueueSafely();
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
