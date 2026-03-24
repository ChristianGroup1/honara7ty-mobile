import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../components/home/HomeScreen';
import ProfileScreen from '../components/profile/ProfileScreen';
import DailyNotificationsScreen from '../components/daily-notifications/DailyNotificationsScreen';
import MoreScreen from '../components/more/MoreScreen';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

const Tab = createBottomTabNavigator();

function renderTabBarIcon(
  routeName: string,
  color: string,
  focused: boolean,
) {
  const icons: Record<string, string> = {
    الرئيسية: focused ? 'home' : 'home-outline',
    'الملف الشخصي': focused ? 'account' : 'account-outline',
    الإعدادات: focused ? 'cog' : 'cog-outline',
    المزيد: focused
      ? 'dots-horizontal-circle'
      : 'dots-horizontal-circle-outline',
  };

  return (
    <MaterialCommunityIcons
      name={icons[routeName] ?? 'circle'}
      size={24}
      color={color}
    />
  );
}

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="الرئيسية"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: {
          backgroundColor: NAVY,
          borderTopWidth: 0,
          paddingBottom: Math.max(
            insets.bottom,
            Platform.OS === 'android' ? 8 : 4,
          ),
          paddingTop: 8,
          height:
            (Platform.OS === 'android' ? 60 : 80) +
            Math.max(
              insets.bottom - (Platform.OS === 'android' ? 8 : 4),
              0,
            ),
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ color, focused }) =>
          renderTabBarIcon(route.name, color, focused),
      })}
    >
      <Tab.Screen name="الرئيسية" component={HomeScreen} />
      <Tab.Screen name="الملف الشخصي" component={ProfileScreen} />
      <Tab.Screen name="الإعدادات" component={DailyNotificationsScreen} />
      <Tab.Screen name="المزيد" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
