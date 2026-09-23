// ─── DevotionCalendarScreen ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../features/journal/devotion_service.dart';
import '../home/home_screen.dart';
import '../../widgets/screen_hero.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../widgets/app_header.dart';

class DevotionCalendarScreen extends StatefulWidget {
  const DevotionCalendarScreen({super.key});
  @override
  State<DevotionCalendarScreen> createState() => _DevotionCalendarState();
}

class _DevotionCalendarState extends State<DevotionCalendarScreen> {
  final _service = DevotionService();
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  Map<String, bool> _days = {};
  Map<String, String> _readings = {};
  int _streak = 0;
  DateTime? _selected;
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final days = await _service.month(_month);
      final logs = await _service.completedLogs();
      final readings = <String, String>{};
      for (final log in logs) {
        final date = log['date']?.toString();
        final reading = formatReadingEntries(log);
        if (date == null || reading.isEmpty) continue;
        readings[date] = reading;
      }
      if (mounted) {
        setState(() {
          _days = days;
          _readings = readings;
          _streak = computeStreak(logs.map((log) => '${log['date']}'));
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
      if (DevotionService.dateKey(date) == DevotionService.dateKey(DateTime.now())) {
        await DevotionSchedule.ensure(startTomorrow: picked.completed);
      }
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('تعذر الحفظ. لم تتغير حالة اليوم؛ حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final count = DateTime(_month.year, _month.month + 1, 0).day;
    final offset = _month.weekday % 7;
    return Scaffold(
      body: SafeArea(
          top: false,
          child: Column(
            children: [
              AppHeader(
                title: 'متابعة وقتك مع الله',
                onBack: () => Navigator.of(context).maybePop(),
              ),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                IconButton(
                    onPressed: _busy
                        ? null
                        : () {
                            _month = DateTime(_month.year, _month.month - 1);
                            _load();
                          },
                    icon: const Icon(Icons.chevron_right)),
                Text(DateFormat.yMMMM('ar').format(_month)),
                IconButton(
                    onPressed: _busy
                        ? null
                        : () {
                            _month = DateTime(_month.year, _month.month + 1);
                            _load();
                          },
                    icon: const Icon(Icons.chevron_left)),
              ]),
              if (_busy) const LinearProgressIndicator(),
              if (_error != null)
                Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(children: [
                      Text(_error!),
                      TextButton(
                          onPressed: _load, child: const Text('إعادة المحاولة'))
                    ])),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: ScreenHero(
                  icon: Icons.calendar_month_outlined,
                  badge: 'ثبات يومي',
                  eyebrow: 'متابعة وقتك مع الله',
                  title: 'كل يوم "نعم" يترك أثرًا هنا',
                  body:
                      'التقويم يوضح أيام التزامك بالخلوة، ويساعدك ترى الاستمرارية بشكل بصري وواضح.',
                ),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                        child: Text('الثبات الحالي\n$_streak',
                            textAlign: TextAlign.center)),
                    Expanded(
                        child: Text(
                            'هذا الشهر\n${_days.values.where((value) => value).length}',
                            textAlign: TextAlign.center)),
                  ],
                ),
              ),
              if (_selected != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('تفاصيل اليوم',
                          textAlign: TextAlign.right,
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      Text(
                        _days[DevotionService.dateKey(_selected!)] == true
                            ? (_readings[DevotionService.dateKey(_selected!)] ??
                                'بدون تفاصيل قراءة')
                            : 'مفيش تسجيل خلوة في اليوم ده.',
                        textAlign: TextAlign.right,
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => _toggle(_selected!),
                          child: Text(
                              _days[DevotionService.dateKey(_selected!)] == true
                                  ? 'ماخدتش خلوتك'
                                  : 'تسجيل خلوة'),
                        ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                  child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7),
                itemCount: count + offset + 7,
                itemBuilder: (context, index) {
                  if (index < 7) {
                    return Center(
                        child: Text(
                            const ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'][index],
                            style: const TextStyle(fontSize: 10)));
                  }
                  final day = index - 7 - offset + 1;
                  if (day < 1) return const SizedBox.shrink();
                  final date = DateTime(_month.year, _month.month, day);
                  final completed =
                      _days[DevotionService.dateKey(date)] == true;
                  return TextButton(
                    onPressed:
                        _busy || _error != null || date.isAfter(DateTime.now())
                            ? null
                            : () => setState(() => _selected = date),
                    style: TextButton.styleFrom(
                        backgroundColor:
                            completed ? const Color(0xFF78A1BD) : null,
                        foregroundColor: completed ? Colors.white : null,
                        shape: const CircleBorder()),
                    child: Text('$day'),
                  );
                },
              )),
            ],
          )),
    );
  }
}
