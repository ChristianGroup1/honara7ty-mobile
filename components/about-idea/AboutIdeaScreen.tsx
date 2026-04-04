import React from 'react';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import OnboardingScreen from '../onboarding/OnboardingScreen';

const AboutIdeaScreen = ({ navigation }: any) => {
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('light-content');

      return () => {
        StatusBar.setBarStyle('light-content');
      };
    }, []),
  );

  return (
    <OnboardingScreen
      navigation={navigation}
      route={{ params: { inApp: true } }}
    />
  );
};

export default AboutIdeaScreen;
