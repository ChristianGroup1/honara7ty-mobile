import React from 'react';
import { View } from 'react-native';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

import FocusModeToggle from '../shared/FocusModeToggle';

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FocusModeToggle color="#FFF" />
          <View style={{ width: 8 }} />
          <AppHeaderAction
            icon="plus"
            onPress={onAdd}
            backgroundColor="rgba(18,30,52,0.16)"
          />
        </View>
      }
    />
  );
};

export default PrayerNotesHeader;
