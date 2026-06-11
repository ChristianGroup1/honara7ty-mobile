// ─── More Screen ─────────────────────────────────────────────────────────────
// Mirrors components/more/MoreScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  static const _items = [
    (
      route: Routes.devotionGuide,
      icon: Icons.psychology_outlined,
      title: AppStrings.moreDevotionGuideTitle,
      subtitle: AppStrings.moreDevotionGuideSubtitle,
      color: Color(0xFF4A90D9),
    ),
    (
      route: Routes.aboutIdea,
      icon: Icons.lightbulb_outline_rounded,
      title: AppStrings.moreAboutIdeaTitle,
      subtitle: AppStrings.moreAboutIdeaSubtitle,
      color: Color(0xFFD97B29),
    ),
    (
      route: Routes.bibleMemorization,
      icon: Icons.psychology_rounded,
      title: AppStrings.moreBibleMemorizationTitle,
      subtitle: AppStrings.moreBibleMemorizationSubtitle,
      color: Color(0xFF1A7A7A),
    ),
    (
      route: Routes.lockScreenVerse,
      icon: Icons.image_outlined,
      title: AppStrings.moreLockScreenVerseTitle,
      subtitle: AppStrings.moreLockScreenVerseSubtitle,
      color: AppColors.accent,
    ),
    (
      route: Routes.badges,
      icon: Icons.emoji_events_outlined,
      title: AppStrings.moreBadgesTitle,
      subtitle: AppStrings.moreBadgesSubtitle,
      color: AppColors.accent,
    ),
    (
      route: Routes.devotionCalendar,
      icon: Icons.calendar_month_outlined,
      title: AppStrings.moreDevotionCalendarTitle,
      subtitle: AppStrings.moreDevotionCalendarSubtitle,
      color: Color(0xFF2E8B57),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isNightMode;
    final bgColor = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final cardColor = isDark ? AppColors.darkCard : AppColors.lightCard;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final mutedColor =
        isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Scaffold(
      backgroundColor: bgColor,
      body: Column(
        children: [
          AppHeader(title: AppStrings.moreTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Night mode toggle.
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    textDirection: TextDirection.rtl,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.accent.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Icon(
                          isDark
                              ? Icons.nightlight_round
                              : Icons.wb_sunny_rounded,
                          color: AppColors.accent,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              AppStrings.moreNightModeTitle,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                  color: textColor,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold),
                            ),
                            Text(
                              AppStrings.moreNightModeSubtitle,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                  color: mutedColor, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: isDark,
                        onChanged: (v) => themeProvider.setNightMode(v),
                        activeColor: AppColors.accent,
                        inactiveThumbColor: Colors.white,
                        inactiveTrackColor: Colors.grey.shade300,
                      ),
                    ],
                  ),
                ),

                // Menu items.
                ..._items.map(
                  (item) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () => context.push(item.route),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: borderColor),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          textDirection: TextDirection.rtl,
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: item.color.withOpacity(0.13),
                                borderRadius: BorderRadius.circular(25),
                              ),
                              child: Icon(item.icon,
                                  color: item.color, size: 26),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    item.title,
                                    textDirection: TextDirection.rtl,
                                    style: TextStyle(
                                        color: textColor,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    item.subtitle,
                                    textDirection: TextDirection.rtl,
                                    style: TextStyle(
                                        color: mutedColor, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.arrow_back_ios_rounded,
                                color: mutedColor, size: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
