// ─── More Screen ─────────────────────────────────────────────────────────────
// Mirrors components/more/MoreScreen.tsx

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/supabase_service.dart';
import '../../features/focus/focus_mode.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  static const _items = [
    (
      route: Routes.devotionGuide,
      icon: Icons.psychology_outlined,
      title: AppStrings.moreDevotionGuideTitle,
      subtitle: AppStrings.moreDevotionGuideSubtitle,
      color: Color(0xFF4A90D9),
    ),
    (
      route: Routes.aboutIdea,
      icon: Icons.lightbulb_outline_rounded,
      title: AppStrings.moreAboutIdeaTitle,
      subtitle: AppStrings.moreAboutIdeaSubtitle,
      color: Color(0xFFD97B29),
    ),
    (
      route: Routes.bibleMemorization,
      icon: Icons.psychology_rounded,
      title: AppStrings.moreBibleMemorizationTitle,
      subtitle: AppStrings.moreBibleMemorizationSubtitle,
      color: Color(0xFF1A7A7A),
    ),
    (
      route: Routes.lockScreenVerse,
      icon: Icons.image_outlined,
      title: AppStrings.moreLockScreenVerseTitle,
      subtitle: AppStrings.moreLockScreenVerseSubtitle,
      color: AppColors.accent,
    ),
    (
      route: Routes.badges,
      icon: Icons.emoji_events_outlined,
      title: AppStrings.moreBadgesTitle,
      subtitle: AppStrings.moreBadgesSubtitle,
      color: AppColors.accent,
    ),
    (
      route: Routes.devotionCalendar,
      icon: Icons.calendar_month_outlined,
      title: AppStrings.moreDevotionCalendarTitle,
      subtitle: AppStrings.moreDevotionCalendarSubtitle,
      color: Color(0xFF2E8B57),
    ),
    (
      route: Routes.weeklyReport,
      icon: Icons.insights_outlined,
      title: AppStrings.moreWeeklyReportTitle,
      subtitle: AppStrings.moreWeeklyReportSubtitle,
      color: Color(0xFF7B5CD6),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isNightMode;
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
          AppHeader(title: AppStrings.moreTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Night mode toggle.
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
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
                          color: AppColors.accent,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Icon(
                          isDark
                              ? Icons.nightlight_round
                              : Icons.wb_sunny_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              AppStrings.moreNightModeTitle,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                  color: textColor,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold),
                            ),
                            Text(
                              AppStrings.moreNightModeSubtitle,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                  color: mutedColor, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: isDark,
                        onChanged: (v) => themeProvider.setNightMode(v),
                        activeColor: AppColors.accent,
                        inactiveThumbColor: Colors.white,
                        inactiveTrackColor: Colors.grey.shade300,
                      ),
                    ],
                  ),
                ),

                const _FocusModeCard(),
                const SizedBox(height: 12),

                // Menu items.
                ..._items.map(
                  (item) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () => context.push(item.route),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: borderColor),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          textDirection: TextDirection.rtl,
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: item.color,
                                borderRadius: BorderRadius.circular(25),
                              ),
                              child: Icon(item.icon,
                                  color: Colors.white, size: 26),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    item.title,
                                    textDirection: TextDirection.rtl,
                                    style: TextStyle(
                                        color: textColor,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    item.subtitle,
                                    textDirection: TextDirection.rtl,
                                    style: TextStyle(
                                        color: mutedColor, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.arrow_back_ios_rounded,
                                color: mutedColor, size: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => launchUrl(
                    Uri.parse('https://honara7ty.space/privacy'),
                    mode: LaunchMode.externalApplication,
                  ),
                  child: const Text(AppStrings.morePrivacy),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FocusModeCard extends StatefulWidget {
  const _FocusModeCard();

  @override
  State<_FocusModeCard> createState() => _FocusModeCardState();
}

class _FocusModeCardState extends State<_FocusModeCard> {
  FocusModePreference _preference = FocusModePreference.disabled;

  @override
  void initState() {
    super.initState();
    FocusMode.preference().then((value) {
      if (mounted) setState(() => _preference = value);
    });
  }

  Future<void> _choose(FocusModePreference value) async {
    if (!FocusMode.supported) {
      await FocusMode.setPreference(value);
      if (mounted) setState(() => _preference = value);
      if (value == FocusModePreference.disabled) return;
      await DevotionSchedule.ensure();
      if (!mounted) return;
      await showIosFocusGuide(
        context,
        automatic: value == FocusModePreference.automatic,
      );
      return;
    }
    if (value != FocusModePreference.disabled && !await FocusMode.hasPermission()) {
      await FocusMode.requestPermission();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اسمح بالوصول لوضع عدم الإزعاج ثم اختَر الوضع مرة أخرى.')),
      );
      return;
    }
    await FocusMode.setPreference(value);
    if (value == FocusModePreference.manual) await FocusMode.enable();
    if (value == FocusModePreference.disabled) await FocusMode.disable();
    if (value == FocusModePreference.automatic) {
      final userId = supabase.auth.currentUser?.id;
      var hour = 7;
      var minute = 0;
      if (userId != null) {
        final profile = await supabase
            .from('profiles')
            .select('devotion_time')
            .eq('id', userId)
            .maybeSingle();
        final raw = profile?['devotion_time'] as String?;
        if (raw != null && raw.contains(':')) {
          final parts = raw.split(':');
          hour = int.parse(parts[0]);
          minute = int.parse(parts[1]);
        }
      }
      await FocusMode.schedule(hour, minute);
    }
    if (mounted) setState(() => _preference = value);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'وضع الخلوة (لا تزعجني)',
              textDirection: TextDirection.rtl,
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              FocusMode.supported
                  ? 'يكتم إشعارات الجهاز لمدة ٣٠ دقيقة وقت الخلوة.'
                  : 'زر «تفعيل التركيز» على إشعار الخلوة يفتح إعدادات التركيز. ولو عايزه يشتغل لوحده، اعمل أتمتة من تطبيق الاختصارات.',
              textDirection: TextDirection.rtl,
            ),
            const SizedBox(height: 8),
            SegmentedButton<FocusModePreference>(
              segments: const [
                ButtonSegment(value: FocusModePreference.disabled, label: Text('إيقاف')),
                ButtonSegment(value: FocusModePreference.manual, label: Text('الآن')),
                ButtonSegment(value: FocusModePreference.automatic, label: Text('تلقائي')),
              ],
              selected: {_preference},
              onSelectionChanged: (value) => _choose(value.first),
            ),
          ],
        ),
      ),
    );
  }
}
