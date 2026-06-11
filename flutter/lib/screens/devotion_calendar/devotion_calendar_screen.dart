// ─── DevotionCalendarScreen ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class DevotionCalendarScreen extends StatelessWidget {
  const DevotionCalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bgColor =
        isDark ? AppColors.darkBackground : AppColors.lightBackground;

    return Scaffold(
      backgroundColor: bgColor,
      body: Column(
        children: [
          AppHeader(
            title: AppStrings.devotionCalendarTitle,
            onBack: () => Navigator.of(context).maybePop(),
          ),
          const Expanded(
            child: Center(
              child: Text(
                'قريبًا…',
                style: TextStyle(color: AppColors.accent, fontSize: 18),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
