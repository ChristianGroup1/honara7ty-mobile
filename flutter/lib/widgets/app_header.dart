// ─── Shared: App Header ──────────────────────────────────────────────────────
// Mirrors components/shared/AppHeader.tsx

import 'package:flutter/material.dart';
import '../core/theme.dart';

class AppHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onBack;
  final List<Widget>? actions;

  const AppHeader({
    super.key,
    required this.title,
    this.onBack,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final headerColor =
        isDark ? AppColors.darkHeader : AppColors.lightHeader;

    return Container(
      color: headerColor,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Row(
            children: [
              if (onBack != null)
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new,
                      color: Colors.white, size: 20),
                  onPressed: onBack,
                ),
              Expanded(
                child: Text(
                  title,
                  textDirection: TextDirection.rtl,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (actions != null) ...actions! else const SizedBox(width: 48),
            ],
          ),
        ),
      ),
    );
  }
}
