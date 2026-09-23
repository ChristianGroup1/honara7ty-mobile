import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/badges/growth_tree.dart';
import '../../features/journal/devotion_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class _Badge {
  const _Badge({
    required this.key,
    required this.title,
    required this.days,
    required this.tier,
    required this.xp,
    required this.color,
    required this.emoji,
    required this.shareText,
    required this.icon,
  });

  final String key;
  final String title;
  final int days;
  final String tier;
  final int xp;
  final Color color;
  final String emoji;
  final String shareText;
  final IconData icon;
}

const _badges = [
  _Badge(key: 'weekly', title: 'أسبوع', days: 7, tier: 'برونزي', xp: 100, color: Color(0xFF4A90D9), emoji: '⭐', icon: Icons.star, shareText: 'لقد أكملت ٧ أيام متواصلة من وقتي مع الله.'),
  _Badge(key: 'biweekly', title: 'أسبوعان', days: 14, tier: 'برونزي', xp: 175, color: Color(0xFF00BCD4), emoji: '📅', icon: Icons.event_available, shareText: 'لقد أكملت ١٤ يوماً متواصلاً من وقتي مع الله.'),
  _Badge(key: 'monthly', title: 'شهر', days: 30, tier: 'فضي', xp: 350, color: Color(0xFF78A1BD), emoji: '🥇', icon: Icons.military_tech, shareText: 'لقد أكملت ٣٠ يوماً متواصلاً من وقتي مع الله.'),
  _Badge(key: 'twomonths', title: '٦٠ يوم', days: 60, tier: 'فضي', xp: 650, color: Color(0xFFFF6B6B), emoji: '⚡', icon: Icons.bolt, shareText: 'لقد أكملت ٦٠ يوماً متواصلاً من وقتي مع الله.'),
  _Badge(key: 'quarterly', title: '٣ أشهر', days: 90, tier: 'ذهبي', xp: 1000, color: Color(0xFF9C27B0), emoji: '👑', icon: Icons.workspace_premium, shareText: 'لقد أكملت ٩٠ يوماً متواصلاً من وقتي مع الله.'),
  _Badge(key: 'halfyear', title: '٦ أشهر', days: 180, tier: 'بلاتيني', xp: 2200, color: Color(0xFFE91E63), emoji: '❤️', icon: Icons.favorite, shareText: 'لقد أكملت ١٨٠ يوماً متواصلاً من وقتي مع الله.'),
  _Badge(key: 'yearly', title: 'سنة', days: 365, tier: 'ماسي', xp: 5000, color: Color(0xFFE84393), emoji: '🏆', icon: Icons.emoji_events, shareText: 'لقد أكملت سنة كاملة من وقتي مع الله.'),
  _Badge(key: 'dedication', title: 'سنتان', days: 730, tier: 'ماسي', xp: 10000, color: Color(0xFF4CAF50), emoji: '🎖️', icon: Icons.menu_book, shareText: 'لقد أكملت سنتين من وقتي مع الله.'),
];

class BadgesScreen extends StatefulWidget {
  const BadgesScreen({super.key});

  @override
  State<BadgesScreen> createState() => _BadgesScreenState();
}

