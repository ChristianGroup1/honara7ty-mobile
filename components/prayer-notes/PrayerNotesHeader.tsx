import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { prayerNotesStyles as styles } from './styles';
import { getStrings } from '../../localization';

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
    <>
      <View style={[styles.topInset, { height: topInsetHeight }]} />
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>
            {strings.title}
          </Text>
        </View>
        <TouchableOpacity onPress={onBack} style={styles.headerIcon}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default PrayerNotesHeader;
