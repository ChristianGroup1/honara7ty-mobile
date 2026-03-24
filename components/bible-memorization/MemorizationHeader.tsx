import React from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { memorizationStyles as styles } from './styles';
import { NAVY } from './utils';

interface MemorizationHeaderProps {
  title: string;
  onBack: () => void;
}

const MemorizationHeader = ({ title, onBack }: MemorizationHeaderProps) => {
  const insets = useSafeAreaInsets();
  const topInsetStyle = { height: insets.top, backgroundColor: NAVY };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={topInsetStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
    </>
  );
};

export default MemorizationHeader;
