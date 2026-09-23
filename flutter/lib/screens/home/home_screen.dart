// ─── Home Screen ─────────────────────────────────────────────────────────────
// Mirrors components/home/HomeScreen.tsx

import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/offline_sync.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../features/focus/focus_mode.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/reading/active_reading_plan_service.dart';
import '../../features/reading/bible_catalog.dart';
import '../../features/reminders/devotion_reminder.dart';
import '../../features/reminders/notification_permission_flow.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';
import '../../widgets/custom_alert_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  User? _user;
  bool _loading = true;
  bool? _devotionAnswer; // null = not answered, true = yes, false = no
  bool _notificationsOn = true;
  ActiveReadingPlan? _plan;
  List<int> _planChapters = [];
  var _planApplied = false;
  String? _suggestedReading;
  var _firstReading = true;
  var _focusActive = false;
  var _promptSeen = false;
  final _verseKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadUser();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshFocus();
  }

  Future<void> _refreshFocus() async {
    final active = await FocusMode.isActive();
    if (mounted) setState(() => _focusActive = active);
  }

  Future<void> _loadUser() async {
    final session = supabase.auth.currentSession;
    bool? answer;
    final userId = session?.user.id;
    if (userId != null) {
      try {
        final row = await supabase
            .from('devotion_log')
            .select('completed')
            .eq('user_id', userId)
            .eq('date', DevotionService.dateKey(DateTime.now()))
            .maybeSingle();
        if (row != null) answer = row['completed'] == true;
      } catch (_) {}
    }
    var notificationsOn = true;
    var promptSeen = false;
    var focusActive = false;
    String? suggested;
    var firstReading = true;
    ActiveReadingPlan? plan;
    var planChapters = <int>[];
    try {
      notificationsOn = await DevotionReminder.instance.notificationsEnabled();
      promptSeen = await hasSeenNotificationPermissionPrompt(userId);
      focusActive = await FocusMode.isActive();
      final suggestion = await suggestTodayReading();
      suggested = suggestion.label;
      firstReading = suggestion.first;
      plan = await ActiveReadingPlanService().load();
      if (plan != null) {
        final catalog = await loadBibleCatalog();
        final book = catalog.cast<BibleBookInfo?>().firstWhere(
              (item) => item!.id == plan!.bookId,
              orElse: () => null,
            );
        planChapters = plan.chaptersForDay(book?.chapters ?? 150);
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _user = session?.user;
      _devotionAnswer = answer;
      _notificationsOn = notificationsOn;
      _promptSeen = promptSeen;
      _focusActive = focusActive;
      _suggestedReading = suggested;
      _firstReading = firstReading;
      _plan = plan;
      _planChapters = planChapters;
      _loading = false;
    });
  }

  Future<void> _shareVerse() async {
    final boundary = _verseKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return;
    final image = await boundary.toImage(pixelRatio: 3);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) return;
    await Share.shareXFiles([
      XFile.fromData(bytes.buffer.asUint8List(), mimeType: 'image/png', name: 'verse.png'),
    ], text: 'آية اليوم');
  }

  Future<void> _enableNotifications() async {
    final userId = supabase.auth.currentUser?.id;
    final seen = await hasSeenNotificationPermissionPrompt(userId);
    final enabled = await DevotionReminder.instance.notificationsEnabled();
    if (!enabled && seen) {
      await DevotionReminder.instance.openSystemSettings();
      return;
    }
    await DevotionReminder.instance.requestPermission();
    await markNotificationPermissionPromptSeen(userId);
    final now = await DevotionReminder.instance.notificationsEnabled();
    if (!mounted) return;
    setState(() => _notificationsOn = now);
  }

  Future<bool> _saveDevotion(
    bool completed, {
    String? book,
    List<int>? chapters,
    List<({String book, List<int> chapters})>? readings,
  }) async {
    final entries = readings ??
        (book == null ? null : [(book: book, chapters: chapters ?? const <int>[])]);
    if (completed && (entries == null || entries.every((entry) => entry.chapters.isEmpty))) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختَر سفرًا وإصحاحًا قبل تسجيل الخلوة.')),
      );
      return false;
    }
    try {
      final synced = await DevotionService().saveDay(
        date: DateTime.now(),
        completed: completed,
        book: book,
        chapters: chapters,
        readings: entries,
      );
      await _syncReminder(startTomorrow: completed);
      if (!mounted) return false;
      setState(() => _devotionAnswer = completed);
      if (!synced) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(offlineSavedMessage)),
        );
        return true;
      }
      showCustomAlert(
        context: context,
        title: completed
            ? AppStrings.homeCorrectStreakTitle
            : AppStrings.homeStartNowTitle,
        type: completed ? AlertType.success : AlertType.info,
      );
      return true;
    } catch (_) {
      if (!mounted) return false;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر حفظ الخلوة. حاول مرة أخرى.')),
      );
      return false;
    }
  }

  Future<void> _syncReminder({bool startTomorrow = false}) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final profile = await supabase
          .from('profiles')
          .select('devotion_time')
          .eq('id', userId)
          .maybeSingle();
      final raw = profile?['devotion_time'] as String? ?? '07:00';
      final parts = raw.split(':');
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);
      await DevotionReminder.instance.scheduleDaily(
        hour: hour,
        minute: minute,
        startTomorrow: startTomorrow,
      );
      if (await FocusMode.preference() == FocusModePreference.automatic) {
        await FocusMode.schedule(hour, minute);
      }
    } catch (_) {}
  }

  Future<void> _handleDevotionYes() async {
    final books = await loadBibleCatalog();
    if (!mounted || books.isEmpty) return;
    final picked = await showModalBottomSheet<_DevotionSheetResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _DevotionAnswerSheet(
        books: books,
        planBook: _plan == null || _planChapters.isEmpty ? null : _plan!.bookName,
        planChapters: _planChapters,
        planDay: _plan == null ? null : _plan!.completedDays + 1,
        planApplied: _planApplied,
      ),
    );
    if (!mounted || picked == null) return;
    if (!picked.completed) {
      await _saveDevotion(false);
      return;
    }
    if (picked.readings.isEmpty) return;
    final saved = await _saveDevotion(true, readings: picked.readings);
    if (saved && picked.appliedPlan && mounted) {
      setState(() => _planApplied = true);
    }
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

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bgColor = isDark ? AppColors.darkBackground : AppColors.lightBackground;
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
          AppHeader(
            eyebrow: 'وقت مع ربنا',
            title: 'مرحبا $_displayName',
            leading: CircleAvatar(
              radius: 24,
              backgroundColor: AppColors.accent.withValues(alpha: 0.25),
              child: Text(
                _initials.toUpperCase(),
                style: const TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ),
            trailing: HeaderAction(icon: Icons.logout, onPressed: _handleLogout),
          ),

          // Content.
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _DailyQuestionCard(
                  answer: _devotionAnswer,
                  cardColor: cardColor,
                  textColor: textColor,
                  mutedColor: mutedColor,
                  onAnswer: _handleDevotionYes,
                  onEdit: _handleDevotionYes,
                ),
                const SizedBox(height: 14),
                if (_focusActive) ...[
                  _FocusBanner(onDisable: () async {
                    await FocusMode.disable();
                    await _refreshFocus();
                  }),
                  const SizedBox(height: 14),
                ],
                if (_suggestedReading != null) ...[
                  _TodayReadingCard(
                    cardColor: cardColor,
                    textColor: textColor,
                    mutedColor: mutedColor,
                    label: _suggestedReading!,
                    first: _firstReading,
                    onTap: _handleDevotionYes,
                  ),
                  const SizedBox(height: 14),
                ],
                if (!_notificationsOn) ...[
                  _NoticeCard(
                    cardColor: cardColor,
                    textColor: textColor,
                    mutedColor: mutedColor,
                    title: 'فعّل التذكير اليومي',
                    body:
                        'لو الإشعارات مقفولة، مش هيوصلك تذكير بوقتك مع ربنا في المعاد المناسب.',
                    action: _promptSeen ? 'فتح الإعدادات' : 'تفعيل الإشعارات',
                    onAction: _enableNotifications,
                  ),
                  const SizedBox(height: 14),
                ],

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
                const SizedBox(height: 14),
                _DailyVerseCard(
                  boundaryKey: _verseKey,
                  cardColor: cardColor,
                  textColor: textColor,
                  mutedColor: mutedColor,
                  onTap: () => context.push(Routes.lockScreenVerse),
                  onShare: _shareVerse,
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

class _DailyVerseCard extends StatelessWidget {
  const _DailyVerseCard({
    required this.boundaryKey,
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
    required this.onTap,
    required this.onShare,
  });

  final GlobalKey boundaryKey;
  final VoidCallback onShare;
  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final VoidCallback onTap;

  static const _verses = [
    ('سِرَاجٌ لِرِجْلِي كَلَامُكَ وَنُورٌ لِسَبِيلِي.', 'مزمور ١١٩: ١٠٥'),
    ('لَا تَخَفْ لِأَنِّي مَعَكَ. لَا تَتَلَفَّتْ لِأَنِّي إِلَهُكَ.', 'إشعياء ٤١: ١٠'),
    ('لَا تَهْتَمُّوا بِشَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلَاةِ وَالدُّعَاءِ.', 'فيلبي ٤: ٦'),
    ('سَلَامًا أَتْرُكُ لَكُمْ. سَلَامِي أُعْطِيكُمْ.', 'يوحنا ١٤: ٢٧'),
    ('الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ.', 'مزمور ٢٣: ١'),
    ('تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ.', 'أمثال ٣: ٥'),
    ('كُلَّ الْأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ.', 'رومية ٨: ٢٨'),
  ];

  @override
  Widget build(BuildContext context) {
    final day = DateTime.now().difference(DateTime(DateTime.now().year)).inDays;
    final verse = _verses[day.abs() % _verses.length];
    return Material(
      color: cardColor,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: RepaintBoundary(
          key: boundaryKey,
          child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                AppStrings.homeDailyVerseEyebrow,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.right,
                style: TextStyle(color: mutedColor, fontSize: 12),
              ),
              Text(
                AppStrings.homeDailyVerseTitle,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.right,
                style: TextStyle(color: textColor, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                verse.$1,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.right,
                style: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  height: 1.6,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                verse.$2,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.right,
                style: const TextStyle(color: AppColors.accent),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: onShare,
                  icon: const Icon(Icons.ios_share, size: 16),
                  label: const Text('شارك الآية كصورة'),
                ),
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }
}

// ─── Daily Question Card ──────────────────────────────────────────────────────

class _FocusBanner extends StatelessWidget {
  const _FocusBanner({required this.onDisable});
  final VoidCallback onDisable;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4E5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        textDirection: TextDirection.rtl,
        children: [
          const Icon(Icons.notifications_off_outlined, color: Color(0xFFFF9500)),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('تنبيه: وضع الخلوة مفعل', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w800)),
                Text('أنت الآن في وضع عدم الإزعاج.', textAlign: TextAlign.right),
              ],
            ),
          ),
          TextButton(onPressed: onDisable, child: const Text('إيقاف')),
        ],
      ),
    );
  }
}

