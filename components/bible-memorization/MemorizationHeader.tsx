import React from 'react';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAVY } from './utils';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

interface MemorizationHeaderProps {
  title: string;
  onBack: () => void;
  trailing?: React.ReactNode;
}

const MemorizationHeader = ({ title, onBack, trailing }: MemorizationHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets.top}
        title={title}
        leading={<AppHeaderAction icon="arrow-right" onPress={onBack} size={24} />}
        trailing={trailing}
      />
    </>
  );
};

export default MemorizationHeader;
