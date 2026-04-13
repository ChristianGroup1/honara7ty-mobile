import Config from 'react-native-config';

const apiKey = Config.POSTHOG_PROJECT_TOKEN?.trim() ?? '';
const host = Config.POSTHOG_HOST?.trim() ?? '';
const enabled = Boolean(apiKey && host);

if (!enabled) {
  console.warn(
    '[Analytics] Disabled: missing POSTHOG_PROJECT_TOKEN or POSTHOG_HOST from react-native-config.',
  );
}

export const analyticsConfig = {
  enabled,
  apiKey,
  host,
};
