// ─── DevotionGroupPrayerRequestsScreen ───────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class DevotionGroupPrayerRequestsScreen extends StatelessWidget {
  final String groupId;
  final String? groupName;
  const DevotionGroupPrayerRequestsScreen({
    super.key,
    required this.groupId,
    this.groupName,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bgColor = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    return Scaffold(
      backgroundColor: bgColor,
      body: Column(
        children: [
          AppHeader(title: groupName ?? 'طلبات الصلاة', onBack: () => Navigator.of(context).maybePop()),
          const Expanded(child: Center(child: Text('قريبًا…', style: TextStyle(color: AppColors.accent)))),
        ],
      ),
    );
  }
}
