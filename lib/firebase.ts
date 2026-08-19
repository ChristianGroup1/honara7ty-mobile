import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';

let isFirebaseInitialized = false;

type GlobalErrorHandler = (
  error: Error,
  isFatal?: boolean,
) => void;

type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

export function initializeFirebase(options?: { trackingAuthorized?: boolean }) {
  if (isFirebaseInitialized) {
    return;
  }

  isFirebaseInitialized = true;
  const trackingAuthorized = options?.trackingAuthorized ?? true;

  void analytics()
    .setAnalyticsCollectionEnabled(trackingAuthorized)
    .catch(error => {
      if (__DEV__) {
        console.warn(
          `Failed to ${
            trackingAuthorized ? 'enable' : 'disable'
          } Firebase Analytics`,
          error,
        );
      }
    });

  void analytics()
    .setConsent({
      analytics_storage: trackingAuthorized,
      ad_storage: trackingAuthorized,
      ad_user_data: trackingAuthorized,
      ad_personalization: trackingAuthorized,
    })
    .catch(error => {
      if (__DEV__) {
        console.warn('Failed to set Firebase Analytics consent', error);
      }
    });

  void crashlytics().setCrashlyticsCollectionEnabled(true).catch(error => {
    if (__DEV__) {
      console.warn('Failed to enable Firebase Crashlytics', error);
    }
  });

  void perf().setPerformanceCollectionEnabled(true).catch(error => {
    if (__DEV__) {
      console.warn('Failed to enable Firebase Performance', error);
    }
  });
}

export function registerFirebaseGlobalErrorHandler() {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike })
    .ErrorUtils;
  const defaultHandler = errorUtils?.getGlobalHandler?.();

  if (!errorUtils?.setGlobalHandler || !defaultHandler) {
    return;
  }

  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    try {
      crashlytics().recordError(error, isFatal ? 'fatal_js_error' : 'js_error');
    } catch (recordError) {
      if (__DEV__) {
        console.warn('Failed to record Firebase JS error', recordError);
      }
    }

    defaultHandler(error, isFatal);
  });
}

export function setFirebaseUser(user: { id: string; email?: string | null }) {
  void analytics().setUserId(user.id).catch(error => {
    if (__DEV__) {
      console.warn('Failed to set Firebase Analytics user', error);
    }
  });

  void crashlytics().setUserId(user.id).catch(error => {
    if (__DEV__) {
      console.warn('Failed to set Firebase Crashlytics user', error);
    }
  });

  if (user.email) {
    void crashlytics().setAttribute('email', user.email).catch(error => {
      if (__DEV__) {
        console.warn('Failed to set Firebase Crashlytics email', error);
      }
    });
  }
}

export function clearFirebaseUser() {
  void analytics().setUserId(null).catch(error => {
    if (__DEV__) {
      console.warn('Failed to clear Firebase Analytics user', error);
    }
  });

  void crashlytics().setUserId('').catch(error => {
    if (__DEV__) {
      console.warn('Failed to clear Firebase Crashlytics user', error);
    }
  });
}

export function trackFirebaseScreen(screenName: string) {
  void analytics()
    .logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    })
    .catch(error => {
      if (__DEV__) {
        console.warn('Failed to log Firebase screen view', error);
      }
    });

  try {
    crashlytics().log(`Viewed ${screenName}`);
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to log Firebase Crashlytics breadcrumb', error);
    }
  }
}

export function logFirebaseEvent(
  name: string,
  params?: Record<string, string | number | boolean | null>,
) {
  void analytics()
    .logEvent(name, params)
    .catch(error => {
      if (__DEV__) {
        console.warn(`Failed to log Firebase event ${name}`, error);
      }
    });
}

export function triggerFirebaseCrashlyticsTestCrash() {
  logFirebaseEvent('crashlytics_test_crash_requested');

  try {
    crashlytics().log('Crashlytics test crash requested from More screen');
    crashlytics().setAttribute('test_crash', 'true');
  } finally {
    crashlytics().crash();
  }
}

export async function traceFirebasePerformance<T>(
  traceName: string,
  operation: () => Promise<T>,
) {
  const trace = await perf().startTrace(traceName);

  try {
    const result = await operation();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    await trace.stop();
  }
}
