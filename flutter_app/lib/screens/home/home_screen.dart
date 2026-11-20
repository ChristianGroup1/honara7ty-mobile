// ─── Home Screen ─────────────────────────────────────────────────────────────
// Mirrors components/home/HomeScreen.tsx

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/journal_remote.dart';
import '../../core/offline_sync.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../features/focus/focus_mode.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/journal/prayer_notes_service.dart';
import '../../features/journal/reflections_service.dart';
import '../../features/reading/active_reading_plan_service.dart';
import '../../features/reading/bible_catalog.dart';
import '../../features/reading/bible_tools.dart';
import '../../features/reading/daily_verse.dart';
import '../../features/reminders/devotion_reminder.dart';
import '../../features/reminders/notification_permission_flow.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
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
  String? _suggestedBook;
  int? _suggestedChapter;
  var _firstReading = true;
  DailyVerse _dailyVerse = fallbackDailyVerseForToday();
  var _focusActive = false;
  var _promptSeen = false;
  int _prayerCount = 0;
  int _reflectionCount = 0;
  final _verseKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    journalCountsTick.addListener(_loadJournalCounts);
    _loadUser();
  }

  @override
  void dispose() {
    journalCountsTick.removeListener(_loadJournalCounts);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshFocus();
      _loadJournalCounts();
      _refreshDailyVerse();
    }
  }

  Future<void> _refreshDailyVerse() async {
    try {
      final verse = await pickDailyVerseFromReadingBook(
        preferredBookName: _suggestedBook,
      );
      if (!mounted) return;
      setState(() => _dailyVerse = verse);
    } catch (_) {}
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
    String? suggestedBook;
    int? suggestedChapter;
    var firstReading = true;
    ActiveReadingPlan? plan;
    var planChapters = <int>[];
    try {
      notificationsOn = await DevotionReminder.instance.notificationsEnabled();
      promptSeen = await hasSeenNotificationPermissionPrompt(userId);
      focusActive = await FocusMode.isActive();
      final suggestion = await suggestTodayReading();
      suggested = suggestion.label;
      suggestedBook = suggestion.bookName;
      suggestedChapter = suggestion.chapter;
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
    DailyVerse dailyVerse = fallbackDailyVerseForToday();
    try {
      dailyVerse = await pickDailyVerseFromReadingBook(
        preferredBookName: suggestedBook,
      );
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _user = session?.user;
      _devotionAnswer = answer;
      _notificationsOn = notificationsOn;
      _promptSeen = promptSeen;
      _focusActive = focusActive;
      _suggestedReading = suggested;
      _suggestedBook = suggestedBook;
      _suggestedChapter = suggestedChapter;
      _firstReading = firstReading;
      _plan = plan;
      _planChapters = planChapters;
      _dailyVerse = dailyVerse;
      _loading = false;
    });
    _loadJournalCounts();
  }

  Future<void> _loadJournalCounts() async {
    try {
      final prayersFuture = PrayerNotesService().load();
      final reflectionsFuture = ReflectionsService().load();
      final prayers = await prayersFuture;
      final reflections = await reflectionsFuture;
      if (!mounted) return;
      setState(() {
        _prayerCount = prayers.length;
        _reflectionCount = reflections.length;
      });
    } catch (_) {
      // Keep the home screen available when journal data is offline.
    }
  }

  String _arabicCount(int value) => value.toString().replaceAllMapped(
        RegExp(r'\d'),
        (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match[0]!)],
      );

  Future<void> _shareVerse() async {
    try {
      final boundary = _verseKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذّر تجهيز صورة الآية.')),
        );
        return;
      }
      if (boundary.debugNeedsPaint) {
        await WidgetsBinding.instance.endOfFrame;
      }
      final image = await boundary.toImage(pixelRatio: 3);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      final pngBytes = byteData?.buffer.asUint8List();
      if (pngBytes == null) return;

      final file = File('${Directory.systemTemp.path}/honara7ty-daily-verse.png');
      await file.writeAsBytes(pngBytes, flush: true);

      final box = context.findRenderObject() as RenderBox?;
      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'image/png', name: 'verse.png')],
        text:
            '${_dailyVerse.text}\n${_dailyVerse.reference}\n\nآية اليوم من تطبيق هنا راحتي',
        sharePositionOrigin: box == null
            ? null
            : box.localToGlobal(Offset.zero) & box.size,
      );
    } on Object catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذّر مشاركة الآية: $error')),
      );
    }
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
        (book == null
            ? null
            : [(book: book, chapters: chapters ?? const <int>[])]);
    if (completed &&
        (entries == null || entries.every((entry) => entry.chapters.isEmpty))) {
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
      if (completed && entries != null && entries.isNotEmpty) {
        try {
          final catalog = await loadBibleCatalog();
          final last = entries.last;
          final matched = findBibleBook(catalog, name: last.book);
          if (matched != null) {
            final reader = await BibleReaderPrefs.load();
            reader.bookId = matched.id;
            reader.chapter =
                last.chapters.isEmpty ? 1 : (last.chapters.toList()..sort()).last;
            await reader.save();
          }
        } catch (_) {}
      }
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
        message: completed ? null : AppStrings.homeStartNowMessage,
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
      isDismissible: true,
      enableDrag: true,
      useSafeArea: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      builder: (context) => _DevotionAnswerSheet(
        books: books,
        planBook:
            _plan == null || _planChapters.isEmpty ? null : _plan!.bookName,
        planChapters: _planChapters,
        planDay: _plan == null ? null : _plan!.completedDays + 1,
        planApplied: _planApplied,
        suggestedBook: _suggestedBook,
        suggestedChapter: _suggestedChapter,
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
    final bgColor =
        isDark ? AppColors.darkBackground : AppColors.lightBackground;
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

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: bgColor,
        body: Column(
          children: [
            _HomeHeader(
              displayName: _displayName,
              initials: _initials,
              onLogout: _handleLogout,
              onProfile: () => context.push(Routes.profile),
              isDark: isDark,
            ),

            // Content.
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _DailyQuestionCard(
                    answer: _devotionAnswer,
                    dateLabel: _arabicDate(DateTime.now()),
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
                      label: _suggestedReading!,
                      first: _firstReading,
                      onTap: _handleDevotionYes,
                    ),
                    const SizedBox(height: 8),
                  ],

                  // Quick actions.
                  _QuickActionsGrid(cardColor: cardColor, textColor: textColor),
                  const SizedBox(height: 14),

                  if (!_notificationsOn) ...[
                    _NoticeCard(
                      cardColor: cardColor,
                      textColor: textColor,
                      mutedColor: mutedColor,
                      title: AppStrings.homePermissionNoticeTitle,
                      body: AppStrings.homePermissionNoticeBody,
                      action: _promptSeen
                          ? AppStrings.homePermissionOpenSettings
                          : AppStrings.homePermissionEnable,
                      onAction: _enableNotifications,
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Feature cards.
                  _FeatureCard(
                    title: AppStrings.homePrayerNotesTitle,
                    subtitle: AppStrings.homePrayerNotesSubtitle,
                    icon: Icons.favorite_outline_rounded,
                    iconColor: AppColors.prayerStart,
                    gradient: AppColors.prayerGradient,
                    badge:
                        '${_arabicCount(_prayerCount)} ${AppStrings.homePrayerCountLabel}',
                    cardColor: cardColor,
                    textColor: textColor,
                    mutedColor: mutedColor,
                    onTap: () async {
                      await context.push(Routes.prayerNotes);
                      if (mounted) await _loadJournalCounts();
                    },
                  ),
                  const SizedBox(height: 12),
                  _FeatureCard(
                    title: AppStrings.homeReflectionTitle,
                    subtitle: AppStrings.homeReflectionSubtitle,
                    icon: Icons.edit_note_rounded,
                    iconColor: AppColors.journalStart,
                    gradient: AppColors.journalGradient,
                    badge:
                        '${_arabicCount(_reflectionCount)} ${AppStrings.homeReflectionCountLabel}',
                    cardColor: cardColor,
                    textColor: textColor,
                    mutedColor: mutedColor,
                    onTap: () async {
                      await context.push(Routes.spiritualReflection);
                      if (mounted) await _loadJournalCounts();
                    },
                  ),
                  const SizedBox(height: 14),
                  _DailyVerseCard(
                    boundaryKey: _verseKey,
                    verse: _dailyVerse,
                    onTap: () => context.push(Routes.lockScreenVerse),
                    onShare: _shareVerse,
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _toArabicDigits(String value) => value.replaceAllMapped(
      RegExp(r'[0-9]'),
      (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match[0]!)],
    );

String _arabicDate(DateTime date) {
  const weekdays = [
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
    'الأحد',
  ];
  const months = [
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
  return '${weekdays[date.weekday - 1]}، ${_toArabicDigits(date.day.toString())} ${months[date.month - 1]}';
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.displayName,
    required this.initials,
    required this.onLogout,
    required this.onProfile,
    required this.isDark,
  });

  final String displayName;
  final String initials;
  final VoidCallback onLogout;
  final VoidCallback onProfile;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final foreground = isDark ? AppColors.darkText : AppColors.navy;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    return Container(
      color: isDark ? AppColors.darkCard : Colors.white,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onProfile,
                  borderRadius: BorderRadius.circular(17),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topRight,
                            end: Alignment.bottomLeft,
                            colors: [Color(0xFF172554), AppColors.navy],
                          ),
                          borderRadius: BorderRadius.circular(17),
                          border: Border.all(
                              color: AppColors.gold.withValues(alpha: .7),
                              width: 1.5),
                          boxShadow: [
                            BoxShadow(
                                color: AppColors.navy.withValues(alpha: .14),
                                blurRadius: 12,
                                offset: const Offset(0, 4))
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(initials,
                            style: const TextStyle(
                                color: AppColors.gold,
                                fontSize: 16,
                                fontWeight: FontWeight.w800)),
                      ),
                      Positioned(
                        left: -3,
                        bottom: -3,
                        child: Container(
                          width: 15,
                          height: 15,
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isDark ? AppColors.darkCard : Colors.white,
                              width: 2,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onProfile,
                    borderRadius: BorderRadius.circular(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                  color: Color(0xFFF4B740),
                                  shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          const Text('وقت مع ربنا',
                              style: TextStyle(
                                  color: Color(0xFFB7791F),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800)),
                        ]),
                        const SizedBox(height: 3),
                        Text('مرحبًا، $displayName',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.right,
                            style: TextStyle(
                                color: foreground,
                                fontSize: 18,
                                height: 1.15,
                                fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Material(
                color:
                    isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(15),
                child: InkWell(
                  onTap: onLogout,
                  borderRadius: BorderRadius.circular(15),
                  child: SizedBox(
                      width: 42,
                      height: 42,
                      child:
                          Icon(Icons.logout_rounded, color: muted, size: 20)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DailyVerseCard extends StatelessWidget {
  const _DailyVerseCard({
    required this.boundaryKey,
    required this.verse,
    required this.onTap,
    required this.onShare,
  });

  final GlobalKey boundaryKey;
  final DailyVerse verse;
  final VoidCallback onShare;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: RepaintBoundary(
          key: boundaryKey,
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: AppColors.scriptureGradient,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: .08)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.scriptureStart.withValues(alpha: .28),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppStrings.homeDailyVerseEyebrow,
                            textDirection: TextDirection.rtl,
                            textAlign: TextAlign.right,
                            style: const TextStyle(
                              color: Color(0xFFFDE68A),
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            AppStrings.homeDailyVerseTitle,
                            textDirection: TextDirection.rtl,
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: .72),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    FilledButton.icon(
                      onPressed: onShare,
                      icon: const Icon(Icons.share_outlined, size: 15),
                      label: const Text(AppStrings.homeShareVerse),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.dailyQuestionStart,
                        foregroundColor: AppColors.navy,
                        minimumSize: const Size(0, 38),
                        padding: const EdgeInsets.symmetric(horizontal: 11),
                        textStyle: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w800),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  '“${verse.text}”',
                  textDirection: TextDirection.rtl,
                  textAlign: TextAlign.right,
                  style: verseStyle(
                    color: AppColors.champagne,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '– ${verse.reference}',
                  textDirection: TextDirection.rtl,
                  textAlign: TextAlign.right,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .76),
                    fontSize: 13,
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
        color: AppColors.champagneSoft,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: Row(
        textDirection: TextDirection.rtl,
        children: [
          const Icon(Icons.notifications_off_outlined,
              color: AppColors.steelDark),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(AppStrings.homeFocusAlertTitle,
                    textAlign: TextAlign.right,
                    style: TextStyle(fontWeight: FontWeight.w800)),
                Text(AppStrings.homeFocusAlertBody, textAlign: TextAlign.right),
              ],
            ),
          ),
          TextButton(
              onPressed: onDisable,
              child: const Text(AppStrings.homeFocusDisable)),
        ],
      ),
    );
  }
}

class _TodayReadingCard extends StatelessWidget {
  const _TodayReadingCard({
    required this.label,
    required this.first,
    required this.onTap,
  });

  final String label;
  final bool first;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final reading = RegExp(r'^(.*)\s+([0-9٠-٩]+)$').firstMatch(label.trim());
    final bookName = reading?.group(1)?.trim() ?? label;
    final chapter = reading?.group(2) ?? '1';
    return Material(
      color: const Color(0xFF111A36),
      borderRadius: BorderRadius.circular(26),
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            border: Border.all(
                color: const Color(0xFF46578D).withValues(alpha: .42)),
            gradient: LinearGradient(
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
              colors: const [
                Color(0xFF1E3A6D),
                Color(0xFF111A36),
                Color(0xFF080D1A)
              ],
            ),
            boxShadow: [
              BoxShadow(
                  color: const Color(0xFF111A36).withValues(alpha: .13),
                  blurRadius: 18,
                  offset: const Offset(0, 7))
            ],
          ),
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Icon(Icons.auto_stories_rounded,
                    color: AppColors.steelLight, size: 22),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(textDirection: TextDirection.rtl, children: [
                      const Icon(Icons.auto_awesome_rounded,
                          color: AppColors.steel, size: 15),
                      const SizedBox(width: 5),
                      Expanded(
                          child: Text(AppStrings.homeReadingToday,
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                  color: AppColors.steelLight,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700))),
                    ]),
                    const SizedBox(height: 5),
                    Text(
                      '$bookName — الأصحاح ${_toArabicDigits(chapter)}',
                      textDirection: TextDirection.rtl,
                      textAlign: TextAlign.right,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                        first
                            ? AppStrings.homeReadingFirst
                            : AppStrings.homeReadingContinue,
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: .68),
                            fontSize: 11)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(15),
                    border:
                        Border.all(color: Colors.white.withValues(alpha: .2))),
                child: Icon(Icons.arrow_forward_rounded,
                    color: Colors.white.withValues(alpha: .9), size: 20),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DailyQuestionCard extends StatelessWidget {
  final bool? answer;
  final String dateLabel;
  final Color mutedColor;
  final VoidCallback onAnswer;
  final VoidCallback onEdit;

  const _DailyQuestionCard({
    required this.answer,
    required this.dateLabel,
    required this.mutedColor,
    required this.onAnswer,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final quietSurface =
        isDark ? AppColors.darkCardMuted : AppColors.lightCardMuted;
    final surface = isDark ? AppColors.darkCard : Colors.white;
    final titleColor = isDark ? AppColors.darkText : AppColors.navy;
    final questionAccent =
        isDark ? AppColors.dailyQuestionStart : AppColors.dailyQuestionEnd;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: isDark
              ? cardBorder
              : AppColors.dailyQuestionStart.withValues(alpha: .35),
        ),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: isDark
              ? [AppColors.darkCard, AppColors.darkCardMuted]
              : [Colors.white, const Color(0xFFFFFBEB)],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.dailyQuestionStart
                .withValues(alpha: isDark ? .06 : .12),
            blurRadius: 26,
            offset: const Offset(0, 9),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            textDirection: TextDirection.rtl,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.dailyQuestionStart.withValues(alpha: .18),
                      AppColors.dailyQuestionEnd.withValues(alpha: .12),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  border: Border.all(
                      color:
                          AppColors.dailyQuestionStart.withValues(alpha: .28)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.help_center_rounded,
                      color: questionAccent, size: 17),
                  const SizedBox(width: 6),
                  Text('سؤال اليوم',
                      style: TextStyle(
                          color: questionAccent,
                          fontSize: 11,
                          fontWeight: FontWeight.w800)),
                ]),
              ),
              Flexible(
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: surface.withValues(alpha: .75),
                    borderRadius: BorderRadius.circular(999),
                    border:
                        Border.all(color: cardBorder.withValues(alpha: .55)),
                  ),
                  child: Text(dateLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: isDark
                              ? AppColors.darkMutedText
                              : AppColors.lightMutedText,
                          fontSize: 10,
                          fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 15),
          Text(AppStrings.homeDailyQuestionTitle,
              textDirection: TextDirection.rtl,
              textAlign: TextAlign.right,
              style: TextStyle(
                  color: titleColor,
                  fontSize: 18,
                  height: 1.35,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('شارك إجابتك وتأملك الشخصي في محضر الله.',
              textDirection: TextDirection.rtl,
              textAlign: TextAlign.right,
              style: TextStyle(color: mutedColor, fontSize: 13, height: 1.55)),
          if (answer != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: quietSurface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                answer!
                    ? AppStrings.homeAnsweredYes
                    : AppStrings.homeAnsweredNo,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.right,
                style: TextStyle(
                  color: mutedColor,
                  fontSize: 12,
                  height: 1.5,
                ),
              ),
            ),
          ],
          const SizedBox(height: 15),
          Divider(height: 1, color: cardBorder.withValues(alpha: .65)),
          const SizedBox(height: 13),
          if (answer == null)
            SizedBox(
              height: 46,
              child: _AnswerButton(
                label: AppStrings.homeAnswerNow,
                color: AppColors.navy,
                foreground: Colors.white,
                onTap: onAnswer,
              ),
            )
          else
            Row(
              textDirection: TextDirection.rtl,
              children: [
                Expanded(
                  flex: 2,
                  child: SizedBox(
                    height: 42,
                    child: _AnswerButton(
                      label: AppStrings.homeEditAnswer,
                      color: AppColors.navy,
                      foreground: Colors.white,
                      onTap: onEdit,
                      icon: Icons.edit_outlined,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 42,
                    child: OutlinedButton(
                      onPressed: onAnswer,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.navy,
                        backgroundColor: quietSurface,
                        side: BorderSide.none,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        AppStrings.homeAnswerNow,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12),
                      ),
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
  final Color foreground;
  final VoidCallback onTap;
  final IconData? icon;

  const _AnswerButton({
    required this.label,
    required this.color,
    this.foreground = Colors.white,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: foreground,
        minimumSize: const Size(44, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        textDirection: TextDirection.rtl,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 17),
            const SizedBox(width: 6),
          ],
          Text(label,
              textDirection: TextDirection.rtl,
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

// ─── Quick Actions Grid ───────────────────────────────────────────────────────

class _QuickActionsGrid extends StatelessWidget {
  final Color cardColor;
  final Color textColor;

  const _QuickActionsGrid({required this.cardColor, required this.textColor});

  static const _actions = [
    (
      icon: Icons.group_outlined,
      label: AppStrings.homeQuickGroups,
      route: Routes.devotionGroups,
      colors: AppColors.groupsGradient,
    ),
    (
      icon: Icons.settings_outlined,
      label: AppStrings.homeQuickDevotionSettings,
      route: '${Routes.mainTabs}?tab=2',
      colors: AppColors.settingsGradient,
    ),
    (
      icon: Icons.bookmark_add_outlined,
      label: AppStrings.homeQuickMemorization,
      route: Routes.bibleMemorization,
      colors: AppColors.memorizationGradient,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      padding: EdgeInsets.zero,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: .98,
      children: _actions.map((a) {
        return Material(
          color: cardColor,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            onTap: () {
              if (a.route.startsWith(Routes.mainTabs)) {
                context.go(a.route);
              } else {
                context.push(a.route);
              }
            },
            borderRadius: BorderRadius.circular(20),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.navy.withValues(alpha: .045),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topRight,
                        end: Alignment.bottomLeft,
                        colors: a.colors,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                            color: a.colors.first.withValues(alpha: .22),
                            blurRadius: 10,
                            offset: const Offset(0, 4))
                      ],
                    ),
                    child: Icon(a.icon, color: Colors.white, size: 23),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      a.label,
                      textDirection: TextDirection.rtl,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 11,
                        height: 1.35,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
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
  final List<Color> gradient;
  final String badge;
  final Color cardColor;
  final Color textColor;
  final Color mutedColor;
  final VoidCallback onTap;

  const _FeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.gradient,
    required this.badge,
    required this.cardColor,
    required this.textColor,
    required this.mutedColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: cardColor,
      borderRadius: BorderRadius.circular(AppRadius.xl),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.xl),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: .045),
                blurRadius: 14,
                offset: const Offset(0, 4),
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
                  gradient: LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: gradient,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                        color: iconColor.withValues(alpha: .2),
                        blurRadius: 10,
                        offset: const Offset(0, 4))
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: Text(
                        title,
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Row(
                      textDirection: TextDirection.rtl,
                      children: [
                        Expanded(
                          child: Text(
                            subtitle,
                            textDirection: TextDirection.rtl,
                            textAlign: TextAlign.right,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: mutedColor,
                              fontSize: 11,
                              height: 1.35,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: iconColor.withValues(alpha: .12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            badge,
                            textDirection: TextDirection.rtl,
                            style: TextStyle(
                              color:
                                  isDark ? AppColors.darkText : AppColors.navy,
                              fontSize: 10,
                              height: 1.1,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Icon(Icons.chevron_right_rounded, color: mutedColor, size: 20),
            ],
          ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: isDark ? AppColors.darkCard : const Color(0xFFFFFCF6),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: isDark ? .3 : .55),
          ),
        ),
        child: Row(
          textDirection: TextDirection.rtl,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: .45),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.notifications_active_outlined,
                  color: Color(0xFF9A6719), size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    title,
                    textDirection: TextDirection.rtl,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    body,
                    textDirection: TextDirection.rtl,
                    textAlign: TextAlign.right,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: mutedColor,
                      fontSize: 10,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF9A6719),
                backgroundColor:
                    isDark ? AppColors.darkCardMuted : const Color(0xFFFFF3DA),
                minimumSize: const Size(52, 40),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(action, style: const TextStyle(fontSize: 11)),
            ),
          ],
        ),
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
    isDismissible: true,
    enableDrag: true,
    useSafeArea: true,
    showDragHandle: false,
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
    this.suggestedBook,
    this.suggestedChapter,
  });

  final List<BibleBookInfo> books;
  final String? planBook;
  final List<int> planChapters;
  final int? planDay;
  final bool planApplied;
  final String? suggestedBook;
  final int? suggestedChapter;

  @override
  State<_DevotionAnswerSheet> createState() => _DevotionAnswerSheetState();
}

class _DevotionAnswerSheetState extends State<_DevotionAnswerSheet> {
  static const _navy = AppColors.navy;
  static const _yellow = AppColors.champagne;
  static const _green = AppColors.steel;
  static const _slate = AppColors.lightMutedText;
  static const _caption = AppColors.lightMutedText;
  static const _amber = AppColors.steelDark;

  var _completed = true;
  var _oldTestament = true;
  BibleBookInfo? _book;
  final _chapters = <int>{};
  final _added = <({String book, List<int> chapters})>[];
  final _bookKeys = <String, GlobalKey>{};
  final _bookScroll = ScrollController();
  final _chapterScroll = ScrollController();
  late var _planApplied = widget.planApplied;

  bool get _dark => context.read<ThemeProvider>().isNightMode;
  Color get _surface => _dark ? AppColors.darkCard : Colors.white;
  Color get _muted => _dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
  Color get _border => _dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
  Color get _text => _dark ? AppColors.darkText : _navy;
  bool get _canSave => !_completed || _added.isNotEmpty || _chapters.isNotEmpty;

  List<BibleBookInfo> get _visibleBooks => widget.books.where((book) {
        final id = int.tryParse(book.id) ?? 0;
        return _oldTestament ? id <= 39 : id >= 40;
      }).toList();

  TextStyle _font(double size, Color color,
          [FontWeight weight = FontWeight.w700]) =>
      TextStyle(
          fontFamily: 'Tajawal',
          fontSize: size,
          color: color,
          fontWeight: weight,
          height: 1.4);

  @override
  void initState() {
    super.initState();
    _applyTodayReading();
    WidgetsBinding.instance.addPostFrameCallback((_) => _revealSelection());
  }

  BibleBookInfo? _bookNamed(String? name) {
    if (name == null || name.isEmpty) return null;
    for (final book in widget.books) {
      if (book.name == name) return book;
    }
    return null;
  }

  void _applyTodayReading() {
    if (widget.books.isEmpty) return;
    final plan = _bookNamed(widget.planBook);
    if (plan != null && widget.planChapters.isNotEmpty) {
      _book = plan;
      _oldTestament = (int.tryParse(plan.id) ?? 0) <= 39;
      _chapters.addAll(widget.planChapters);
      _planApplied = true;
      return;
    }
    final suggested = _bookNamed(widget.suggestedBook);
    final chapter = widget.suggestedChapter;
    if (suggested != null &&
        chapter != null &&
        chapter > 0 &&
        chapter <= suggested.chapters) {
      _book = suggested;
      _oldTestament = (int.tryParse(suggested.id) ?? 0) <= 39;
      _chapters.add(chapter);
      return;
    }
    _book = widget.books.firstWhere(
      (book) => (int.tryParse(book.id) ?? 0) <= 39,
      orElse: () => widget.books.first,
    );
    _oldTestament = (int.tryParse(_book!.id) ?? 0) <= 39;
  }

  void _revealSelection() {
    if (!mounted || _book == null) return;
    final chipContext = _bookKeys[_book!.id]?.currentContext;
    final target = chipContext?.findRenderObject();
    final scrollable =
        chipContext == null ? null : Scrollable.maybeOf(chipContext);
    if (target != null &&
        scrollable != null &&
        scrollable.position.hasContentDimensions) {
      scrollable.position.ensureVisible(target, alignment: 0.5);
    }
    final chapters = _chapters.toList()..sort();
    if (chapters.isEmpty || !_chapterScroll.hasClients) return;
    final offset = (chapters.first - 1) * 56.0;
    final max = _chapterScroll.position.maxScrollExtent;
    _chapterScroll.jumpTo(offset.clamp(0, max));
  }

  @override
  void dispose() {
    _bookScroll.dispose();
    _chapterScroll.dispose();
    super.dispose();
  }

  String _bookTitle(String name) {
    final gospel = widget.books.any((book) =>
        book.name == name &&
        (int.tryParse(book.id) ?? 0) >= 40 &&
        (int.tryParse(book.id) ?? 0) <= 43);
    return gospel && !name.startsWith('إنجيل') ? 'إنجيل $name' : name;
  }

  void _mergeCurrent() {
    if (_book == null || _chapters.isEmpty) return;
    _mergeReading(_book!.name, _chapters);
    _chapters.clear();
  }

  void _mergeReading(String book, Iterable<int> chapters) {
    final index = _added.indexWhere((entry) => entry.book == book);
    final combined = {...chapters, if (index >= 0) ..._added[index].chapters}
        .toList()
      ..sort();
    if (index < 0) {
      _added.add((book: book, chapters: combined));
    } else {
      _added[index] = (book: book, chapters: combined);
    }
  }

  void _selectBook(BibleBookInfo book) {
    if (_book?.id == book.id) return;
    setState(() {
      // Keep previously selected readings when browsing another book.
      _mergeCurrent();
      _book = book;
      _oldTestament = (int.tryParse(book.id) ?? 0) <= 39;
      final index = _added.indexWhere((entry) => entry.book == book.name);
      if (index >= 0) _chapters.addAll(_added.removeAt(index).chapters);
    });
    if (_chapterScroll.hasClients) _chapterScroll.jumpTo(0);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final chipContext = _bookKeys[book.id]?.currentContext;
      final target = chipContext?.findRenderObject();
      if (chipContext != null && target != null) {
        Scrollable.of(chipContext).position.ensureVisible(target,
            alignment: .5, duration: const Duration(milliseconds: 150));
      }
    });
  }

  void _selectTestament(bool oldTestament) {
    if (_oldTestament == oldTestament) return;
    final books = widget.books
        .where((book) => ((int.tryParse(book.id) ?? 0) <= 39) == oldTestament)
        .toList();
    if (books.isNotEmpty) _selectBook(books.first);
    if (_bookScroll.hasClients) _bookScroll.jumpTo(0);
  }

  Widget _completionChoice(bool value) {
    final selected = _completed == value;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? _green : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => setState(() => _completed = value),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (selected) ...[
                const Icon(Icons.check_rounded, color: Colors.white, size: 14),
                const SizedBox(width: 4),
              ],
              Text(value ? 'نعم' : 'لا',
                  style: _font(
                      12, selected ? Colors.white : _caption, FontWeight.w800)),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _completionCard() => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: _muted,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(color: _border)),
        child: Row(children: [
          Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                  color: _dark
                      ? _green.withValues(alpha: .15)
                      : const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.check_circle_outline_rounded,
                  color: _green, size: 20)),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('هل أتممت خلوتك اليوم؟', style: _font(12, _text)),
                const SizedBox(height: 4),
                Text(
                    _completed
                        ? 'تثبيت أمانتك في متابعة الأيام'
                        : 'مافيش مشكلة — لسه في وقت قدامك',
                    style: _font(10, _caption, FontWeight.w400)),
              ])),
          const SizedBox(width: 8),
          Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                  color: _surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: _dark ? _border : const Color(0xFFE2E8F0))),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                _completionChoice(true),
                _completionChoice(false)
              ])),
        ]),
      );

  Widget _notYetEncourageCard() => Container(
        margin: const EdgeInsets.only(top: 16),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: _dark
                ? const [Color(0xFF1E293B), Color(0xFF0F172A)]
                : const [Color(0xFFEFF6FF), Color(0xFFF0F9FF)],
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: _dark ? const Color(0xFF334155) : const Color(0xFFBFDBFE),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: _dark
                        ? const Color(0xFF1D4ED8).withValues(alpha: 0.25)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.wb_twilight_rounded,
                    color: _dark
                        ? const Color(0xFF93C5FD)
                        : const Color(0xFF2563EB),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    AppStrings.homeDevotionNotYetTitle,
                    style: _font(15, _text, FontWeight.w900),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              AppStrings.homeDevotionNotYetBody,
              style: _font(13, _caption, FontWeight.w500).copyWith(height: 1.55),
            ),
          ],
        ),
      );

  Widget _testamentTab(bool oldTestament) {
    final selected = _oldTestament == oldTestament;
    return Expanded(
        child: Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? _surface : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _selectTestament(oldTestament),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 5),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              if (selected) ...[
                const Icon(Icons.auto_stories_outlined,
                    size: 14, color: Color(0xFFD97706)),
                const SizedBox(width: 5),
              ],
              Flexible(
                  child: Text(
                      oldTestament
                          ? 'العهد القديم (٣٩ سفراً)'
                          : 'العهد الجديد (٢٧ سفراً)',
                      textAlign: TextAlign.center,
                      style: _font(
                          12,
                          selected ? _text : (_dark ? _caption : _slate),
                          FontWeight.w800))),
            ]),
          ),
        ),
      ),
    ));
  }

  Widget _bookArrow(int offset, IconData icon) {
    final books = _visibleBooks;
    final index = books.indexWhere((book) => book.id == _book?.id);
    final next = index + offset;
    final enabled = index >= 0 && next >= 0 && next < books.length;
    return SizedBox(
      width: 24,
      height: 24,
      child: IconButton(
        tooltip: offset > 0 ? 'السفر التالي' : 'السفر السابق',
        onPressed: enabled ? () => _selectBook(books[next]) : null,
        padding: EdgeInsets.zero,
        style: IconButton.styleFrom(
            backgroundColor: Colors.white.withValues(alpha: .1),
            foregroundColor: Colors.white,
            disabledForegroundColor: Colors.white30),
        icon: Icon(icon, size: 14, textDirection: TextDirection.ltr),
      ),
    );
  }

  Widget _bookCard() => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: _navy,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            boxShadow: [
              BoxShadow(
                  color: _navy.withValues(alpha: .12),
                  blurRadius: 8,
                  offset: const Offset(0, 4))
            ]),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(99)),
                child: Text('السفر النشط', style: _font(10, _yellow))),
            const Spacer(),
            _bookArrow(-1, Icons.chevron_right_rounded),
            const SizedBox(width: 4),
            _bookArrow(1, Icons.chevron_left_rounded),
          ]),
          const SizedBox(height: 8),
          Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
            Expanded(
                child: Text(
                    _book == null ? 'اختر سفرًا' : _bookTitle(_book!.name),
                    style: _font(20, Colors.white, FontWeight.w900))),
            const SizedBox(width: 8),
            Text('${_toArabicDigits('${_book?.chapters ?? 0}')} أصحاحاً',
                style: _font(12, const Color(0xFFCBD5E1), FontWeight.w400)),
          ]),
          const SizedBox(height: 16),
          SizedBox(
              height: 28,
              child: ListView.separated(
                controller: _bookScroll,
                key: const ValueKey('reading-books'),
                scrollDirection: Axis.horizontal,
                itemCount: _visibleBooks.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (context, index) {
                  final item = _visibleBooks[index];
                  final selected = _book?.id == item.id;
                  return Semantics(
                    selected: selected,
                    button: true,
                    child: Material(
                      key: _bookKeys.putIfAbsent(item.id, GlobalKey.new),
                      color: selected
                          ? _yellow
                          : Colors.white.withValues(alpha: .1),
                      borderRadius: BorderRadius.circular(8),
                      child: InkWell(
                        onTap: () => _selectBook(item),
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            child: Text(item.name,
                                style: _font(
                                    11,
                                    selected
                                        ? const Color(0xFF020617)
                                        : const Color(0xFFCBD5E1),
                                    selected
                                        ? FontWeight.w900
                                        : FontWeight.w700))),
                      ),
                    ),
                  );
                },
              )),
        ]),
      );

  String get _selectionLabel {
    final sorted = _chapters.toList()..sort();
    if (sorted.isEmpty) return 'لم تحدد أصحاحات';
    if (sorted.length == 1) {
      return 'الأصحاح ${_toArabicDigits('${sorted.first}')}';
    }
    final count = _toArabicDigits('${sorted.length}');
    if (sorted.last - sorted.first + 1 == sorted.length) {
      return 'من ${_toArabicDigits('${sorted.first}')} إلى ${_toArabicDigits('${sorted.last}')} ($count أصحاحات)';
    }
    return '$count أصحاحات محددة';
  }

  Widget _chapterCard() => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: _muted,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(color: _border)),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 6,
              children: [
                Text('حدد نطاق الأصحاحات المقروءة:',
                    style: _font(12, _text, FontWeight.w800)),
                Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                    decoration: BoxDecoration(
                        color: _dark
                            ? _yellow.withValues(alpha: .12)
                            : const Color(0xFFFFF5D6),
                        borderRadius: BorderRadius.circular(10)),
                    child: Text(_selectionLabel,
                        style: _font(11, _dark ? _yellow : _amber))),
              ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
                child: Text('أو انقر لتخصيص الأصحاح:',
                    style: _font(11, _dark ? _caption : _slate))),
            TextButton(
                onPressed: _book == null
                    ? null
                    : () => setState(() {
                          _chapters
                            ..clear()
                            ..addAll(
                              List.generate(_book!.chapters, (i) => i + 1),
                            );
                        }),
                style: TextButton.styleFrom(
                    minimumSize: const Size(44, 32),
                    padding: EdgeInsets.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                child: Text('تحديد الكل',
                    style: _font(10, const Color(0xFF2563EB)))),
            const SizedBox(width: 8),
            TextButton(
                onPressed: () => setState(_chapters.clear),
                style: TextButton.styleFrom(
                    minimumSize: const Size(44, 32),
                    padding: EdgeInsets.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                child: Text('مسح الكل',
                    style: _font(10, const Color(0xFF2563EB)))),
          ]),
          const SizedBox(height: 6),
          if (_book != null)
            SizedBox(
                height: 64,
                child: ListView.separated(
                  controller: _chapterScroll,
                  key: const ValueKey('reading-chapters'),
                  scrollDirection: Axis.horizontal,
                  itemCount: _book!.chapters,
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final chapter = index + 1;
                    final selected = _chapters.contains(chapter);
                    return Semantics(
                      selected: selected,
                      button: true,
                      child: Container(
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: selected
                                ? [
                                    BoxShadow(
                                        color: _yellow.withValues(alpha: .2),
                                        spreadRadius: 2,
                                        blurRadius: 0)
                                  ]
                                : null),
                        child: Material(
                          color: selected ? _navy : _surface,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(
                                  color: selected
                                      ? _yellow
                                      : (_dark
                                          ? _border
                                          : const Color(0xFFE2E8F0)),
                                  width: selected ? 2 : 1)),
                          child: InkWell(
                            key: ValueKey('reading-chapter-$chapter'),
                            onTap: () => setState(() {
                              if (!_chapters.add(chapter)) {
                                _chapters.remove(chapter);
                              }
                            }),
                            borderRadius: BorderRadius.circular(16),
                            child: SizedBox(
                                width: 48,
                                child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text('أصحاح',
                                          style: _font(
                                              9,
                                              selected ? _yellow : _caption,
                                              selected
                                                  ? FontWeight.w700
                                                  : FontWeight.w400)),
                                      Text(_toArabicDigits('$chapter'),
                                          style: _font(
                                              14,
                                              selected
                                                  ? Colors.white
                                                  : (_dark
                                                      ? _text
                                                      : const Color(
                                                          0xFF475569)),
                                              FontWeight.w900)),
                                    ])),
                          ),
                        ),
                      ),
                    );
                  },
                )),
        ]),
      );

  Widget _readingSummary(String book, List<int> chapters, VoidCallback remove) {
    final sorted = [...chapters]..sort();
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color:
              _dark ? _yellow.withValues(alpha: .06) : const Color(0xFFFFFCF2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: _dark
                  ? _yellow.withValues(alpha: .3)
                  : const Color(0xFFFDE68A))),
      child: Row(children: [
        const Icon(Icons.bookmark_outline_rounded, color: _amber, size: 16),
        const SizedBox(width: 6),
        Expanded(
            child: Text(
                'المقروء: ${_bookTitle(book)} — الأصحاحات ${sorted.map((c) => _toArabicDigits('$c')).join('، ')}',
                style: _font(12, _text))),
        IconButton(
            onPressed: remove,
            tooltip: 'حذف القراءة',
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            icon: const Icon(Icons.delete_outline_rounded,
                color: _caption, size: 17)),
      ]),
    );
  }

  Widget _planCard() => Container(
        margin: const EdgeInsets.only(top: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: _muted,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _border)),
        child: Row(children: [
          const Icon(Icons.auto_stories_outlined, color: _amber, size: 20),
          const SizedBox(width: 8),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('قراءة خطة اليوم',
                    style: _font(11, _dark ? _yellow : _amber)),
                Text(
                    '${_bookTitle(widget.planBook!)} — ${widget.planChapters.map((c) => _toArabicDigits('$c')).join('، ')}',
                    style: _font(12, _text)),
              ])),
          TextButton(
              onPressed: _planApplied
                  ? null
                  : () => setState(() {
                        if (_book?.name == widget.planBook) {
                          _chapters.addAll(widget.planChapters);
                        } else {
                          _mergeReading(widget.planBook!, widget.planChapters);
                        }
                        _planApplied = true;
                      }),
              child: Text(_planApplied ? 'تمت' : 'إضافة',
                  style: _font(11, _dark ? _yellow : _amber))),
        ]),
      );

  void _save() {
    if (!_completed) {
      Navigator.pop(context, const _DevotionSheetResult(completed: false));
      return;
    }
    _mergeCurrent();
    Navigator.pop(
        context,
        _DevotionSheetResult(
            completed: true, readings: [..._added], appliedPlan: _planApplied));
  }

  @override
  Widget build(BuildContext context) {
    context.watch<ThemeProvider>();
    final media = MediaQuery.of(context);
    final bottomInset = media.viewInsets.bottom > media.viewPadding.bottom
        ? media.viewInsets.bottom
        : media.viewPadding.bottom;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Align(
        alignment: Alignment.bottomCenter,
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: media.size.height * .92),
          child: Material(
            color: _surface,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(36)),
            clipBehavior: Clip.antiAlias,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const SizedBox(height: 20),
                  Container(
                      width: 48,
                      height: 6,
                      decoration: BoxDecoration(
                          color: _dark ? _border : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(99))),
                  Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                      child: Row(children: [
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text('أين قرأت اليوم؟',
                                  style: _font(16, _text, FontWeight.w800)),
                              Text('اختر السفر والأصحاحات التي أتممت قراءتها',
                                  style: _font(11, _caption, FontWeight.w400)),
                            ])),
                        const SizedBox(width: 8),
                        SizedBox(
                            width: 32,
                            height: 32,
                            child: IconButton(
                                onPressed: () => Navigator.pop(context),
                                tooltip: 'إغلاق',
                                padding: EdgeInsets.zero,
                                style: IconButton.styleFrom(
                                    backgroundColor: _dark
                                        ? _muted
                                        : const Color(0xFFF1F5F9)),
                                icon: const Icon(Icons.close_rounded,
                                    color: _slate, size: 20))),
                      ])),
                  Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Divider(height: 1, color: _border)),
                  Flexible(
                      child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _completionCard(),
                          if (_completed) ...[
                            if (widget.planBook != null) _planCard(),
                            const SizedBox(height: 16),
                            Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                    color: _dark
                                        ? _muted
                                        : const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(16)),
                                child: Row(children: [
                                  _testamentTab(true),
                                  const SizedBox(width: 4),
                                  _testamentTab(false)
                                ])),
                            const SizedBox(height: 16),
                            _bookCard(),
                            const SizedBox(height: 16),
                            _chapterCard(),
                            if (_book != null && _chapters.isNotEmpty)
                              _readingSummary(_book!.name, _chapters.toList(),
                                  () => setState(_chapters.clear)),
                            for (var index = 0; index < _added.length; index++)
                              _readingSummary(
                                  _added[index].book,
                                  _added[index].chapters,
                                  () =>
                                      setState(() => _added.removeAt(index))),
                          ] else
                            _notYetEncourageCard(),
                        ]),
                  )),
                  Container(
                    padding:
                        EdgeInsets.fromLTRB(20, 12, 20, bottomInset + 18),
                    decoration: BoxDecoration(
                        color: _surface,
                        border: Border(top: BorderSide(color: _border))),
                    child: SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _canSave ? _save : null,
                        style: FilledButton.styleFrom(
                            backgroundColor:
                                _completed ? _navy : const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(48),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16))),
                        child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                  child: Text(
                                      _completed
                                          ? 'تأكيد وحفظ القراءة'
                                          : AppStrings.homeDevotionNotYetSave,
                                      style: _font(
                                          14,
                                          _canSave ? Colors.white : _caption,
                                          FontWeight.w800))),
                              const SizedBox(width: 8),
                              Icon(
                                _completed
                                    ? Icons.check_rounded
                                    : Icons.wb_sunny_rounded,
                                size: 18,
                              ),
                            ]),
                      ),
                    ),
                  ),
                ]),
          ),
        ),
      ),
    );
  }
}