class _BadgesScreenState extends State<BadgesScreen> {
  final _devotion = DevotionService();
  var _loading = true;
  var _streak = 0;
  var _days = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final logs = await _devotion.completedLogs();
      final dates = logs.map((log) => log['date'] as String);
      if (!mounted) return;
      setState(() {
        _days = dates.length;
        _streak = computeStreak(dates);
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'تعذر تحميل الإنجازات';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final earned = _badges.where((badge) => _streak >= badge.days).toList();
    final locked = _badges.where((badge) => _streak < badge.days).toList();
    final next = locked.isEmpty ? earned.last : locked.first;
    final progress = (next.days == 0 ? 1.0 : _streak / next.days).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: AppStrings.badgesTitle,
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_error != null)
                          Text(_error!, textAlign: TextAlign.center),
                        _SummaryCard(
                          card: card,
                          text: text,
                          muted: muted,
                          streak: _streak,
                          xp: computeTotalXp(_days),
                          earned: earned.length,
                          next: next,
                          progress: progress,
                          unlocked: locked.isEmpty,
                        ),
                        const SizedBox(height: 18),
                        GrowthTreeCard(
                          completedDays: _days,
                          streak: _streak,
                          card: card,
                          text: text,
                          muted: muted,
                          isNight: isDark,
                        ),
                        const SizedBox(height: 18),
                        if (earned.isNotEmpty) ...[
                          _SectionTitle('أوسمة تم فتحها', text),
                          ...earned.reversed.map(
                            (badge) => _BadgeTile(
                              badge: badge,
                              earned: true,
                              card: card,
                              text: text,
                              muted: muted,
                            ),
                          ),
                        ],
                        if (locked.isNotEmpty) ...[
                          _SectionTitle('أوسمة في الطريق', text),
                          ...locked.map(
                            (badge) => _BadgeTile(
                              badge: badge,
                              earned: false,
                              card: card,
                              text: text,
                              muted: muted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.card,
    required this.text,
    required this.muted,
    required this.streak,
    required this.xp,
    required this.earned,
    required this.next,
    required this.progress,
    required this.unlocked,
  });

  final Color card;
  final Color text;
  final Color muted;
  final int streak;
  final int xp;
  final int earned;
  final _Badge next;
  final double progress;
  final bool unlocked;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '$streak',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.accent,
              fontSize: 42,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            AppStrings.badgesStreakTitle,
            textAlign: TextAlign.center,
            textDirection: TextDirection.rtl,
            style: TextStyle(color: text, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _Stat('$xp', 'XP', muted, text)),
              Expanded(child: _Stat('$earned/${_badges.length}', 'أوسمة', muted, text)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            unlocked
                ? 'فتحت كل الأوسمة المتاحة'
                : 'فاضل ${next.days - streak} يوم وتفتحه',
            textDirection: TextDirection.rtl,
            textAlign: TextAlign.right,
            style: TextStyle(color: muted),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              color: next.color,
              backgroundColor: next.color.withValues(alpha: 0.15),
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label, this.muted, this.text);
  final String value;
  final String label;
  final Color muted;
  final Color text;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 18)),
        Text(label, style: TextStyle(color: muted, fontSize: 12)),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, this.color);
  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        title,
        textDirection: TextDirection.rtl,
        textAlign: TextAlign.right,
        style: TextStyle(color: color, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({
    required this.badge,
    required this.earned,
    required this.card,
    required this.text,
    required this.muted,
  });

  final _Badge badge;
  final bool earned;
  final Color card;
  final Color text;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        textDirection: TextDirection.rtl,
        children: [
          CircleAvatar(
            backgroundColor: badge.color.withValues(alpha: earned ? 0.18 : 0.08),
            child: Icon(badge.icon, color: earned ? badge.color : muted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${badge.emoji} ${badge.title}',
                  textDirection: TextDirection.rtl,
                  style: TextStyle(color: text, fontWeight: FontWeight.w700),
                ),
                Text(
                  earned ? '${badge.tier} · ${badge.xp} XP' : '${badge.days} يوم',
                  textDirection: TextDirection.rtl,
                  style: TextStyle(color: muted, fontSize: 12),
                ),
              ],
            ),
          ),
          if (earned)
            IconButton(
              onPressed: () => Share.share(
                '${badge.shareText}\n\nوسام ${badge.tier} · ${badge.xp} XP\nhttps://hanaraahti.app/badges/${badge.key}',
              ),
              icon: Icon(Icons.share_outlined, color: badge.color),
            )
          else
            Icon(Icons.lock_outline, color: muted),
        ],
      ),
    );
  }
}
