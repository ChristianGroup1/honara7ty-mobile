declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'react-native-config' {
  interface NativeConfig {
    SMARTLOOK_PROJECT_KEY?: string;
    SMARTLOOK_API_TOKEN?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
