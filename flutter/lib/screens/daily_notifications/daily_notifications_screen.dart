import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';
import '../../features/focus/focus_mode.dart';
import '../../features/reminders/devotion_reminder.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

class DailyNotificationsScreen extends StatefulWidget {
  const DailyNotificationsScreen({super.key, this.showBack = true});

  final bool showBack;

  @override
  State<DailyNotificationsScreen> createState() => _DailyNotificationsScreenState();
}

class _DailyNotificationsScreenState extends State<DailyNotificationsScreen> {
  static const _tips = [
    'اختر وقتاً هادئاً في الصباح الباكر قبل بداية اليوم.',
    'اختر مكاناً هادئاً بعيداً عن الضوضاء والمشتتات.',
    'ابدأ بقراءة الكتاب المقدس ثم الصلاة والتأمل.',
    'أبعد هاتفك أثناء وقتك مع الله وركّز على الحضور الإلهي.',
    'حتى 15 دقيقة يومياً كافية للبدء، الاستمرارية هي المفتاح.',
  ];

  TimeOfDay _time = const TimeOfDay(hour: 7, minute: 0);
  var _loading = true;
  var _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;
      final data = await supabase
          .from('profiles')
          .select('devotion_time')
          .eq('id', userId)
          .maybeSingle();
      final raw = data?['devotion_time'] as String?;
      if (raw != null && raw.contains(':')) {
        final parts = raw.split(':');
        _time = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
      }
    } catch (_) {
      // Keep the default morning time when the profile cannot be read.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String get _label =>
      '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

  Future<void> _pick() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _save() async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _saving = true);
    try {
      final synced = await OfflineSync.saveProfile(userId, {'devotion_time': _label});
      await DevotionReminder.instance.scheduleDaily(
        hour: _time.hour,
        minute: _time.minute,
      );
      if (await FocusMode.preference() == FocusModePreference.automatic) {
        await FocusMode.schedule(_time.hour, _time.minute);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(synced ? 'تم حفظ وقتك مع الله: $_label' : offlineSavedMessage),
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر حفظ الموعد')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: 'وقتك مع الله كل يوم',
            onBack: widget.showBack ? () => Navigator.of(context).maybePop() : null,
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: card,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'خصص لحظة ثابتة كل يوم',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'الموعد المحفوظ يفضل على حسابك. تفعيل إشعار الجهاز نفسه لسه خطوة منفصلة.',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(color: muted),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _label,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppColors.accent,
                                fontSize: 40,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton(onPressed: _pick, child: const Text('تعديل الموعد')),
                            const SizedBox(height: 8),
                            FilledButton(
                              onPressed: _saving ? null : _save,
                              child: Text(_saving ? 'جارٍ الحفظ...' : 'حفظ الموعد'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      ListTile(
                        tileColor: card,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        title: const Text('خطة القراءة', textDirection: TextDirection.rtl, textAlign: TextAlign.right),
                        subtitle: const Text('اختَر سفرًا وعدد الإصحاحات اليومية', textDirection: TextDirection.rtl, textAlign: TextAlign.right),
                        trailing: const Icon(Icons.chevron_left),
                        onTap: () => context.push(Routes.readingPlanSuggestions),
                      ),
                      const SizedBox(height: 18),
                      Text('نصائح لوقت هادئ مع الله', textDirection: TextDirection.rtl, style: TextStyle(color: text, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      for (var i = 0; i < _tips.length; i++)
                        Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: card,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            '${i + 1}. ${_tips[i]}',
                            textDirection: TextDirection.rtl,
                            style: TextStyle(color: text, height: 1.5),
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
