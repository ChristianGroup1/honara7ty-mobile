/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';

// Required by notifee: handle notification events when the app is in the
// background or has been killed. Without this registration, trigger
// notifications (scheduled alarms) will not fire properly.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Currently no custom background actions are needed; the handler must be
  // registered so notifee can schedule and deliver trigger notifications.
  if (__DEV__) {
    console.log('[notifee] background event', type, detail?.notification?.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
