import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

function isTrackingAuthorized(status: string) {
  return status === RESULTS.GRANTED;
}

export async function resolveTrackingConsent() {
  const platformOs = (() => {
    try {
      return require('react-native')?.Platform?.OS;
    } catch {
      return undefined;
    }
  })();

  if (platformOs !== 'ios') {
    return true;
  }

  try {
    const currentStatus = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);

    if (isTrackingAuthorized(currentStatus)) {
      return true;
    }

    if (currentStatus === RESULTS.DENIED) {
      const requestedStatus = await request(
        PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY,
      );
      return isTrackingAuthorized(requestedStatus);
    }

    return false;
  } catch {
    return false;
  }
}
