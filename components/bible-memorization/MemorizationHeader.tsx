import React from 'react';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import { useNightMode } from '../../lib/nightMode';

interface MemorizationHeaderProps {
  title: string;
  onBack: () => void;
  trailing?: React.ReactNode;
}

const MemorizationHeader = ({ title, onBack, trailing }: MemorizationHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
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
