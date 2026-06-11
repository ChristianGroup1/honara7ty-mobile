// ─── DevotionGroupMemberDetailsScreen ────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class DevotionGroupMemberDetailsScreen extends StatelessWidget {
  final String groupId;
  final String userId;
  final String? displayName;
  const DevotionGroupMemberDetailsScreen({
    super.key,
    required this.groupId,
    required this.userId,
    this.displayName,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bgColor = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    return Scaffold(
      backgroundColor: bgColor,
      body: Column(
        children: [
          AppHeader(title: displayName ?? 'تفاصيل العضو', onBack: () => Navigator.of(context).maybePop()),
          const Expanded(child: Center(child: Text('قريبًا…', style: TextStyle(color: AppColors.accent)))),
        ],
      ),
    );
  }
}
