import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineQueue } from '../lib/offlineSync';

export function useOfflineSync() {
  useEffect(() => {
    void NetInfo.fetch().then(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void flushOfflineQueue();
      }
    });

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
}
