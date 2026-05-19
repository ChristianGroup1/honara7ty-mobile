import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import PickScreen from './PickScreen';
import ReciteScreen from './ReciteScreen';
import ResultScreen from './ResultScreen';
import StatsScreen from './StatsScreen';
import { memorizationStyles as styles } from './styles';
import { MemorizationStackParamList } from './types';

const Stack = createStackNavigator<MemorizationStackParamList>();

const BibleMemorizationScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Navigator
        initialRouteName="Pick"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Pick" component={PickScreen} />
        <Stack.Screen name="Recite" component={ReciteScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
      </Stack.Navigator>
    </SafeAreaView>
  );
};

export default BibleMemorizationScreen;
