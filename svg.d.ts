declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'react-native-config' {
  interface NativeConfig {
    POSTHOG_PROJECT_TOKEN?: string;
    POSTHOG_HOST?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
