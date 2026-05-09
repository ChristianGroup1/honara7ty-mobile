/**
 * @format
 */

import { AppRegistry, I18nManager } from 'react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';

enableScreens(true);
enableFreeze(true);

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

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
