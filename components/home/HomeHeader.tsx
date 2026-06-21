import React from 'react';
import { Text, View } from 'react-native';
import { createHomeStyles } from './styles';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import { useNightMode } from '../../lib/nightMode';

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
  const { colors } = useNightMode();
  const styles = React.useMemo(() => createHomeStyles(colors), [colors]);

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

export default React.memo(HomeHeader);
