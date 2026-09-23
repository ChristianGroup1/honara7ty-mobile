import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../bible_reader/bible_reader_screen.dart';
import '../daily_notifications/daily_notifications_screen.dart';
import '../home/home_screen.dart';
import '../more/more_screen.dart';
import '../profile/profile_screen.dart';

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
    BibleReaderScreen(showBack: false),
    DailyNotificationsScreen(showBack: false),
    MoreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final barColor = isDark ? AppColors.darkHeader : AppColors.lightHeader;
    final inactive =
        isDark ? AppColors.darkTabInactive : AppColors.lightTabInactive;

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _tabs),
      bottomNavigationBar: _TabBar(
        color: barColor,
        inactive: inactive,
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({
    required this.color,
    required this.inactive,
    required this.currentIndex,
    required this.onTap,
  });

  final Color color;
  final Color inactive;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final isAndroid = defaultTargetPlatform == TargetPlatform.android;
    final bottomPadding =
        isAndroid ? bottomInset.clamp(10.0, double.infinity) : bottomInset + 8;
    final height = (isAndroid ? 72.0 : 70.0) + bottomPadding;

    return Material(
      color: Colors.transparent,
      child: SizedBox(
        height: height,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              top: 28,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(28),
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x2E000000),
                      blurRadius: 18,
                      offset: Offset(0, -8),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              top: 36,
              bottom: bottomPadding,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _item(0, MdiIcons.home, MdiIcons.homeOutline,
                      AppStrings.navHome),
                  _item(1, MdiIcons.account, MdiIcons.accountOutline,
                      AppStrings.navProfile),
                  _bible(),
                  _item(3, MdiIcons.cog, MdiIcons.cogOutline,
                      AppStrings.navSettings),
                  _item(4, MdiIcons.dotsHorizontalCircle,
                      MdiIcons.dotsHorizontalCircleOutline, AppStrings.navMore),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _item(int index, IconData active, IconData idle, String label) {
    final selected = currentIndex == index;
    final tint = selected ? AppColors.accent : inactive;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(selected ? active : idle, color: tint, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              style: TextStyle(
                  color: tint, fontSize: 11, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bible() {
    final selected = currentIndex == 2;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Transform.translate(
              offset: const Offset(0, -28),
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.accent,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 10,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(MdiIcons.bookOpenPageVariant,
                    color: Colors.white, size: 26),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -16),
              child: Text(
                AppStrings.navBible,
                maxLines: 1,
                style: TextStyle(
                  color: selected
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.78),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
