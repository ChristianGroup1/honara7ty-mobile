import React from 'react';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

interface PrayerNotesHeaderProps {
  topInsetHeight: number;
  onBack: () => void;
  onAdd: () => void;
}

const PrayerNotesHeader = ({
  topInsetHeight,
  onBack,
  onAdd,
}: PrayerNotesHeaderProps) => {
  const strings = getStrings().prayerNotes;
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
          backgroundColor="rgba(201,168,76,0.16)"
        />
      }
    />
  );
};

export default PrayerNotesHeader;
