import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../components/home/HomeScreen';
import ProfileScreen from '../components/profile/ProfileScreen';
import DailyNotificationsScreen from '../components/daily-notifications/DailyNotificationsScreen';
import MoreScreen from '../components/more/MoreScreen';
import PrayerNotesScreen from '../components/prayer-notes/PrayerNotesScreen';
import SpiritualReflectionScreen from '../components/spiritual-reflection/SpiritualReflectionScreen';
import BibleMemorizationScreen from '../components/bible-memorization/BibleMemorizationScreen';
import BadgesScreen from '../components/badges/BadgesScreen';
import DevotionGuideScreen from '../components/devotion/DevotionGuideScreen';
import DevotionDetailScreen from '../components/devotion/DevotionDetailScreen';
import DevotionCalendarScreen from '../components/devotion-calendar/DevotionCalendarScreen';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

const Tab = createBottomTabNavigator();

function renderTabBarIcon(
  routeName: string,
  color: string,
  focused: boolean,
) {
  const icons: Record<string, string> = {
    Home: focused ? 'home' : 'home-outline',
    Profile: focused ? 'account' : 'account-outline',
    DailyNotifications: focused ? 'cog' : 'cog-outline',
    More: focused
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

const TAB_LABELS: Record<string, string> = {
  Home: 'الرئيسية',
  Profile: 'الملف الشخصي',
  DailyNotifications: 'الإعدادات',
  More: 'المزيد',
};

const hiddenTabScreenOptions = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' as const },
};

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="history"
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
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ color, focused }) =>
          renderTabBarIcon(route.name, color, focused),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="DailyNotifications"
        component={DailyNotificationsScreen}
      />
      <Tab.Screen name="More" component={MoreScreen} />
      <Tab.Screen
        name="PrayerNotes"
        component={PrayerNotesScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="SpiritualReflection"
        component={SpiritualReflectionScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="BibleMemorization"
        component={BibleMemorizationScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="Badges"
        component={BadgesScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionGuide"
        component={DevotionGuideScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionDetail"
        component={DevotionDetailScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionCalendar"
        component={DevotionCalendarScreen}
        options={hiddenTabScreenOptions}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
