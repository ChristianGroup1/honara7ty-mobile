import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/journal/prayer_notes_service.dart';
import '../../features/journal/reflections_service.dart';
import '../../features/memorization/memorization_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';
import '../../widgets/screen_hero.dart';

class WeeklyReportScreen extends StatefulWidget {
  const WeeklyReportScreen({super.key});

  @override
  State<WeeklyReportScreen> createState() => _WeeklyReportScreenState();
}

class _WeeklyReportScreenState extends State<WeeklyReportScreen> {
  var _loading = true;
  var _devotionDays = 0;
  var _totalDays = 1;
  var _streak = 0;
  var _chapters = 0;
  var _prayers = 0;
  var _answered = 0;
  var _reflections = 0;
  var _verses = 0;
  String _range = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day)
        .subtract(Duration(days: today.weekday % 7));
    final startKey = DevotionService.dateKey(start);
    final endKey = DevotionService.dateKey(today);
    bool inWeek(String iso) => iso.compareTo(startKey) >= 0 && iso.compareTo(endKey) <= 0;

    try {
      final logs = await DevotionService().completedLogs();
      final dates = logs.map((log) => log['date'] as String).toList();
      final weekLogs = logs.where((log) => inWeek(log['date'] as String));
      final prayers = await PrayerNotesService().load();
      final reflections = await ReflectionsService().load();
      final attempts = await MemorizationService().load();
      if (!mounted) return;
      setState(() {
        _totalDays = today.weekday % 7 + 1;
        _devotionDays = weekLogs.length;
        _streak = computeStreak(dates);
        _chapters = weekLogs.fold(0, (sum, log) => sum + chaptersInLog(log));
        _prayers = prayers.where((note) => inWeek(DevotionService.dateKey(note.createdAt))).length;
        _answered = prayers.where((note) => note.isAnswered).length;
        _reflections = reflections.where((entry) => inWeek(entry.date)).length;
        _verses = attempts
            .where((attempt) => inWeek(DevotionService.dateKey(attempt.createdAt)))
            .fold(0, (sum, attempt) => sum + attempt.verses.length);
        _range = '$startKey → $endKey';
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر تجهيز تقرير الأسبوع')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String get _encouragement {
    if (_devotionDays == 0) {
      return 'كل يوم فرصة جديدة تبدأ فيها وقتك مع ربنا. ابدأ النهارده 💙';
    }
    if (_devotionDays >= _totalDays) return 'أسبوع كامل مع ربنا 🎉 نعمة كبيرة، استمر!';
    if (_devotionDays / _totalDays >= 0.6) return 'أسبوع مليان بركة 👏 ربنا يثبتك ويزيدك.';
    return 'بداية كويسة! كمّل وخلّي وقتك مع ربنا ثابت كل يوم 🙏';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final summary =
        '📖 أسبوعي مع ربنا\n\n'
        '🕊️ أيام الخلوة: $_devotionDays من $_totalDays\n'
        '🔥 سلسلة الثبات: $_streak يوم\n'
        '📚 إصحاحات قريتها: $_chapters\n'
        '💭 آيات حفظتها: $_verses\n'
        '🙏 طلبات صلاة جديدة: $_prayers\n'
        '📝 تأملات كتبتها: $_reflections';

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            eyebrow: 'ملخص الأسبوع',
            title: 'أسبوعك مع ربنا',
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
                        const ScreenHero(
                          icon: Icons.insights_outlined,
                          badge: 'ملخص الأسبوع',
                          eyebrow: 'ملخص الأسبوع',
                          title: 'أسبوعك مع ربنا',
                          body: 'ملخص أسبوعي لخلوتك وقراءتك وصلواتك',
                        ),
                        Text(_range, textAlign: TextAlign.center, style: TextStyle(color: text)),
                        const SizedBox(height: 8),
                        Text(
                          _encouragement,
                          textDirection: TextDirection.rtl,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: text, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            _Tile(card, 'أيام الخلوة', '$_devotionDays / $_totalDays'),
                            _Tile(card, 'سلسلة الثبات', '$_streak يوم'),
                            _Tile(card, 'إصحاحات قرأتها', '$_chapters'),
                            _Tile(card, 'آيات حفظتها', '$_verses'),
                            _Tile(card, 'طلبات صلاة جديدة', '$_prayers'),
                            _Tile(card, 'صلوات مستجابة', '$_answered'),
                            _Tile(card, 'تأملات كتبتها', '$_reflections'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: () => Share.share(summary),
                          icon: const Icon(Icons.share_outlined),
                          label: const Text('شارك ملخص أسبوعك'),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile(this.card, this.label, this.value);
  final Color card;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.accent)),
          const SizedBox(height: 4),
          Text(label, textDirection: TextDirection.rtl, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
