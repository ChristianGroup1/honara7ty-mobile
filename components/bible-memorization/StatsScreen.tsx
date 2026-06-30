import React from 'react';
import { View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { MemorizationStackParamList } from './types';
import {
  createThemedMemorizationStyles,
  memorizationStyles as styles,
} from './styles';
import { getStrings } from '../../localization';
import MemorizationHeader from './MemorizationHeader';
import MemorizationStatsPanel from './MemorizationStatsPanel';
import { useNightMode } from '../../lib/nightMode';

type Props = StackScreenProps<MemorizationStackParamList, 'Stats'>;

const StatsScreen = ({ navigation }: Props) => {
  const strings = getStrings().bibleMemorization;
  const { colors } = useNightMode();
  const themedStyles = React.useMemo(
    () => createThemedMemorizationStyles(colors),
    [colors],
  );

  return (
    <View style={[styles.container, themedStyles.container]}>
      <MemorizationHeader
        title={strings.stats.weeklyProgress}
        onBack={() => navigation.goBack()}
      />
      <MemorizationStatsPanel themedStyles={themedStyles} />
    </View>
  );
};

export default StatsScreen;
