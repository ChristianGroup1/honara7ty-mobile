// ─── Home Screen ─────────────────────────────────────────────────────────────
// Mirrors components/home/HomeScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/custom_alert_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  User? _user;
  bool _loading = true;
  bool? _devotionAnswer; // null = not answered, true = yes, false = no

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final session = supabase.auth.currentSession;
    setState(() {
      _user = session?.user;
      _loading = false;
    });
  }

  String get _displayName {
    final meta = _user?.userMetadata ?? {};
    final name = meta['full_name'] as String? ?? '';
    if (name.isNotEmpty) return name.split(' ').first;
    return _user?.email?.split('@').first ?? '';
  }

  String get _initials {
    final name = _user?.userMetadata?['full_name'] as String? ?? '';
    if (name.isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}';
    return name.isNotEmpty ? name[0] : '?';
  }

  void _handleLogout() {
    showCustomAlert(
      context: context,
      title: AppStrings.homeLogoutTitle,
      message: AppStrings.homeLogoutMessage,
      type: AlertType.warning,
      actions: [
        AlertAction(text: AppStrings.homeCancel, isCancel: true),
        AlertAction(
          text: AppStrings.homeLogout,
          isDestructive: true,
          onPressed: () async {
            await context.read<AuthProvider>().signOut();
          },
        ),
      ],
    );
  }

  void _handleDevotionYes() {
    setState(() => _devotionAnswer = true);
    showCustomAlert(
      context: context,
      title: AppStrings.homeCorrectStreakTitle,
      type: AlertType.success,
    );
  }

  void _handleDevotionNo() {
    setState(() => _devotionAnswer = false);
    showCustomAlert(
      context: context,
      title: AppStrings.homeStartNowTitle,
      type: AlertType.info,
      actions: [
        AlertAction(text: AppStrings.homeLater, isCancel: true),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bgColor = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final headerColor = isDark ? AppColors.darkHeader : AppColors.lightHeader;
    final cardColor = isDark ? AppColors.darkCard : AppColors.lightCard;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final mutedColor =
        isDark ? AppColors.darkMutedText : AppColors.lightMutedText;

    if (_loading) {
      return Scaffold(
        backgroundColor: bgColor,
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.accent),
        ),
      );
    }

    return Scaffold(
      backgroundColor: bgColor,
      body: Column(
        children: [
          // Header.
          Container(
            color: headerColor,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    // Avatar.
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.accent.withOpacity(0.25),
                      child: Text(
                        _initials.toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.accent,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'مرحبًا، $_displayName',
                            textDirection: TextDirection.rtl,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'هنا راحتي',
                            textDirection: TextDirection.rtl,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.6),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Logout.
                    IconButton(
                      icon: const Icon(Icons.logout, color: Colors.white70, size: 20),
                      onPressed: _handleLogout,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Content.
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Daily devotion card.
                _DailyQuestionCard(
                  answer: _devotionAnswer,
                  cardColor: cardColor,
                  textColor: textColor,
                  mutedColor: mutedColor,
                  onYes: _handleDevotionYes,
                  onNo: _handleDevotionNo,
                ),
                const SizedBox(height: 14),

                // Quick actions.
                _QuickActionsGrid(cardColor: cardColor, textColor: textColor),
                const SizedBox(height: 14),

                // Feature cards.
                _FeatureCard(
                  title: AppStrings.homePrayerNotesTitle,
                  subtitle: AppStrings.homePrayerNotesSubtitle,
                  icon: Icons.favorite_outline_rounded,
                  iconColor: const Color(0xFF78A1BD),
                  cardColor: cardColor,
                  textColor: textColor,
                  mutedColor: mutedColor,
                  onTap: () => context.push(Routes.prayerNotes),
                ),
                const SizedBox(height: 12),
                _FeatureCard(
                  title: AppStrings.homeReflectionTitle,
                  subtitle: AppStrings.homeReflectionSubtitle,
                  icon: Icons.edit_note_rounded,
                  iconColor: const Color(0xFF7FD6B3),
                  cardColor: cardColor,
                  textColor: textColor,
                  mutedColor: mutedColor,
                  onTap: () => context.push(Routes.spiritualReflection),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Daily Question Card ──────────────────────────────────────────────────────

class _DailyQuestionCard extends StatelessWidget {
  final bool? answer;
  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final VoidCallback onYes;
  final VoidCallback onNo;

  const _DailyQuestionCard({
    required this.answer,
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
    required this.onYes,
    required this.onNo,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.auto_stories_rounded,
              color: AppColors.accent, size: 36),
          const SizedBox(height: 12),
          Text(
            AppStrings.homeDailyQuestionTitle,
            textDirection: TextDirection.rtl,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: textColor,
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          if (answer == null)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _AnswerButton(
                  label: AppStrings.homeYes,
                  color: AppColors.accent,
                  onTap: onYes,
                ),
                _AnswerButton(
                  label: AppStrings.homeNo,
                  color: Colors.grey.shade400,
                  onTap: onNo,
                ),
              ],
            )
          else
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  answer! ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  color: answer! ? Colors.green : Colors.orange,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Text(
                  answer! ? AppStrings.homeYes : AppStrings.homeNo,
                  style: TextStyle(
                    color: answer! ? Colors.green : Colors.orange,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: onYes,
                  child: Text(
                    AppStrings.homeEditAnswer,
                    style: TextStyle(
                      color: mutedColor,
                      fontSize: 13,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _AnswerButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _AnswerButton(
      {required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        minimumSize: const Size(110, 44),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Text(label,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
    );
  }
}

// ─── Quick Actions Grid ───────────────────────────────────────────────────────

class _QuickActionsGrid extends StatelessWidget {
  final Color cardColor;
  final Color textColor;

  const _QuickActionsGrid(
      {required this.cardColor, required this.textColor});

  static const _actions = [
    (
      icon: Icons.group_outlined,
      label: 'مجموعات التقديس',
      route: Routes.devotionGroups,
      color: Color(0xFF4A90D9),
    ),
    (
      icon: Icons.calendar_month_outlined,
      label: 'تقويم التقديس',
      route: Routes.devotionCalendar,
      color: Color(0xFF2E8B57),
    ),
    (
      icon: Icons.menu_book_outlined,
      label: 'دليل القداسة',
      route: Routes.devotionGuide,
      color: Color(0xFF9B59B6),
    ),
    (
      icon: Icons.star_outline_rounded,
      label: 'الأوسمة',
      route: Routes.badges,
      color: Color(0xFFF39C12),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: _actions.map((a) {
        return GestureDetector(
          onTap: () => context.push(a.route),
          child: Container(
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(a.icon, color: a.color, size: 28),
                const SizedBox(height: 6),
                Text(
                  a.label,
                  textDirection: TextDirection.rtl,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

class _FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final VoidCallback onTap;

  const _FeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
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
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
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
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    title,
                    textDirection: TextDirection.rtl,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    textDirection: TextDirection.rtl,
                    style: TextStyle(color: mutedColor, fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_back_ios_rounded,
                color: mutedColor, size: 16),
          ],
        ),
      ),
    );
  }
}