class _TodayReadingCard extends StatelessWidget {
  const _TodayReadingCard({
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
    required this.label,
    required this.first,
    required this.onTap,
  });

  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final String label;
  final bool first;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: cardColor,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
              const Icon(Icons.menu_book_outlined, color: AppColors.accent),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('قراءتك النهارده', style: TextStyle(color: mutedColor, fontSize: 12, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text('النهارده هتقرأ في $label', textAlign: TextAlign.right, style: TextStyle(color: textColor, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text(
                      first ? 'ابدأ رحلتك من أول السفر' : 'بناءً على آخر خلوة أكملتها',
                      textAlign: TextAlign.right,
                      style: TextStyle(color: mutedColor, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_left, color: mutedColor),
            ],
          ),
        ),
      ),
    );
  }
}

class _DailyQuestionCard extends StatelessWidget {
  final bool? answer;
  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final VoidCallback onAnswer;
  final VoidCallback onEdit;

  const _DailyQuestionCard({
    required this.answer,
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
    required this.onAnswer,
    required this.onEdit,
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
          Text(
            AppStrings.homeDailyQuestionLabel,
            textDirection: TextDirection.rtl,
            style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
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
            _AnswerButton(
              label: AppStrings.homeAnswerNow,
              color: AppColors.accent,
              onTap: onAnswer,
            )
          else ...[
            Text(
              answer! ? AppStrings.homeAnsweredYes : AppStrings.homeAnsweredNo,
              textDirection: TextDirection.rtl,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: answer! ? const Color(0xFF1B7F4E) : const Color(0xFFB45309),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: onEdit,
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
      label: 'مجموعات الخلوة',
      route: Routes.devotionGroups,
      color: Color(0xFF4A90D9),
    ),
    (
      icon: Icons.settings_outlined,
      label: 'اعدادات الخلوة',
      route: Routes.dailyNotifications,
      color: Color(0xFFE8833A),
    ),
    (
      icon: Icons.menu_book_outlined,
      label: 'حفظ الكتاب المقدس',
      route: Routes.bibleMemorization,
      color: Color(0xFF1A7A7A),
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

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
    required this.title,
    required this.body,
    required this.action,
    required this.onAction,
  });

  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final String title;
  final String body;
  final String action;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            title,
            textDirection: TextDirection.rtl,
            style: TextStyle(color: textColor, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(body, textDirection: TextDirection.rtl, style: TextStyle(color: mutedColor)),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(onPressed: onAction, child: Text(action)),
          ),
        ],
      ),
    );
  }
}

