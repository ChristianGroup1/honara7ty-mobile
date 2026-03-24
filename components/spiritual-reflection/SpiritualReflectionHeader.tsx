import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spiritualReflectionStyles as styles } from './styles';

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
  return (
    <>
      <View style={[styles.topInset, { height: topInsetHeight }]} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.75}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          التأمل الروحي
        </Text>

        <TouchableOpacity onPress={onAdd} style={styles.addHeaderBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default SpiritualReflectionHeader;
