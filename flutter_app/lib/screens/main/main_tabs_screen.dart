import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';
import '../bible_reader/bible_reader_screen.dart';
import '../daily_notifications/daily_notifications_screen.dart';
import '../home/home_screen.dart';
import '../more/more_screen.dart';

class MainTabsScreen extends StatefulWidget {
  const MainTabsScreen({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<MainTabsScreen> createState() => _MainTabsScreenState();
}

class _MainTabsScreenState extends State<MainTabsScreen> {
  late int _currentIndex = widget.initialIndex.clamp(0, 3);

  late final List<Widget> _tabs = [
    const HomeScreen(),
    const BibleReaderScreen(showBack: false),
    const DailyNotificationsScreen(showBack: false),
    MoreScreen(onHome: _showHome),
  ];

  void _showHome() => _openTab(0);

  @override
  void didUpdateWidget(MainTabsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.initialIndex.clamp(0, 3);
    if (next != _currentIndex) {
      _currentIndex = next;
    }
  }

  void _openTab(int index) {
    final next = index.clamp(0, 3);
    if (next == _currentIndex) return;
    context.go('${Routes.mainTabs}?tab=$next');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _tabs),
      bottomNavigationBar: YouthAppTabBar(
        isDark: isDark,
        currentIndex: _currentIndex,
        onTap: _openTab,
      ),
    );
  }
}
