// ─── Main Tabs Screen ─────────────────────────────────────────────────────────
// Mirrors navigation/MainTabNavigator.tsx

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../home/home_screen.dart';
import '../profile/profile_screen.dart';
import '../daily_notifications/daily_notifications_screen.dart';
import '../more/more_screen.dart';

class MainTabsScreen extends StatefulWidget {
  const MainTabsScreen({super.key});

  @override
  State<MainTabsScreen> createState() => _MainTabsScreenState();
}

class _MainTabsScreenState extends State<MainTabsScreen> {
  int _currentIndex = 0;

  final _tabs = const [
    HomeScreen(),
    ProfileScreen(),
    DailyNotificationsScreen(),
    MoreScreen(),
  ];

  final _labels = const [
    AppStrings.navHome,
    AppStrings.navProfile,
    AppStrings.navSettings,
    AppStrings.navMore,
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final headerColor =
        isDark ? AppColors.darkHeader : AppColors.lightHeader;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        backgroundColor: headerColor,
        selectedItemColor: AppColors.accent,
        unselectedItemColor: isDark
            ? AppColors.darkTabInactive
            : AppColors.lightTabInactive,
        type: BottomNavigationBarType.fixed,
        elevation: 12,
        selectedLabelStyle:
            const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle:
            const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        items: [
          BottomNavigationBarItem(
            icon: Icon(_currentIndex == 0
                ? Icons.home_rounded
                : Icons.home_outlined),
            label: _labels[0],
          ),
          BottomNavigationBarItem(
            icon: Icon(_currentIndex == 1
                ? Icons.person_rounded
                : Icons.person_outline),
            label: _labels[1],
          ),
          BottomNavigationBarItem(
            icon: Icon(_currentIndex == 2
                ? Icons.settings_rounded
                : Icons.settings_outlined),
            label: _labels[2],
          ),
          BottomNavigationBarItem(
            icon: Icon(_currentIndex == 3
                ? Icons.more_horiz_rounded
                : Icons.more_horiz_outlined),
            label: _labels[3],
          ),
        ],
      ),
    );
  }
}
