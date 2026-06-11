// ─── Profile Screen ───────────────────────────────────────────────────────────
// Mirrors components/profile/ProfileScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    final meta = user?.userMetadata ?? {};
    final name = meta['full_name'] as String? ?? '';
    final email = user?.email ?? '';
    final isDark = context.watch<ThemeProvider>().isNightMode;
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
          AppHeader(title: AppStrings.profileTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Avatar.
                Center(
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: AppColors.accent.withOpacity(0.15),
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppColors.accent,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(name,
                          textDirection: TextDirection.rtl,
                          style: TextStyle(
                              color: textColor,
                              fontSize: 20,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(email,
                          style: TextStyle(color: mutedColor, fontSize: 14)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Info rows.
                _InfoCard(
                  cardColor: cardColor,
                  borderColor: borderColor,
                  items: [
                    if (meta['church'] != null)
                      _InfoRow(
                        icon: Icons.church_outlined,
                        label: AppStrings.profileChurch,
                        value: meta['church'] as String,
                        textColor: textColor,
                        mutedColor: mutedColor,
                      ),
                    if (meta['sect'] != null)
                      _InfoRow(
                        icon: Icons.account_balance_outlined,
                        label: AppStrings.profileSect,
                        value: meta['sect'] as String,
                        textColor: textColor,
                        mutedColor: mutedColor,
                      ),
                    if (meta['birth_date'] != null)
                      _InfoRow(
                        icon: Icons.cake_outlined,
                        label: AppStrings.profileBirthDate,
                        value: meta['birth_date'] as String,
                        textColor: textColor,
                        mutedColor: mutedColor,
                      ),
                    if (meta['gender'] != null)
                      _InfoRow(
                        icon: Icons.person_outline,
                        label: AppStrings.profileGender,
                        value: meta['gender'] == 'male'
                            ? AppStrings.profileMale
                            : AppStrings.profileFemale,
                        textColor: textColor,
                        mutedColor: mutedColor,
                      ),
                  ],
                ),
                const SizedBox(height: 16),

                // Devotion groups button.
                _ActionButton(
                  icon: Icons.group_outlined,
                  label: AppStrings.profileDevotionGroups,
                  cardColor: cardColor,
                  borderColor: borderColor,
                  textColor: textColor,
                  onTap: () => context.push(Routes.devotionGroups),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final Color cardColor;
  final Color borderColor;
  final List<Widget> items;

  const _InfoCard(
      {required this.cardColor,
      required this.borderColor,
      required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: item,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color textColor;
  final Color mutedColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.textColor,
    required this.mutedColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      textDirection: TextDirection.rtl,
      children: [
        Icon(icon, color: AppColors.accent, size: 20),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(label,
                textDirection: TextDirection.rtl,
                style: TextStyle(color: mutedColor, fontSize: 12)),
            Text(value,
                textDirection: TextDirection.rtl,
                style: TextStyle(
                    color: textColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w500)),
          ],
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color cardColor;
  final Color borderColor;
  final Color textColor;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.cardColor,
    required this.borderColor,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          textDirection: TextDirection.rtl,
          children: [
            Icon(icon, color: AppColors.accent, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                textDirection: TextDirection.rtl,
                style: TextStyle(
                    color: textColor,
                    fontSize: 15,
                    fontWeight: FontWeight.w600),
              ),
            ),
            Icon(Icons.arrow_back_ios_rounded,
                color: AppColors.accent, size: 16),
          ],
        ),
      ),
    );
  }
}
