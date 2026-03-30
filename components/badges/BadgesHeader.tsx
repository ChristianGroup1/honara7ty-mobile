import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { badgesStyles as styles } from './styles';
import { getStrings } from '../../localization';

interface BadgesHeaderProps {
  topInsetHeight: number;
  onBack: () => void;
}

const BadgesHeader = ({ topInsetHeight, onBack }: BadgesHeaderProps) => {
  const strings = getStrings().badges;
  return (
    <>
      <View style={[styles.topInset, { height: topInsetHeight }]} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{strings.header.title}</Text>
      </View>
    </>
  );
};

export default BadgesHeader;
