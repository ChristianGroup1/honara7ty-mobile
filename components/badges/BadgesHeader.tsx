import React from 'react';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

interface BadgesHeaderProps {
  topInsetHeight: number;
  onBack: () => void;
}

const BadgesHeader = ({ topInsetHeight, onBack }: BadgesHeaderProps) => {
  const strings = getStrings().badges;
  return (
    <AppHeader
      topInsetHeight={topInsetHeight}
      title={strings.header.title}
      leading={<AppHeaderAction icon="arrow-right" onPress={onBack} size={24} />}
    />
  );
};

export default React.memo(BadgesHeader);
