import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/journal/prayer_notes_service.dart';
import '../../features/journal/reflections_service.dart';
import '../../features/memorization/memorization_service.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';

const _dayLabels = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const _monthsAr = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

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
  var _reflections = 0;
  var _verses = 0;
  var _rangeLabel = '';
  var _topBook = '';
  final _completedDays = List<bool>.filled(7, false);

  @override
  void initState() {
    super.initState();
    _load();
  }

  /// Current calendar week: Sunday → Saturday.
  static DateTime _weekStartOnSunday(DateTime day) {
    final date = DateTime(day.year, day.month, day.day);
    // Dart weekday: Mon=1 … Sun=7 → days since Sunday = weekday % 7.
    return date.subtract(Duration(days: date.weekday % 7));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final today = DateTime(DateTime.now().year, DateTime.now().month,
        DateTime.now().day);
    final start = _weekStartOnSunday(today);
    final end = start.add(const Duration(days: 6)); // Saturday
    final startKey = DevotionService.dateKey(start);
    final endKey = DevotionService.dateKey(end);
    bool inWeek(String iso) =>
        iso.compareTo(startKey) >= 0 && iso.compareTo(endKey) <= 0;

    try {
      final logs = await DevotionService().completedLogs();
      final dates = logs.map((log) => log['date'] as String).toList();
      final weekLogs =
          logs.where((log) => inWeek(log['date'] as String)).toList();
      final weekDateSet = {
        for (final log in weekLogs) log['date'] as String,
      };
      final completed = List<bool>.generate(7, (i) {
        final day = start.add(Duration(days: i));
        return weekDateSet.contains(DevotionService.dateKey(day));
      });

      final bookCounts = <String, int>{};
      for (final log in weekLogs) {
        for (final entry in readingEntriesFromLog(log)) {
          bookCounts[entry.book] = (bookCounts[entry.book] ?? 0) + 1;
        }
      }
      var topBook = '';
      if (bookCounts.isNotEmpty) {
        topBook = bookCounts.entries
            .reduce((a, b) => a.value >= b.value ? a : b)
            .key;
      }

      final prayers = await PrayerNotesService().load();
      final reflections = await ReflectionsService().load();
      final attempts = await MemorizationService().load();
      if (!mounted) return;
      setState(() {
        _totalDays = 7;
        _devotionDays = weekDateSet.length;
        _streak = computeStreak(dates);
        _chapters = weekLogs.fold(0, (sum, log) => sum + chaptersInLog(log));
        _prayers = prayers
            .where(
              (note) => inWeek(DevotionService.dateKey(note.createdAt)),
            )
            .length;
        _reflections =
            reflections.where((entry) => inWeek(entry.date)).length;
        _verses = attempts
            .where(
              (attempt) =>
                  inWeek(DevotionService.dateKey(attempt.createdAt)),
            )
            .fold(0, (sum, attempt) => sum + attempt.verses.length);
        _rangeLabel = _formatRange(start, end);
        _topBook = topBook;
        for (var i = 0; i < 7; i++) {
          _completedDays[i] = completed[i];
        }
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

  String _formatRange(DateTime start, DateTime end) {
    if (start.month == end.month && start.year == end.year) {
      return '${start.day} — ${end.day} ${_monthsAr[end.month - 1]}';
    }
    return '${start.day} ${_monthsAr[start.month - 1]} — ${end.day} ${_monthsAr[end.month - 1]}';
  }

  double get _progress =>
      _totalDays == 0 ? 0 : (_devotionDays / _totalDays).clamp(0.0, 1.0);

  String get _ratingLabel {
    if (_devotionDays == 0) return 'تقييم الأسبوع: فرصة جديدة';
    if (_devotionDays >= 7) return 'تقييم الأسبوع: أسبوع كامل';
    if (_devotionDays >= 4) return 'تقييم الأسبوع: مليان بركة';
    return 'تقييم الأسبوع: خطوة مباركة';
  }

  String get _encouragement {
    if (_devotionDays == 0) {
      return 'كل يوم فرصة جديدة تبدأ فيها وقتك مع ربنا. ابدأ النهارده';
    }
    if (_devotionDays >= 7) {
      return 'أسبوع كامل مع ربنا! نعمة كبيرة، استمر';
    }
    if (_devotionDays >= 4) {
      return 'أسبوع مليان بركة. ربنا يثبتك ويزيدك';
    }
    return 'بداية كويسة! كمّل وخلّي وقتك مع ربنا ثابت';
  }

  String get _encouragementBody {
    if (_devotionDays == 0) {
      return 'ابدأ خلوتك النهاردة ولو بدقيقة قراءة وصلاة.';
    }
    return 'كل لحظة تسليم وصلاة في خلوتك بتفتح باب للبركة والسلام في بيتك ويومك.';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final pct = (_progress * 100).round();
    final summary = '📖 أسبوعي مع ربنا\n\n'
        '🕊️ أيام الخلوة: $_devotionDays من $_totalDays\n'
        '🔥 سلسلة الثبات: $_streak يوم\n'
        '📚 إصحاحات قريتها: $_chapters\n'
        '💭 آيات حفظتها: $_verses\n'
        '🙏 طلبات صلاة جديدة: $_prayers\n'
        '📝 تأملات كتبتها: $_reflections\n'
        '📅 $_rangeLabel';

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          _WeeklyHeader(
            dark: isDark,
            rangeLabel: _rangeLabel,
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    color: AppColors.champagne,
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                      children: [
                        _HeroCard(
                          rating: _ratingLabel,
                          title: _encouragement,
                          body: _encouragementBody,
                          completedDays: _completedDays,
                          devotionDays: _devotionDays,
                          totalDays: _totalDays,
                          percent: pct,
                        ),
                        const SizedBox(height: 14),
                        // Primary row
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: _DevotionDaysCard(
                                days: _devotionDays,
                                total: _totalDays,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _StreakCard(streak: _streak),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Chapters + verses
                        Row(
                          children: [
                            Expanded(
                              child: _StatCard(
                                icon: Icons.menu_book_rounded,
                                iconBg: const Color(0xFFECFDF5),
                                iconColor: const Color(0xFF059669),
                                badge: _chapters > 0
                                    ? '+$_chapters أصحاح'
                                    : 'القراءة',
                                badgeColor: const Color(0xFF059669),
                                badgeBg: const Color(0xFFECFDF5),
                                value: '$_chapters',
                                label: 'إصحاحات قرأتها',
                                hint: _topBook.isEmpty
                                    ? 'من كلمتك هذا الأسبوع'
                                    : 'من سفر $_topBook',
                                hintColor: const Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _StatCard(
                                icon: Icons.psychology_rounded,
                                iconBg: const Color(0xFFFAF5FF),
                                iconColor: const Color(0xFF9333EA),
                                badge: 'الحفظ',
                                badgeColor: const Color(0xFF94A3B8),
                                badgeBg: const Color(0xFFF8FAFC),
                                value: '$_verses',
                                label: 'آيات حفظتها',
                                hint: _verses == 0
                                    ? 'احفظ آية الأسبوع'
                                    : 'استمر في الحفظ',
                                hintColor: const Color(0xFF9333EA),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Prayers + reflections
                        Row(
                          children: [
                            Expanded(
                              child: _StatCard(
                                icon: Icons.volunteer_activism_rounded,
                                iconBg: const Color(0xFFEEF2FF),
                                iconColor: const Color(0xFF4F46E5),
                                badge: 'الطلبات',
                                badgeColor: const Color(0xFF94A3B8),
                                badgeBg: const Color(0xFFF8FAFC),
                                value: '$_prayers',
                                label: 'طلبات صلاة جديدة',
                                hint: 'صلوات مسجلة',
                                hintColor: const Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _StatCard(
                                icon: Icons.edit_note_rounded,
                                iconBg: const Color(0xFFFFF1F2),
                                iconColor: const Color(0xFFE11D48),
                                badge: 'اليوميات',
                                badgeColor: const Color(0xFF94A3B8),
                                badgeBg: const Color(0xFFF8FAFC),
                                value: '$_reflections',
                                label: 'تأملات كتبتها',
                                hint: 'خواطر الروح',
                                hintColor: const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _TipCard(
                          onTap: () =>
                              context.push(Routes.dailyNotifications),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              gradient: const LinearGradient(
                                colors: [
                                  Color(0xFF0EA5E9),
                                  Color(0xFF4F46E5),
                                  Color(0xFF4338CA),
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0EA5E9)
                                      .withValues(alpha: 0.25),
                                  blurRadius: 16,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => Share.share(summary),
                                borderRadius: BorderRadius.circular(16),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 16),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.share_rounded,
                                          color: Colors.white, size: 20),
                                      SizedBox(width: 8),
                                      Text(
                                        'شارك ملخص أسبوعك مع أصحابك',
                                        style: TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
      bottomNavigationBar: _AppTabBar(
        isDark: isDark,
        currentIndex: -1,
        onTap: (index) => context.go('${Routes.mainTabs}?tab=$index'),
      ),
    );
  }
}

class _WeeklyHeader extends StatelessWidget {
  const _WeeklyHeader({
    required this.dark,
    required this.rangeLabel,
    required this.onBack,
  });

  final bool dark;
  final String rangeLabel;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final chipBg = dark ? AppColors.darkCardMuted : Colors.white;

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: surface.withValues(alpha: 0.88),
        border: Border(bottom: BorderSide(color: border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Material(
            color: chipBg,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: onBack,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: border.withValues(alpha: 0.8),
                  ),
                ),
                child: Icon(Icons.arrow_back_rounded,
                    size: 20, color: titleColor),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'حصاد النعمة',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFD97706),
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                Text(
                  AppStrings.moreWeeklyReportTitle,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: titleColor,
                  ),
                ),
              ],
            ),
          ),
          if (rangeLabel.isNotEmpty)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.event_repeat_rounded,
                      size: 14, color: Color(0xFFFBBF24)),
                  const SizedBox(width: 5),
                  Text(
                    rangeLabel,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.rating,
    required this.title,
    required this.body,
    required this.completedDays,
    required this.devotionDays,
    required this.totalDays,
    required this.percent,
  });

  final String rating;
  final String title;
  final String body;
  final List<bool> completedDays;
  final int devotionDays;
  final int totalDays;
  final int percent;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF0F172A)],
        ),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.18),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: -40,
            right: -40,
            child: Container(
              width: 144,
              height: 144,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.15),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.auto_awesome_rounded,
                                size: 12, color: Color(0xFFFCD34D)),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                rating,
                                style: const TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFFCD34D),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFBBF24)
                                .withValues(alpha: 0.25),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.wb_twilight_rounded,
                          color: Color(0xFF0F172A), size: 22),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFCBD5E1),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.only(top: 14),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            for (var i = 0; i < 7; i++)
                              _DayDot(
                                label: _dayLabels[i],
                                done: completedDays[i],
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$devotionDays من $totalDays أيام',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFFCD34D),
                            ),
                          ),
                          Text(
                            '$percent% مكتمل',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot({required this.label, required this.done});
  final String label;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: done
                ? const Color(0xFFFBBF24)
                : Colors.white.withValues(alpha: 0.1),
            border: done
                ? null
                : Border.all(color: Colors.white.withValues(alpha: 0.15)),
          ),
          child: Center(
            child: done
                ? const Icon(Icons.check_rounded,
                    size: 14, color: Color(0xFF0F172A))
                : Text(
                    '-',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.45),
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 9,
            fontWeight: done ? FontWeight.w700 : FontWeight.w500,
            color: done
                ? const Color(0xFFCBD5E1)
                : Colors.white.withValues(alpha: 0.45),
          ),
        ),
      ],
    );
  }
}

