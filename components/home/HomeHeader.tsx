import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { homeStyles as styles } from './styles';
import { getStrings } from '../../localization';

interface HomeHeaderProps {
  topInsetHeight: number;
  initials: string;
  onLogout: () => void;
}

const HomeHeader = ({
  topInsetHeight,
  initials,
  onLogout,
}: HomeHeaderProps) => {
  const strings = getStrings().home;

  return (
    <>
      <View style={[styles.topInset, { height: topInsetHeight }]} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <MaterialCommunityIcons
            name="logout"
            size={20}
            color="rgba(255,255,255,0.7)"
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>{strings.headerGreeting}</Text>
          <Text style={styles.subGreeting}>{strings.headerSubGreeting}</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>
    </>
  );
};

export default HomeHeader;
