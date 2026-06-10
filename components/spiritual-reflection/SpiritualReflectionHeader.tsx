import React from 'react';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

interface SpiritualReflectionHeaderProps {
  topInsetHeight: number;
  onBack: () => void;
  onAdd: () => void;
}

const SpiritualReflectionHeader = ({
  topInsetHeight,
  onBack,
  onAdd,
}: SpiritualReflectionHeaderProps) => {
  const strings = getStrings().spiritualReflection;
  return (
    <AppHeader
      topInsetHeight={topInsetHeight}
      eyebrow={strings.headerEyebrow}
      title={strings.title}
      leading={<AppHeaderAction icon="arrow-right" onPress={onBack} />}
      trailing={
        <AppHeaderAction
          icon="plus"
          onPress={onAdd}
          backgroundColor="rgba(18,30,52,0.16)"
        />
      }
    />
  );
};

export default SpiritualReflectionHeader;