class _DevotionDaysCard extends StatelessWidget {
  const _DevotionDaysCard({required this.days, required this.total});
  final int days;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 160),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE0F2FE)),
                ),
                child: const Icon(Icons.event_available_rounded,
                    color: Color(0xFF0284C7), size: 20),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: const Text(
                  'هدف ٧ أيام',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0369A1),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$days',
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              Text(
                ' / $total',
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
          const Text(
            'أيام الخلوة',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (var i = 0; i < 7; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                Expanded(
                  child: Container(
                    height: 8,
                    decoration: BoxDecoration(
                      color: i < days
                          ? const Color(0xFF0EA5E9)
                          : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.streak});
  final int streak;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 160),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0x1AF59E0B), Color(0x66FFFBEB), Colors.white],
        ),
        border: Border.all(
          color: const Color(0xFFFDE68A).withValues(alpha: 0.8),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color:
                          const Color(0xFFF59E0B).withValues(alpha: 0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.local_fire_department_rounded,
                    color: Colors.white, size: 22),
              ),
              const Spacer(),
              const Text(
                'Streak',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFB45309),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '$streak ',
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF451A03),
                  ),
                ),
                const TextSpan(
                  text: 'يوم',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFB45309),
                  ),
                ),
              ],
            ),
          ),
          const Text(
            'سلسلة الثبات',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Color(0xFF78350F),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            streak > 0 ? 'سلسلتك حية، استمر!' : 'ابدأ سلسلتك من النهاردة!',
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF92400E),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.badge,
    required this.badgeColor,
    required this.badgeBg,
    required this.value,
    required this.label,
    required this.hint,
    required this.hintColor,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String badge;
  final Color badgeColor;
  final Color badgeBg;
  final String value;
  final String label;
  final String hint;
  final Color hintColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  badge,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: badgeColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            hint,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: hintColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  const _TipCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.lightbulb_rounded,
                color: Color(0xFFD97706), size: 20),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'نصيحة لتثبيت خلوتك',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                Text(
                  'حدد ميعاد ثابت صباحي لمدة ١٠ دقائق كل يوم.',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(12),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Text(
                  'ضبط التنبيه',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF334155),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Same 5-tab bar as the rest of the app.
class _AppTabBar extends StatelessWidget {
  const _AppTabBar({
    required this.isDark,
    required this.currentIndex,
    required this.onTap,
  });

  final bool isDark;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final color = isDark ? AppColors.darkCard : AppColors.lightCard;
    final inactive =
        isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    Widget item(int index, IconData active, IconData idle, String label) {
      final selected = currentIndex == index;
      final tint =
          selected ? (isDark ? AppColors.gold : AppColors.navy) : inactive;
      return Expanded(
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => onTap(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: selected
                    ? (isDark
                        ? AppColors.darkCardMuted
                        : AppColors.lightCardMuted)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(selected ? active : idle, color: tint, size: 21),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      color: tint,
                      fontSize: 10,
                      height: 1.25,
                      fontWeight:
                          selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(color: border),
            boxShadow: AppShadows.card,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
                                          item(0, Icons.home_rounded, Icons.home_outlined,
                  AppStrings.navHome),
              item(1, Icons.menu_book_rounded, Icons.menu_book_outlined,
                  AppStrings.navBible),
              item(
                2,
                Icons.notifications_active_rounded,
                Icons.notifications_none_rounded,
                AppStrings.navSettings,
              ),
              item(3, Icons.more_horiz_rounded, Icons.more_horiz_rounded,
                  AppStrings.navMore),
            ],
          ),
        ),
      ),
    );
  }
}
