import Config from 'react-native-config';

const projectKey = Config.SMARTLOOK_PROJECT_KEY?.trim() ?? '';
const enabled = Boolean(projectKey);

if (!enabled) {
  console.warn(
    '[Analytics] Disabled: missing SMARTLOOK_PROJECT_KEY from react-native-config.',
  );
}

export const analyticsConfig = {
  enabled,
  projectKey,
};
