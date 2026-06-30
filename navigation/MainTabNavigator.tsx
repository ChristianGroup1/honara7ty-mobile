import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../components/home/HomeScreen';
import ProfileScreen from '../components/profile/ProfileScreen';
import BibleReaderScreen from '../components/bible-reader/BibleReaderScreen';
import DailyNotificationsScreen from '../components/daily-notifications/DailyNotificationsScreen';
import ReadingPlanSuggestionsScreen from '../components/daily-notifications/ReadingPlanSuggestionsScreen';
import MoreScreen from '../components/more/MoreScreen';
import AboutIdeaScreen from '../components/about-idea/AboutIdeaScreen';
import PrayerNotesScreen from '../components/prayer-notes/PrayerNotesScreen';
import SpiritualReflectionScreen from '../components/spiritual-reflection/SpiritualReflectionScreen';
import BibleMemorizationScreen from '../components/bible-memorization/BibleMemorizationScreen';
import BadgesScreen from '../components/badges/BadgesScreen';
import LockScreenVerseScreen from '../components/lock-screen-verse/LockScreenVerseScreen';
import DevotionGuideScreen from '../components/devotion/DevotionGuideScreen';
import DevotionDetailScreen from '../components/devotion/DevotionDetailScreen';
import DevotionCalendarScreen from '../components/devotion-calendar/DevotionCalendarScreen';
import DevotionGroupsScreen from '../components/devotion-groups/DevotionGroupsScreen';
import DevotionGroupInviteScreen from '../components/devotion-groups/DevotionGroupInviteScreen';
import DevotionGroupDetailsScreen from '../components/devotion-groups/DevotionGroupDetailsScreen';
import DevotionGroupMemberDetailsScreen from '../components/devotion-groups/DevotionGroupMemberDetailsScreen';
import DevotionGroupPrayerRequestsScreen from '../components/devotion-groups/DevotionGroupPrayerRequestsScreen';
import WeeklyReportScreen from '../components/weekly-report/WeeklyReportScreen';
import { getStrings } from '../localization';
import { useNightMode } from '../lib/nightMode';
import { getTabBarLayout } from '../lib/tabBarLayout';
import { GOLD } from '../components/shared/designTokens';

const Tab = createBottomTabNavigator();

function renderTabBarIcon(routeName: string, color: string, focused: boolean) {
  const icons: Record<string, string> = {
    Home: focused ? 'home' : 'home-outline',
    Profile: focused ? 'account' : 'account-outline',
    BibleReader: focused
      ? 'book-open-page-variant'
      : 'book-open-page-variant-outline',
    DailyNotifications: focused ? 'cog' : 'cog-outline',
    More: focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline',
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

const CenterBibleTabButton = ({ accessibilityState, onPress }: any) => {
  const focused = Boolean(accessibilityState?.selected);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.centerButtonWrap}
    >
      <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
        <MaterialCommunityIcons
          name="book-open-page-variant"
          size={26}
          color="#FFF"
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.centerLabel, focused && styles.centerLabelActive]}
      >
        الكتاب المقدس
      </Text>
    </TouchableOpacity>
  );
};

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const strings = getStrings().navigation;
  const { colors } = useNightMode();
  const { tabBarBottomPadding, tabBarHeight } = getTabBarLayout(insets.bottom);
  const tabLabels: Record<string, string> = {
    Home: strings.tabs.home,
    Profile: strings.tabs.profile,
    BibleReader: strings.tabs.bible,
    DailyNotifications: strings.tabs.settings,
    More: strings.tabs.more,
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="history"
      detachInactiveScreens
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.header,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 12,
          height: tabBarHeight,
          elevation: 18,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
        },
        tabBarLabel: ({ color }) => (
          <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
            {tabLabels[route.name] ?? route.name}
          </Text>
        ),
        tabBarItemStyle:
          route.name === 'BibleReader' ? styles.centerTabItem : undefined,
        tabBarButton:
          route.name === 'BibleReader'
            ? props => <CenterBibleTabButton {...props} />
            : undefined,
        tabBarIcon: ({ color, focused }) =>
          renderTabBarIcon(route.name, color, focused),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="BibleReader" component={BibleReaderScreen} />
      <Tab.Screen
        name="DailyNotifications"
        component={DailyNotificationsScreen}
      />
      <Tab.Screen
        name="ReadingPlanSuggestions"
        component={ReadingPlanSuggestionsScreen}
        options={hiddenTabScreenOptions}
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
        name="LockScreenVerse"
        component={LockScreenVerseScreen}
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
        name="DevotionGroupPrayerRequests"
        component={DevotionGroupPrayerRequestsScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="DevotionGroupMemberDetails"
        component={DevotionGroupMemberDetailsScreen}
        options={hiddenTabScreenOptions}
      />
      <Tab.Screen
        name="WeeklyReport"
        component={WeeklyReportScreen}
        options={hiddenTabScreenOptions}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  centerTabItem: {
    marginTop: -24,
  },
  centerButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -24,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 14,
  },
  centerButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  centerLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    width: 86,
    textAlign: 'center',
  },
  centerLabelActive: {
    color: '#FFFFFF',
  },
  tabLabel: {
    width: 76,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
});

export default MainTabNavigator;
