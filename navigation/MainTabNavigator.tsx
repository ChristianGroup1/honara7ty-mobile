import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../components/home/HomeScreen';
import ProfileScreen from '../components/profile/ProfileScreen';
import DailyNotificationsScreen from '../components/daily-notifications/DailyNotificationsScreen';
import MoreScreen from '../components/more/MoreScreen';
import AboutIdeaScreen from '../components/about-idea/AboutIdeaScreen';
import PrayerNotesScreen from '../components/prayer-notes/PrayerNotesScreen';
import SpiritualReflectionScreen from '../components/spiritual-reflection/SpiritualReflectionScreen';
import BibleMemorizationScreen from '../components/bible-memorization/BibleMemorizationScreen';
import BadgesScreen from '../components/badges/BadgesScreen';
import DevotionGuideScreen from '../components/devotion/DevotionGuideScreen';
import DevotionDetailScreen from '../components/devotion/DevotionDetailScreen';
import DevotionCalendarScreen from '../components/devotion-calendar/DevotionCalendarScreen';
import DevotionGroupsScreen from '../components/devotion-groups/DevotionGroupsScreen';
import DevotionGroupInviteScreen from '../components/devotion-groups/DevotionGroupInviteScreen';
import DevotionGroupDetailsScreen from '../components/devotion-groups/DevotionGroupDetailsScreen';
import DevotionGroupMemberDetailsScreen from '../components/devotion-groups/DevotionGroupMemberDetailsScreen';
import { getStrings } from '../localization';

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

const hiddenTabScreenOptions = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' as const },
};

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const strings = getStrings().navigation;
  const bottomInset = Math.max(insets.bottom, 0);
  const tabBarBaseHeight = Platform.OS === 'android' ? 60 : 58;
  const tabBarBottomPadding =
    Platform.OS === 'android' ? Math.max(bottomInset, 8) : bottomInset + 6;
  const tabBarHeight = tabBarBaseHeight + tabBarBottomPadding;
  const tabLabels: Record<string, string> = {
    Home: strings.tabs.home,
    Profile: strings.tabs.profile,
    DailyNotifications: strings.tabs.settings,
    More: strings.tabs.more,
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="history"
      detachInactiveScreens
      sceneContainerStyle={{ backgroundColor: NAVY }}
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: {
          backgroundColor: NAVY,
          borderTopWidth: 0,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 6,
          height: tabBarHeight,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabel: tabLabels[route.name] ?? route.name,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 0 },
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
        name="AboutIdea"
        component={AboutIdeaScreen}
        options={{
          ...hiddenTabScreenOptions,
          tabBarStyle: { display: 'none' },
        }}
      />
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
      <Tab.Screen
        name="DevotionGroups"
        component={DevotionGroupsScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionGroupInvite"
        component={DevotionGroupInviteScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionGroupDetails"
        component={DevotionGroupDetailsScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionGroupMemberDetails"
        component={DevotionGroupMemberDetailsScreen}
        options={hiddenTabScreenOptions}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
