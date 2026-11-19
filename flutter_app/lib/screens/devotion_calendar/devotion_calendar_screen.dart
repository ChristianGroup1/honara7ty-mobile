import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../home/home_screen.dart';

const _weekLabels = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
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

class DevotionCalendarScreen extends StatefulWidget {
  const DevotionCalendarScreen({
    super.key,
    this.subjectUserId,
    this.subjectName,
  });

  /// Null means the signed-in member. Another id opens that member's calendar.
  final String? subjectUserId;
  final String? subjectName;

  @override
  State<DevotionCalendarScreen> createState() => _DevotionCalendarState();
}

class _DevotionCalendarState extends State<DevotionCalendarScreen> {
  final _service = DevotionService();
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  Map<String, bool> _days = {};
  Map<String, String> _readings = {};
  int _streak = 0;
  int _total = 0;
  DateTime? _selected;
  var _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selected = DateTime(now.year, now.month, now.day);
    _load();
  }

  bool get _ownCalendar {
    final subject = widget.subjectUserId;
    if (subject == null || subject.isEmpty) return true;
    try {
      return subject == _service.userId;
    } catch (_) {
      return false;
    }
  }

  String? get _subjectName {
    final name = widget.subjectName?.trim();
    if (name == null || name.isEmpty) return null;
    return name;
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_ownCalendar) {
        final days = await _service.month(_month);
        final logs = await _service.completedLogs();
        final readings = <String, String>{};
        for (final log in logs) {
          final date = log['date']?.toString();
          final reading = formatReadingEntries(log);
          if (date == null || reading.isEmpty) continue;
          readings[date] = reading;
        }
        if (!mounted) return;
        setState(() {
          _days = days;
          _readings = readings;
          _streak = computeStreak(logs.map((log) => '${log['date']}'));
          _total = logs.length;
        });
      } else {
        final logs = await DevotionGroupsService()
            .memberDevotionLogs(widget.subjectUserId!);
        final prefix =
            '${_month.year}-${_month.month.toString().padLeft(2, '0')}-';
        final days = <String, bool>{};
        final readings = <String, String>{};
        final completedDates = <String>[];
        for (final log in logs) {
          final date = log['date']?.toString();
          if (date == null || date.isEmpty) continue;
          if (date.startsWith(prefix)) days[date] = log['completed'] == true;
          final reading = formatReadingEntries(log);
          if (reading.isNotEmpty) readings[date] = reading;
          if (log['completed'] == true) completedDates.add(date);
        }
        if (!mounted) return;
        setState(() {
          _days = days;
          _readings = readings;
          _streak = computeStreak(completedDates);
          _total = completedDates.length;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() =>
            _error = 'تعذر تحميل التقويم. تحقق من الاتصال ثم أعد المحاولة.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _shiftMonth(int delta) {
    if (_busy) return;
    setState(() {
      _month = DateTime(_month.year, _month.month + delta);
      final now = DateTime.now();
      if (_month.year == now.year && _month.month == now.month) {
        _selected = DateTime(now.year, now.month, now.day);
      } else {
        _selected = null;
      }
    });
    _load();
  }

  Future<void> _toggle(DateTime date) async {
    final picked = await showDevotionDayPicker(context);
    if (picked == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await _service.saveDay(
        date: date,
        completed: picked.completed,
        readings: picked.completed ? picked.readings : null,
      );
      if (DevotionService.dateKey(date) ==
          DevotionService.dateKey(DateTime.now())) {
        await DevotionSchedule.ensure(startTomorrow: picked.completed);
      }
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تعذر الحفظ. لم تتغير حالة اليوم؛ حاول مجددًا.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  int get _monthCompleted => _days.values.where((value) => value).length;

  /// Saturday-first offset for the calendar grid.
  int get _offset => (_month.weekday % 7 + 1) % 7;

  int get _daysInMonth => DateTime(_month.year, _month.month + 1, 0).day;

  String get _monthLabel {
    try {
      return DateFormat.yMMMM('ar').format(_month);
    } catch (_) {
      final year = NumberFormat('#', 'ar').format(_month.year);
      return '${_monthsAr[_month.month - 1]} $year';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          Column(
            children: [
              _CalendarHeader(
                dark: isDark,
                onBack: () => Navigator.of(context).maybePop(),
                eyebrow: _ownCalendar ? 'سجل الأمانة والنمو' : 'تقويم الخلوة',
                title: _ownCalendar || _subjectName == null
                    ? AppStrings.devotionCalendarTitle
                    : _subjectName!,
              ),
              Expanded(
                child: _busy && _days.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    _error!,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontFamily: AppFonts.ui,
                                      color: isDark
                                          ? AppColors.darkMutedText
                                          : const Color(0xFF64748B),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  TextButton(
                                    onPressed: _load,
                                    child: const Text('إعادة المحاولة'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                            children: [
                              _HeroCard(
                                dark: isDark,
                                kicker: _ownCalendar
                                    ? 'متابعة وقتك مع الله'
                                    : 'متابعة الخلوة',
                                title: _ownCalendar
                                    ? 'كل يوم "نعم" يترك أثرًا هنا'
                                    : 'تقويم ${_subjectName ?? 'العضو'}',
                                body: _ownCalendar
                                    ? 'التقويم يوضح أيام التزامك بالخلوة، ويساعدك ترى الاستمرارية بشكل بصري وواضح.'
                                    : 'شوف أيام التزام ${_subjectName ?? 'العضو'} بالخلوة. تسجيل اليوم متاح لصاحب الحساب فقط.',
                                footer: _ownCalendar
                                    ? 'الأيام الخضراء تعني أنك أكملت الخلوة في هذا اليوم'
                                    : 'الأيام الخضراء تعني إن الخلوة اتسجلت في اليوم ده',
                              ),
                              const SizedBox(height: 16),
                              _MetricsRow(
                                dark: isDark,
                                streak: _streak,
                                monthCount: _monthCompleted,
                                total: _total,
                              ),
                              const SizedBox(height: 16),
                              _CalendarCard(
                                dark: isDark,
                                monthLabel: _monthLabel,
                                busy: _busy,
                                offset: _offset,
                                daysInMonth: _daysInMonth,
                                month: _month,
                                days: _days,
                                selected: _selected,
                                onPrev: () => _shiftMonth(-1),
                                onNext: () => _shiftMonth(1),
                                onSelect: (date) =>
                                    setState(() => _selected = date),
                              ),
                              if (_selected != null) ...[
                                const SizedBox(height: 16),
                                _DayDetailCard(
                                  dark: isDark,
                                  date: _selected!,
                                  completed: _days[DevotionService.dateKey(
                                        _selected!,
                                      )] ==
                                      true,
                                  reading: _readings[DevotionService.dateKey(
                                    _selected!,
                                  )],
                                  busy: _busy,
                                  onLog: _ownCalendar
                                      ? () => _toggle(_selected!)
                                      : null,
                                ),
                              ],
                            ],
                          ),
              ),
            ],
          ),
          if (_busy && _days.isNotEmpty)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(minHeight: 2),
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

class _CalendarHeader extends StatelessWidget {
  const _CalendarHeader({
    required this.dark,
    required this.onBack,
    required this.eyebrow,
    required this.title,
  });

  final bool dark;
  final VoidCallback onBack;
  final String eyebrow;
  final String title;

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
                  border: Border.all(color: border.withValues(alpha: 0.8)),
                ),
                child: Icon(
                  Icons.arrow_back_rounded,
                  size: 20,
                  color: titleColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  title,
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
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: dark
                  ? const Color(0xFF064E3B).withValues(alpha: 0.35)
                  : const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: dark
                    ? const Color(0xFF10B981).withValues(alpha: 0.3)
                    : const Color(0xFFD1FAE5),
              ),
            ),
            child: Icon(
              Icons.calendar_month_rounded,
              size: 20,
              color: dark ? const Color(0xFF34D399) : const Color(0xFF059669),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.dark,
    required this.kicker,
    required this.title,
    required this.body,
    required this.footer,
  });

  final bool dark;
  final String kicker;
  final String title;
  final String body;
  final String footer;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: dark
              ? const [
                  Color(0xFF0F172A),
                  Color(0xFF1E293B),
                  Color(0xFF1E1B4B),
                ]
              : const [
                  Color(0xFF0F172A),
                  Color(0xFF1E293B),
                  Color(0xFF1E1B4B),
                ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      size: 12,
                      color: Color(0xFFFCD34D),
                    ),
                    SizedBox(width: 6),
                    Text(
                      'ثبات يومي',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFFCD34D),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  size: 20,
                  color: Color(0xFFFCD34D),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            kicker,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFFCBD5E1),
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Color(0xFFCBD5E1),
              height: 1.55,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: Colors.white.withValues(alpha: 0.10),
                ),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.stars_rounded,
                  size: 16,
                  color: Color(0xFFFCD34D),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    footer,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFFCD34D),
                    ),
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

class _MetricsRow extends StatelessWidget {
  const _MetricsRow({
    required this.dark,
    required this.streak,
    required this.monthCount,
    required this.total,
  });

  final bool dark;
  final int streak;
  final int monthCount;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _MetricTile(
            dark: dark,
            icon: Icons.local_fire_department_rounded,
            iconBg: dark
                ? const Color(0xFF78350F).withValues(alpha: 0.4)
                : const Color(0xFFFFFBEB),
            iconColor: const Color(0xFFD97706),
            value: '$streak',
            label: 'الثبات الحالي',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricTile(
            dark: dark,
            icon: Icons.event_note_rounded,
            iconBg: dark
                ? const Color(0xFF064E3B).withValues(alpha: 0.4)
                : const Color(0xFFECFDF5),
            iconColor: const Color(0xFF059669),
            value: '$monthCount',
            label: 'هذا الشهر',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricTile(
            dark: dark,
            icon: Icons.verified_rounded,
            iconBg: dark
                ? const Color(0xFF0C4A6E).withValues(alpha: 0.4)
                : const Color(0xFFF0F9FF),
            iconColor: const Color(0xFF0284C7),
            value: '$total',
            label: 'الإجمالي',
          ),
        ),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.dark,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.value,
    required this.label,
  });

  final bool dark;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final valueColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final labelColor = dark ? AppColors.darkMutedText : const Color(0xFF64748B);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: valueColor,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: labelColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({
    required this.dark,
    required this.monthLabel,
    required this.busy,
    required this.offset,
    required this.daysInMonth,
    required this.month,
    required this.days,
    required this.selected,
    required this.onPrev,
    required this.onNext,
    required this.onSelect,
  });

  final bool dark;
  final String monthLabel;
  final bool busy;
  final int offset;
  final int daysInMonth;
  final DateTime month;
  final Map<String, bool> days;
  final DateTime? selected;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF94A3B8);
    final navBg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final cells = offset + daysInMonth;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
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
              Icon(
                Icons.calendar_today_rounded,
                size: 18,
                color: dark ? const Color(0xFF34D399) : const Color(0xFF059669),
              ),
              const SizedBox(width: 6),
              Text(
                'تقويم الالتزام',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
              ),
              const Spacer(),
              Text(
                'تنقّل بين الشهور وشاهد الأيام',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: navBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: border.withValues(alpha: 0.8),
              ),
            ),
            child: Row(
              children: [
                _NavChip(
                  dark: dark,
                  icon: Icons.chevron_left_rounded,
                  onTap: busy ? null : onNext,
                ),
                Expanded(
                  child: Text(
                    monthLabel,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                    ),
                  ),
                ),
                _NavChip(
                  dark: dark,
                  icon: Icons.chevron_right_rounded,
                  onTap: busy ? null : onPrev,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Legend(dark: dark),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: border)),
            ),
            child: Row(
              children: [
                for (final label in _weekLabels)
                  Expanded(
                    child: Text(
                      label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: muted,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cells,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
            ),
            itemBuilder: (context, index) {
              if (index < offset) return const SizedBox.shrink();
              final day = index - offset + 1;
              final date = DateTime(month.year, month.month, day);
              final key = DevotionService.dateKey(date);
              final completed = days[key] == true;
              final isToday = date == today;
              final isFuture = date.isAfter(today);
              final isSelected =
                  selected != null && DevotionService.dateKey(selected!) == key;

              return _DayCell(
                day: day,
                completed: completed,
                isToday: isToday,
                isFuture: isFuture,
                isSelected: isSelected,
                dark: dark,
                onTap: busy || isFuture ? null : () => onSelect(date),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _NavChip extends StatelessWidget {
  const _NavChip({
    required this.dark,
    required this.icon,
    required this.onTap,
  });

  final bool dark;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final bg = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final color = dark ? AppColors.darkText : const Color(0xFF334155);

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border.withValues(alpha: 0.7)),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.dark});

  final bool dark;

  @override
  Widget build(BuildContext context) {
    final textColor = dark ? AppColors.darkMutedText : const Color(0xFF475569);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF94A3B8);

    Widget item(Widget swatch, String label, {Color? color}) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          swatch,
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color ?? textColor,
            ),
          ),
        ],
      );
    }

    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      spacing: 8,
      runSpacing: 6,
      children: [
        item(
          Container(
            width: 12,
            height: 12,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
          'مكتمل',
        ),
        item(
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: dark ? AppColors.darkBorder : const Color(0xFFE2E8F0),
              shape: BoxShape.circle,
            ),
          ),
          'ماخدتش خلوتك',
        ),
        item(
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: dark ? AppColors.darkCard : Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF6366F1), width: 2),
            ),
          ),
          'اليوم',
        ),
        item(
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: dark ? AppColors.darkCardMuted : const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
          ),
          'باقي الأيام',
          color: muted,
        ),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.completed,
    required this.isToday,
    required this.isFuture,
    required this.isSelected,
    required this.dark,
    required this.onTap,
  });

  final int day;
  final bool completed;
  final bool isToday;
  final bool isFuture;
  final bool isSelected;
  final bool dark;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Border? border;
    List<BoxShadow>? shadow;

    if (isToday) {
      bg = const Color(0xFF0F172A);
      fg = Colors.white;
      border = Border.all(color: const Color(0xFF6366F1), width: 2);
      shadow = [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.12),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];
    } else if (completed) {
      bg = dark
          ? const Color(0xFF064E3B).withValues(alpha: 0.35)
          : const Color(0xFFECFDF5);
      fg = dark ? const Color(0xFF6EE7B7) : const Color(0xFF065F46);
      border = Border.all(
        color: dark
            ? const Color(0xFF10B981).withValues(alpha: 0.35)
            : const Color(0xFFA7F3D0),
      );
    } else if (isFuture) {
      bg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
      fg = dark ? AppColors.darkMutedText : const Color(0xFF94A3B8);
    } else {
      bg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
      fg = dark ? AppColors.darkMutedText : const Color(0xFF64748B);
    }

    if (isSelected && !isToday) {
      border = Border.all(color: const Color(0xFF6366F1), width: 1.5);
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(16),
            border: border,
            boxShadow: shadow,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$day',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: isToday ? FontWeight.w900 : FontWeight.w700,
                  color: fg,
                ),
              ),
              if (completed && !isToday)
                Icon(
                  Icons.check_rounded,
                  size: 12,
                  color:
                      dark ? const Color(0xFF34D399) : const Color(0xFF059669),
                )
              else if (isToday)
                Container(
                  width: 4,
                  height: 4,
                  margin: const EdgeInsets.only(top: 2),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFBBF24),
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DayDetailCard extends StatelessWidget {
  const _DayDetailCard({
    required this.dark,
    required this.date,
    required this.completed,
    required this.reading,
    required this.busy,
    required this.onLog,
  });

  final bool dark;
  final DateTime date;
  final bool completed;
  final String? reading;
  final bool busy;
  final VoidCallback? onLog;

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF94A3B8);
    final dateLabel = DevotionService.dateKey(date);
    final isToday = dateLabel == DevotionService.dateKey(DateTime.now());

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      dateLabel,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: muted,
                      ),
                    ),
                    Text(
                      'تفاصيل اليوم المحدد',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: titleColor,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: completed
                      ? (dark
                          ? const Color(0xFF064E3B).withValues(alpha: 0.4)
                          : const Color(0xFFECFDF5))
                      : (dark
                          ? const Color(0xFF881337).withValues(alpha: 0.35)
                          : const Color(0xFFFFF1F2)),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: completed
                        ? (dark
                            ? const Color(0xFF10B981).withValues(alpha: 0.35)
                            : const Color(0xFFD1FAE5))
                        : (dark
                            ? const Color(0xFFF43F5E).withValues(alpha: 0.35)
                            : const Color(0xFFFFE4E6)),
                  ),
                ),
                child: Text(
                  completed ? 'مكتمل' : 'غير مسجل',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: completed
                        ? (dark
                            ? const Color(0xFF6EE7B7)
                            : const Color(0xFF047857))
                        : (dark
                            ? const Color(0xFFFDA4AF)
                            : const Color(0xFFBE123C)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Text(
              completed
                  ? (reading?.isNotEmpty == true
                      ? reading!
                      : 'خلوة مسجّلة بدون تفاصيل قراءة.')
                  : 'مفيش تسجيل خلوة في اليوم ده.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: dark ? AppColors.darkMutedText : const Color(0xFF64748B),
                height: 1.5,
              ),
            ),
          ),
          if (onLog != null) ...[
            const SizedBox(height: 12),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: busy ? null : onLog,
                borderRadius: BorderRadius.circular(16),
                child: Ink(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF0EA5E9),
                        Color(0xFF4F46E5),
                        Color(0xFF4338CA),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.22),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.edit_calendar_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          completed
                              ? 'تعديل تسجيل الخلوة'
                              : (isToday ? 'تسجيل خلوة اليوم' : 'تسجيل خلوة'),
                          style: const TextStyle(
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
          ],
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
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
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
            textDirection: ui.TextDirection.rtl,
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
