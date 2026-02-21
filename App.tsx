/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  WelcomeScreen,
  SplashScreen,
  ProfileCompletion,
  LoginUi,
} from './screens';
import SignupStep1 from './components/Signup'; // Import your signup step

const Stack = createStackNavigator();

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator initialRouteName="Welcome">
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignupStep1"
            component={SignupStep1}
            options={{ headerShown: false }} // This line hides the white header
          />
          <Stack.Screen
            name="ProfileCompletion"
            component={ProfileCompletion}
            options={{ headerShown: false }} // This line hides the white header
          />
          <Stack.Screen
            name="Login"
            component={LoginUi}
            options={{ headerShown: false }} // This line hides the white header
          />
          {/* Add more screens here */}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
