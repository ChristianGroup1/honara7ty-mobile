import 'package:flutter/material.dart';

import '../core/theme.dart';

class ScreenHero extends StatelessWidget {
  const ScreenHero({
    super.key,
    required this.icon,
    required this.badge,
    required this.eyebrow,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String badge;
  final String eyebrow;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: dark
              ? AppColors.headerGradientDark
              : AppColors.headerGradientLight,
        ),
        boxShadow: AppShadows.soft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Icon(icon, color: Colors.white),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.champagne.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    color: AppColors.champagne,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            eyebrow,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              color: AppColors.champagne,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              color: Colors.white.withValues(alpha: 0.78),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
