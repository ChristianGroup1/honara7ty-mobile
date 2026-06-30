/**
 * @format
 */

import { AppRegistry, I18nManager } from 'react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';

enableScreens(true);
// Avoid freezing inactive screens under Fabric. On Android this can race with
// native mounting and crash with "Unable to find viewState for tag".
enableFreeze(false);

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Required by notifee: handle notification events when the app is in the
// background or has been killed. Without this registration, trigger
// notifications (scheduled alarms) will not fire properly.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) {
    return;
  }

  // Background notification taps are handled after the app returns to the
  // foreground. Keep this handler intentionally minimal; Android can report
  // long-running background JS work as a Background ANR.
  if (__DEV__) {
    console.log('[notifee] background press', detail?.notification?.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
