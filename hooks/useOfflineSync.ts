import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { flushOfflineQueue } from '../lib/offlineSync';

export function useOfflineSync() {
  const netInfo = useNetInfo();
  const isOffline = !(
    netInfo.isConnected &&
    netInfo.isInternetReachable !== false
  );

  useEffect(() => {
    if (!isOffline) {
      void flushOfflineQueue();
    }
  }, [isOffline]);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void flushOfflineQueue();
      }
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          void flushOfflineQueue();
        }
      },
    );

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, []);

  return { isOffline };
}
