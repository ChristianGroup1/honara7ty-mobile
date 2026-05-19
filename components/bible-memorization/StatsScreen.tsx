import React from 'react';
import { View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { MemorizationStackParamList } from './types';
import { memorizationStyles as styles } from './styles';
import { getStrings } from '../../localization';
import MemorizationHeader from './MemorizationHeader';
import MemorizationStatsPanel from './MemorizationStatsPanel';

type Props = StackScreenProps<MemorizationStackParamList, 'Stats'>;

const StatsScreen = ({ navigation }: Props) => {
  const strings = getStrings().bibleMemorization;

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title={strings.stats.weeklyProgress}
        onBack={() => navigation.goBack()}
      />
      <MemorizationStatsPanel />
    </View>
  );
};

export default StatsScreen;