Future<({bool completed, List<({String book, List<int> chapters})> readings})?>
    showDevotionDayPicker(BuildContext context) async {
  final books = await loadBibleCatalog();
  if (!context.mounted || books.isEmpty) return null;
  final picked = await showModalBottomSheet<_DevotionSheetResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _DevotionAnswerSheet(books: books),
  );
  if (picked == null) return null;
  return (completed: picked.completed, readings: picked.readings);
}

class _DevotionSheetResult {
  const _DevotionSheetResult({
    required this.completed,
    this.readings = const [],
    this.appliedPlan = false,
  });

  final bool completed;
  final List<({String book, List<int> chapters})> readings;
  final bool appliedPlan;
}

class _DevotionAnswerSheet extends StatefulWidget {
  const _DevotionAnswerSheet({
    required this.books,
    this.planBook,
    this.planChapters = const [],
    this.planDay,
    this.planApplied = false,
  });

  final List<BibleBookInfo> books;
  final String? planBook;
  final List<int> planChapters;
  final int? planDay;
  final bool planApplied;

  @override
  State<_DevotionAnswerSheet> createState() => _DevotionAnswerSheetState();
}

class _DevotionAnswerSheetState extends State<_DevotionAnswerSheet> {
  var _completed = true;
  var _oldTestament = true;
  BibleBookInfo? _book;
  final _chapters = <int>{};
  final _added = <({String book, List<int> chapters})>[];
  late var _planApplied = widget.planApplied;

