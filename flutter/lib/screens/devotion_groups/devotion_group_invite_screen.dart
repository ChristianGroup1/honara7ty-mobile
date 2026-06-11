// ─── DevotionGroupInviteScreen ────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class DevotionGroupInviteScreen extends StatelessWidget {
  final String inviteCode;
  const DevotionGroupInviteScreen({super.key, required this.inviteCode});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bgColor = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    return Scaffold(
      backgroundColor: bgColor,
      body: Column(
        children: [
          AppHeader(title: 'دعوة المجموعة', onBack: () => Navigator.of(context).maybePop()),
          Expanded(child: Center(child: Text('كود الدعوة: $inviteCode', style: const TextStyle(color: AppColors.accent)))),
        ],
      ),
    );
  }
}
