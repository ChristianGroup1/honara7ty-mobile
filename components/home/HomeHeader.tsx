import React from 'react';
import { Text, View } from 'react-native';
import { homeStyles as styles } from './styles';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

interface HomeHeaderProps {
  topInsetHeight: number;
  displayName: string;
  initials: string;
  onLogout: () => void;
}

const HomeHeader = ({
  topInsetHeight,
  displayName,
  initials,
  onLogout,
}: HomeHeaderProps) => {
  const strings = getStrings().home;

  return (
    <AppHeader
      topInsetHeight={topInsetHeight}
      eyebrow={strings.headerEyebrow}
      title={`مرحبا ${displayName}`}
      leading={
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      }
      trailing={<AppHeaderAction icon="logout" onPress={onLogout} />}
    />
  );
};

export default HomeHeader;