  List<BibleBookInfo> get _visibleBooks => widget.books.where((book) {
        final id = int.tryParse(book.id) ?? 0;
        return _oldTestament ? id <= 39 : id >= 40;
      }).toList();

  bool get _canAdd => _book != null && _chapters.isNotEmpty;

  bool get _canSave => !_completed || _added.isNotEmpty || _chapters.isNotEmpty;

  String get _chapterLabel {
    if (_book == null || _chapters.isEmpty) return 'اختار السفر الأول';
    final sorted = _chapters.toList()..sort();
    if (sorted.length == _book!.chapters) return 'اختيار كل الإصحاحات (${sorted.join(', ')})';
    return sorted.join(', ');
  }

  void _mergeCurrent() {
    if (_book == null || _chapters.isEmpty) return;
    final next = _chapters.toList()..sort();
    final index = _added.indexWhere((entry) => entry.book == _book!.name);
    if (index >= 0) {
      final merged = {..._added[index].chapters, ...next}.toList()..sort();
      _added[index] = (book: _book!.name, chapters: merged);
    } else {
      _added.add((book: _book!.name, chapters: next));
    }
    _book = null;
    _chapters.clear();
  }

  Future<void> _pickBook() async {
    final dark = context.read<ThemeProvider>().isNightMode;
    final card = dark ? AppColors.darkCard : AppColors.lightCard;
    final muted = dark ? AppColors.darkCardMuted : AppColors.lightCardMuted;
    final text = dark ? AppColors.darkText : AppColors.lightText;
    final border = dark ? AppColors.darkBorder : AppColors.lightBorder;
    final header = dark ? AppColors.darkHeader : AppColors.lightHeader;
    final picked = await showModalBottomSheet<BibleBookInfo>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _PickerCard(
        title: _oldTestament ? 'العهد القديم' : 'العهد الجديد',
        card: card,
        border: border,
        text: text,
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final book in _visibleBooks)
              SizedBox(
                width: (MediaQuery.sizeOf(context).width - 56) / 2,
                child: Material(
                  color: _book?.id == book.id ? header : muted,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                    side: BorderSide(color: _book?.id == book.id ? header : border),
                  ),
                  child: InkWell(
                    onTap: () => Navigator.pop(context, book),
                    borderRadius: BorderRadius.circular(13),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                      child: Text(
                        book.name,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _book?.id == book.id ? Colors.white : text,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
    if (picked != null) {
      setState(() {
        _book = picked;
        _chapters.clear();
      });
    }
  }

  Future<void> _pickChapters() async {
    final book = _book;
    if (book == null) return;
    final dark = context.read<ThemeProvider>().isNightMode;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setPicker) {
          final all = _chapters.length == book.chapters;
          return _PickerCard(
            title: 'الإصحاحات',
            card: dark ? AppColors.darkCard : AppColors.lightCard,
            border: dark ? AppColors.darkBorder : AppColors.lightBorder,
            text: dark ? AppColors.darkText : AppColors.lightText,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => setPicker(() {
                    if (all) {
                      _chapters.clear();
                    } else {
                      _chapters.addAll(List.generate(book.chapters, (index) => index + 1));
                    }
                    setState(() {});
                  }),
                  icon: const Icon(Icons.select_all, size: 17),
                  label: Text(all ? 'مسح الاختيار' : 'اختيار كل الإصحاحات'),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var chapter = 1; chapter <= book.chapters; chapter++)
                      Material(
                        color: _chapters.contains(chapter)
                            ? (dark ? AppColors.darkHeader : AppColors.lightHeader)
                            : (dark ? AppColors.darkCardMuted : AppColors.lightCardMuted),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: _chapters.contains(chapter)
                                ? (dark ? AppColors.darkHeader : AppColors.lightHeader)
                                : (dark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => setPicker(() {
                            setState(() {
                              if (!_chapters.add(chapter)) _chapters.remove(chapter);
                            });
                          }),
                          child: SizedBox(
                            width: 44,
                            height: 40,
                            child: Center(
                              child: Text(
                                '$chapter',
                                style: TextStyle(
                                  color: _chapters.contains(chapter)
                                      ? Colors.white
                                      : (dark ? AppColors.darkText : AppColors.lightText),
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final dark = context.watch<ThemeProvider>().isNightMode;
    final card = dark ? AppColors.darkCard : AppColors.lightCard;
    final muted = dark ? AppColors.darkCardMuted : AppColors.lightCardMuted;
    final text = dark ? AppColors.darkText : AppColors.lightText;
    final mutedText = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final border = dark ? AppColors.darkBorder : AppColors.lightBorder;
    final header = dark ? AppColors.darkHeader : AppColors.lightHeader;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.8),
          child: Material(
            color: card,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'سجل خلوتك اليوم',
                    textAlign: TextAlign.right,
                    style: TextStyle(color: text, fontSize: 19, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'اختار الإجابة وسجّل الجزء أو الأجزاء اللي قريتها.',
                    textAlign: TextAlign.right,
                    style: TextStyle(color: mutedText, fontSize: 13),
                  ),
                  const SizedBox(height: 14),
                  Flexible(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              for (final yes in [true, false])
                                Expanded(
                                  child: Padding(
                                    padding: EdgeInsets.only(left: yes ? 0 : 10),
                                    child: Material(
                                      color: _completed == yes ? header : card,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                        side: BorderSide(color: _completed == yes ? header : border),
                                      ),
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(14),
                                        onTap: () => setState(() => _completed = yes),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                          child: Text(
                                            yes ? 'نعم ✓' : 'لا ✗',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              color: _completed == yes ? Colors.white : text,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          if (_completed) ...[
                            if (widget.planBook != null) ...[
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: header,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'خطة اليوم${widget.planDay == null ? '' : ' · اليوم ${widget.planDay}'}',
                                      style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w700, fontSize: 12),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      'قرأت جزء خطة النهارده؟',
                                      textAlign: TextAlign.right,
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${widget.planBook} ${widget.planChapters.join('، ')}',
                                      textAlign: TextAlign.right,
                                      style: const TextStyle(color: Color(0xD1FFFFFF), fontSize: 13),
                                    ),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      height: 40,
                                      child: FilledButton(
                                        style: FilledButton.styleFrom(
                                          backgroundColor: _planApplied ? const Color(0x2EFFFFFF) : AppColors.gold,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        ),
                                        onPressed: () {
                                          if (_planApplied) return;
                                          setState(() {
                                            _added
                                              ..clear()
                                              ..add((book: widget.planBook!, chapters: [...widget.planChapters]));
                                            _book = null;
                                            _chapters.clear();
                                            _planApplied = true;
                                          });
                                        },
                                        child: Text(
                                          _planApplied ? 'تمت إضافتها ✓' : 'سجّلها بضغطة',
                                          style: const TextStyle(fontWeight: FontWeight.w800),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            Text(
                              'تقدر تسجل أكتر من قراءة في نفس اليوم، مثل: متى ٥، ٦ والمزامير ١، ٢.',
                              textAlign: TextAlign.right,
                              style: TextStyle(color: mutedText, fontSize: 12, height: 1.5),
                            ),
                            const SizedBox(height: 12),
                            Text('السفر', textAlign: TextAlign.right, style: TextStyle(color: text, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(color: muted, borderRadius: BorderRadius.circular(16)),
                              child: Row(
                                children: [
                                  for (final old in [true, false])
                                    Expanded(
                                      child: Material(
                                        color: _oldTestament == old ? header : Colors.transparent,
                                        borderRadius: BorderRadius.circular(12),
                                        child: InkWell(
                                          borderRadius: BorderRadius.circular(12),
                                          onTap: () => setState(() {
                                            _oldTestament = old;
                                            final id = int.tryParse(_book?.id ?? '') ?? 0;
                                            final stillVisible = old ? id <= 39 : id >= 40;
                                            if (!stillVisible) {
                                              _book = null;
                                              _chapters.clear();
                                            }
                                          }),
                                          child: SizedBox(
                                            height: 40,
                                            child: Center(
                                              child: Text(
                                                old ? 'العهد القديم' : 'العهد الجديد',
                                                style: TextStyle(
                                                  color: _oldTestament == old ? Colors.white : text,
                                                  fontWeight: FontWeight.w900,
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            _SelectorRow(
                              icon: Icons.menu_book_outlined,
                              label: 'السفر',
                              value: _book?.name ?? 'اختار السفر الأول',
                              muted: muted,
                              border: border,
                              text: text,
                              mutedText: mutedText,
                              onTap: _pickBook,
                            ),
                            _SelectorRow(
                              icon: Icons.format_list_numbered,
                              label: 'الإصحاحات',
                              value: _chapterLabel,
                              muted: muted,
                              border: border,
                              text: text,
                              mutedText: mutedText,
                              enabled: _book != null,
                              onTap: _pickChapters,
                            ),
                            Text(
                              _book == null
                                  ? 'اختار السفر الأول'
                                  : 'اختار أي إصحاحات حابب تقراها، ومش لازم يكونوا ورا بعض.',
                              textAlign: TextAlign.right,
                              style: TextStyle(color: mutedText, fontSize: 12, height: 1.5),
                            ),
                            const SizedBox(height: 10),
                            Opacity(
                              opacity: _canAdd ? 1 : 0.55,
                              child: SizedBox(
                                height: 40,
                                child: FilledButton(
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.accent,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onPressed: _canAdd ? () => setState(_mergeCurrent) : null,
                                  child: const Text('إضافة قراءة أخرى', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                                ),
                              ),
                            ),
                            if (_added.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              for (var index = 0; index < _added.length; index++)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: muted,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: border),
                                  ),
                                  child: Row(
                                    textDirection: TextDirection.rtl,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${_added[index].book} ${_added[index].chapters.join('، ')}',
                                          textAlign: TextAlign.right,
                                          style: TextStyle(color: text, fontWeight: FontWeight.w800, fontSize: 13),
                                        ),
                                      ),
                                      TextButton(
                                        style: TextButton.styleFrom(
                                          backgroundColor: const Color(0x1AFF3B30),
                                          foregroundColor: const Color(0xFFB42318),
                                          shape: const StadiumBorder(),
                                        ),
                                        onPressed: () => setState(() => _added.removeAt(index)),
                                        child: const Text('حذف', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Opacity(
                    opacity: _canSave ? 1 : 0.55,
                    child: SizedBox(
                      height: 48,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: !_canSave
                            ? null
                            : () {
                                if (!_completed) {
                                  Navigator.pop(context, const _DevotionSheetResult(completed: false));
                                  return;
                                }
                                _mergeCurrent();
                                Navigator.pop(
                                  context,
                                  _DevotionSheetResult(
                                    completed: true,
                                    readings: [..._added],
                                    appliedPlan: _planApplied,
                                  ),
                                );
                              },
                        child: const Text('حفظ الإجابة', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectorRow extends StatelessWidget {
  const _SelectorRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.muted,
    required this.border,
    required this.text,
    required this.mutedText,
    required this.onTap,
    this.enabled = true,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color muted;
  final Color border;
  final Color text;
  final Color mutedText;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.62,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Material(
          color: muted,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: BorderSide(color: border),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(15),
            onTap: enabled ? onTap : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                textDirection: TextDirection.rtl,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(icon, color: Colors.white, size: 19),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(label, style: TextStyle(color: mutedText, fontSize: 11, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 3),
                        Text(
                          value,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: text, fontSize: 14, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_left, color: mutedText),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PickerCard extends StatelessWidget {
  const _PickerCard({
    required this.title,
    required this.card,
    required this.border,
    required this.text,
    required this.child,
  });

  final String title;
  final Color card;
  final Color border;
  final Color text;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.78),
        child: Material(
          color: card,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(color: border, borderRadius: BorderRadius.circular(999)),
                ),
                const SizedBox(height: 12),
                Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    Expanded(
                      child: Text(title, textAlign: TextAlign.right, style: TextStyle(color: text, fontSize: 18, fontWeight: FontWeight.w900)),
                    ),
                    IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                  ],
                ),
                Flexible(child: SingleChildScrollView(child: child)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
