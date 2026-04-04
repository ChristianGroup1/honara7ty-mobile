import React from 'react';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

interface PrayerNotesHeaderProps {
  topInsetHeight: number;
  onBack: () => void;
}

const PrayerNotesHeader = ({
  topInsetHeight,
  onBack,
}: PrayerNotesHeaderProps) => {
  const strings = getStrings().prayerNotes;
  return (
    <AppHeader
      topInsetHeight={topInsetHeight}
      title={strings.title}
      leading={<AppHeaderAction icon="arrow-left" onPress={onBack} />}
    />
  );
};

export default PrayerNotesHeader;
