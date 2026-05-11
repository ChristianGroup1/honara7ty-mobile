import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineQueue } from '../lib/offlineSync';
import supabase from '../lib/supbase';

export function useOfflineSync() {
  useEffect(() => {
    let flushTimeout: ReturnType<typeof setTimeout> | undefined;
    const debouncedFlush = () => {
      if (flushTimeout) clearTimeout(flushTimeout);
      flushTimeout = setTimeout(() => {
        void flushOfflineQueue();
      }, 2000);
    };

    void NetInfo.fetch().then(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        debouncedFlush();
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
          void supabase.auth.getSession();
          void flushOfflineQueue();
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
