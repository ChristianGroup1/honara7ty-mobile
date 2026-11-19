import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/offline_sync.dart';
import '../../core/strings.dart';
import '../../core/supabase_service.dart';
import '../../core/theme.dart';
import '../../features/focus/focus_mode.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/reading/active_reading_plan_service.dart';
import '../../features/reading/bible_catalog.dart';
import '../../features/reading/bible_tools.dart';
import '../../features/reminders/devotion_reminder.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';

class DailyNotificationsScreen extends StatefulWidget {
  const DailyNotificationsScreen({super.key, this.showBack = true});

  final bool showBack;

  @override
  State<DailyNotificationsScreen> createState() =>
      _DailyNotificationsScreenState();
}

class _DailyNotificationsScreenState extends State<DailyNotificationsScreen> {
  static const _tips = <({IconData icon, Color tint, Color bg, String text})>[
    (
      icon: Icons.wb_sunny_rounded,
      tint: Color(0xFFD97706),
      bg: Color(0xFFFFFBEB),
      text: 'اختر وقتاً هادئاً في الصباح الباكر قبل بداية اليوم.',
    ),
    (
      icon: Icons.place_rounded,
      tint: Color(0xFF0284C7),
      bg: Color(0xFFF0F9FF),
      text: 'اختر مكاناً هادئاً بعيداً عن الضوضاء والمشتتات.',
    ),
    (
      icon: Icons.menu_book_rounded,
      tint: Color(0xFF059669),
      bg: Color(0xFFECFDF5),
      text: 'ابدأ بقراءة الكتاب المقدس ثم الصلاة والتأمل.',
    ),
    (
      icon: Icons.mobile_off_rounded,
      tint: Color(0xFF4F46E5),
      bg: Color(0xFFEEF2FF),
      text: 'أبعد هاتفك أثناء وقتك مع الله وركز على الحضور الإلهي.',
    ),
    (
      icon: Icons.schedule_rounded,
      tint: Color(0xFFE11D48),
      bg: Color(0xFFFFF1F2),
      text: 'حتى 15 دقيقة يومياً كافية للبدء، الاستمرارية هي المفتاح.',
    ),
  ];

  TimeOfDay _time = const TimeOfDay(hour: 7, minute: 0);
  var _loading = true;
  var _saving = false;

  List<BibleBookInfo> _books = const [];
  var _oldTestament = true;
  BibleBookInfo? _book;
  final _chapters = <int>{};
  final _bookKeys = <String, GlobalKey>{};
  final _chapterKeys = <int, GlobalKey>{};
  final _bookScroll = ScrollController();
  final _chapterScroll = ScrollController();
  ActiveReadingPlan? _loadedPlan;
  var _pinnedBook = false;
  var _pinnedChapters = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _bookScroll.dispose();
    _chapterScroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final books = await loadBibleCatalog();
      final plan = await ActiveReadingPlanService().load();
      final reader = await BibleReaderPrefs.load();
      final suggestion = await suggestTodayReading();
      BibleBookInfo? book;
      final chapters = <int>{};
      if (books.isNotEmpty) {
        // Same source as Home "اقتراح قراءة اليوم".
        book = findBibleBook(books, name: suggestion.bookName);
        final suggestedChapter = suggestion.chapter;
        if (book != null && suggestedChapter != null) {
          chapters.add(suggestedChapter.clamp(1, book.chapters));
        }

        // Fall back to last opened reader position.
        if (book == null) {
          book = findBibleBook(books, id: reader.bookId);
          if (book != null) {
            chapters.add(reader.chapter.clamp(1, book.chapters));
          }
        }

        // Fall back to the active reading plan (match by id or Arabic name).
        if (book == null && plan != null) {
          book = findBibleBook(
            books,
            id: plan.bookId,
            name: plan.bookName,
          );
          if (book != null) {
            chapters.addAll(plan.resumeChapters(book.chapters));
          }
        }

        book ??= books.firstWhere(
          (item) => (int.tryParse(item.id) ?? 0) <= 39,
          orElse: () => books.first,
        );
      }

      final userId = supabase.auth.currentUser?.id;
      if (userId != null) {
        try {
          final data = await supabase
              .from('profiles')
              .select('devotion_time')
              .eq('id', userId)
              .maybeSingle();
          final raw = data?['devotion_time'] as String?;
          if (raw != null && raw.contains(':')) {
            final parts = raw.split(':');
            _time = TimeOfDay(
              hour: int.parse(parts[0]),
              minute: int.parse(parts[1]),
            );
          }
        } catch (_) {
          // Keep the default morning time when the profile cannot be read.
        }
      }

      // Keep reader prefs aligned with the home suggestion.
      if (book != null && chapters.isNotEmpty) {
        final chapter = (chapters.toList()..sort()).first;
        if (reader.bookId != book.id || reader.chapter != chapter) {
          reader.bookId = book.id;
          reader.chapter = chapter;
          await reader.save();
        }
      }

      if (!mounted) return;
      setState(() {
        _loadedPlan = plan;
        _books = books;
        _book = book;
        _oldTestament = (int.tryParse(book?.id ?? '1') ?? 1) <= 39;
        _chapters
          ..clear()
          ..addAll(chapters);
        if (_chapters.isEmpty && book != null) _chapters.add(1);
        _pinnedBook = false;
        _pinnedChapters = false;
        _loading = false;
      });
      _scheduleSelectionScroll();
    } catch (_) {
      // Catalog/time failures still allow the screen to render defaults.
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scheduleSelectionScroll() {
    void run() {
      if (!mounted || _book == null) return;
      _scrollToBook(_book!);
      _scrollToSelectedChapter();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      run();
      WidgetsBinding.instance.addPostFrameCallback((_) => run());
    });
  }

  void _scrollToBook(BibleBookInfo book) {
    final chipContext = _bookKeys[book.id]?.currentContext;
    final target = chipContext?.findRenderObject();
    if (chipContext != null && target != null) {
      Scrollable.of(chipContext).position.ensureVisible(
            target,
            alignment: 0.5,
            duration: const Duration(milliseconds: 220),
          );
      return;
    }
    final index = _visibleBooks.indexWhere((item) => item.id == book.id);
    if (index <= 0 || !_bookScroll.hasClients) return;
    const estimate = 84.0;
    final extent = _bookScroll.position.maxScrollExtent;
    final raw = index * estimate - _bookScroll.position.viewportDimension / 2;
    _bookScroll.jumpTo(raw.clamp(0.0, extent));
  }

  void _scrollToSelectedChapter() {
    if (_chapters.isEmpty) return;
    final first = (_chapters.toList()..sort()).first;
    _pinnedChapters = true;
    final chipContext = _chapterKeys[first]?.currentContext;
    final target = chipContext?.findRenderObject();
    if (chipContext != null && target != null) {
      Scrollable.of(chipContext).position.ensureVisible(
            target,
            alignment: 0.5,
            duration: const Duration(milliseconds: 220),
          );
      return;
    }
    if (first <= 1 || !_chapterScroll.hasClients) return;
    const itemExtent = 56.0; // 48 width + 8 separator
    final metrics = _chapterScroll.position;
    if (metrics.maxScrollExtent <= 0) return;
    final raw =
        (first - 1) * itemExtent - (metrics.viewportDimension - 48) / 2;
    _chapterScroll.jumpTo(raw.clamp(0.0, metrics.maxScrollExtent));
  }

  List<BibleBookInfo> get _visibleBooks => _books.where((book) {
        final id = int.tryParse(book.id) ?? 0;
        return _oldTestament ? id <= 39 : id >= 40;
      }).toList();

  String get _time24 =>
      '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

  String get _timeClock {
    final hour = _time.hourOfPeriod == 0 ? 12 : _time.hourOfPeriod;
    return '${hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';
  }

  String get _periodLabel => _time.period == DayPeriod.am ? 'ص' : 'م';

  String get _summaryLabel {
    final book = _book;
    if (book == null || _chapters.isEmpty) return 'اختر سفرًا وأصحاحًا';
    final sorted = _chapters.toList()..sort();
    if (sorted.length == 1) {
      return '${_bookTitle(book.name)} — أصحاح ${_arabic(sorted.first)}';
    }
    final contiguous =
        sorted.last - sorted.first + 1 == sorted.length;
    final chapters = contiguous
        ? 'من ${_arabic(sorted.first)} إلى ${_arabic(sorted.last)}'
        : '${_arabic(sorted.length)} أصحاحات';
    return '${_bookTitle(book.name)} — $chapters';
  }

  String _bookTitle(String name) {
    final gospel = _books.any((book) {
      final id = int.tryParse(book.id) ?? 0;
      return book.name == name && id >= 40 && id <= 43;
    });
    return gospel && !name.startsWith('إنجيل') ? 'إنجيل $name' : name;
  }

  String _arabic(int value) => '$value'.replaceAllMapped(
        RegExp(r'\d'),
        (m) => String.fromCharCode(0x0660 + int.parse(m[0]!)),
      );

  Future<void> _pick() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }

  void _selectTestament(bool oldTestament) {
    if (_oldTestament == oldTestament) return;
    final books = _books
        .where((book) => ((int.tryParse(book.id) ?? 0) <= 39) == oldTestament)
        .toList();
    if (books.isEmpty) return;
    setState(() {
      _oldTestament = oldTestament;
      _book = books.first;
      _chapters
        ..clear()
        ..add(1);
    });
    if (_bookScroll.hasClients) _bookScroll.jumpTo(0);
    if (_chapterScroll.hasClients) _chapterScroll.jumpTo(0);
  }

  void _selectBook(BibleBookInfo book) {
    if (_book?.id == book.id) return;
    setState(() {
      _book = book;
      _oldTestament = (int.tryParse(book.id) ?? 0) <= 39;
      _chapters
        ..clear()
        ..add(1);
    });
    if (_chapterScroll.hasClients) _chapterScroll.jumpTo(0);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final chipContext = _bookKeys[book.id]?.currentContext;
      final target = chipContext?.findRenderObject();
      if (chipContext != null && target != null) {
        Scrollable.of(chipContext).position.ensureVisible(
              target,
              alignment: 0.5,
              duration: const Duration(milliseconds: 150),
            );
      }
    });
  }

  void _pinBook(ScrollMetrics metrics) {
    if (_pinnedBook || _book == null) return;
    final index = _visibleBooks.indexWhere((item) => item.id == _book!.id);
    if (index <= 0) {
      _pinnedBook = true;
      return;
    }
    if (metrics.maxScrollExtent <= 0) return;
    _pinnedBook = true;
    const estimate = 84.0;
    final raw = index * estimate - metrics.viewportDimension / 2;
    final target = raw.clamp(0.0, metrics.maxScrollExtent);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_bookScroll.hasClients) return;
      _bookScroll.jumpTo(target);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final chipContext = _bookKeys[_book?.id]?.currentContext;
        final render = chipContext?.findRenderObject();
        if (chipContext == null || render == null) return;
        Scrollable.of(chipContext).position.ensureVisible(
              render,
              alignment: 0.5,
              duration: const Duration(milliseconds: 180),
            );
      });
    });
  }

  void _pinChapters(ScrollMetrics metrics) {
    if (_pinnedChapters || _chapters.isEmpty) return;
    final first = (_chapters.toList()..sort()).first;
    if (first <= 1) {
      _pinnedChapters = true;
      return;
    }
    if (metrics.maxScrollExtent <= 0) return;
    _pinnedChapters = true;
    const extent = 56.0;
    final raw = (first - 1) * extent - (metrics.viewportDimension - 48) / 2;
    final target = raw.clamp(0.0, metrics.maxScrollExtent);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_chapterScroll.hasClients) return;
      _chapterScroll.animateTo(
        target,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  void _shiftBook(int offset) {
    final books = _visibleBooks;
    final index = books.indexWhere((book) => book.id == _book?.id);
    final next = index + offset;
    if (index < 0 || next < 0 || next >= books.length) return;
    _selectBook(books[next]);
  }

  void _toggleChapter(int chapter) {
    setState(() {
      if (!_chapters.add(chapter)) {
        _chapters.remove(chapter);
      }
    });
  }

  void _selectAllChapters() {
    final book = _book;
    if (book == null) return;
    setState(() {
      _chapters
        ..clear()
        ..addAll(List.generate(book.chapters, (i) => i + 1));
    });
  }

  void _clearSelection() {
    setState(_chapters.clear);
  }

  Future<void> _save() async {
    if (_book == null || _chapters.isEmpty) return;
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _saving = true);
    try {
      final synced =
          await OfflineSync.saveProfile(userId, {'devotion_time': _time24});
      await DevotionReminder.instance.scheduleDaily(
        hour: _time.hour,
        minute: _time.minute,
      );
      if (await FocusMode.preference() == FocusModePreference.automatic) {
        await FocusMode.schedule(_time.hour, _time.minute);
      }

      final book = _book;
      if (book != null && _chapters.isNotEmpty) {
        final loaded = _loadedPlan;
        final resume = loaded?.resumeChapters(book.chapters).toSet() ?? {};
        final unchanged = loaded != null &&
            loaded.bookId == book.id &&
            resume.length == _chapters.length &&
            resume.containsAll(_chapters);
        if (!unchanged) {
          final sorted = _chapters.toList()..sort();
          final start = sorted.first;
          final pace = sorted.length;
          final remaining = book.chapters - start + 1;
          final days = (remaining / pace).ceil().clamp(1, remaining);
          final next = ActiveReadingPlan(
            bookId: book.id,
            bookName: book.name,
            startChapter: start,
            chaptersPerDay: pace,
            days: days,
            completedDays: 0,
          );
          await ActiveReadingPlanService().save(next);
          _loadedPlan = next;
          final reader = await BibleReaderPrefs.load();
          reader.bookId = book.id;
          reader.chapter = start;
          await reader.save();
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            synced ? 'تم حفظ وقتك مع الله: $_time24' : offlineSavedMessage,
          ),
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
    final bg = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          Column(
            children: [
              _SettingsHeader(
                dark: isDark,
                onBack: widget.showBack
                    ? () => Navigator.of(context).maybePop()
                    : null,
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                        children: [
                          const _HeroCard(),
                          const SizedBox(height: 16),
                          _PlanCard(
                            dark: isDark,
                            timeClock: _timeClock,
                            periodLabel: _periodLabel,
                            saving: _saving,
                            canSave: _book != null && _chapters.isNotEmpty,
                            summaryLabel: _summaryLabel,
                            books: _visibleBooks,
                            book: _book,
                            oldTestament: _oldTestament,
                            chapters: _chapters,
                            bookKeys: _bookKeys,
                            chapterKeys: _chapterKeys,
                            bookScroll: _bookScroll,
                            chapterScroll: _chapterScroll,
                            bookTitle: _book == null
                                ? 'اختر سفرًا'
                                : _bookTitle(_book!.name),
                            chapterCountLabel: _book == null
                                ? ''
                                : '${_arabic(_book!.chapters)} أصحاحاً',
                            arabic: _arabic,
                            onPickTime: _pick,
                            onTestament: _selectTestament,
                            onSelectBook: _selectBook,
                            onShiftBook: _shiftBook,
                            onToggleChapter: _toggleChapter,
                            onSelectAll: _selectAllChapters,
                            onClear: _clearSelection,
                            onSave: _save,
                            onBookMetrics: _pinBook,
                            onChapterMetrics: _pinChapters,
                          ),
                          const SizedBox(height: 16),
                          _TipsCard(dark: isDark, tips: _tips),
                        ],
                      ),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: widget.showBack
          ? _AppTabBar(
              isDark: isDark,
              currentIndex: -1,
              onTap: (index) => context.go('${Routes.mainTabs}?tab=$index'),
            )
          : null,
    );
  }
}

class _SettingsHeader extends StatelessWidget {
  const _SettingsHeader({required this.dark, this.onBack});

  final bool dark;
  final VoidCallback? onBack;

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
          if (onBack != null) ...[
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
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'إعدادات الخلوة',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  AppStrings.moreDailyReminderTitle,
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
                  ? const Color(0xFF78350F).withValues(alpha: 0.35)
                  : const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: dark
                    ? const Color(0xFFFBBF24).withValues(alpha: 0.3)
                    : const Color(0xFFFEF3C7),
              ),
            ),
            child: Icon(
              Icons.alarm_on_rounded,
              size: 20,
              color: dark ? const Color(0xFFFBBF24) : const Color(0xFFD97706),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E1B4B),
            Color(0xFF0F172A),
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 5,
                ),
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
                      Icons.alarm_rounded,
                      size: 12,
                      color: Color(0xFFFCD34D),
                    ),
                    SizedBox(width: 6),
                    Text(
                      'تذكير يومي',
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
                  Icons.event_available_rounded,
                  size: 20,
                  color: Color(0xFFFCD34D),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'خصص لحظة ثابتة كل يوم لوقت هادئ مع الله',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppStrings.moreDailyReminderSubtitle,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Color(0xFFCBD5E1),
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.dark,
    required this.timeClock,
    required this.periodLabel,
    required this.saving,
    required this.canSave,
    required this.summaryLabel,
    required this.books,
    required this.book,
    required this.oldTestament,
    required this.chapters,
    required this.bookKeys,
    required this.chapterKeys,
    required this.bookScroll,
    required this.chapterScroll,
    required this.bookTitle,
    required this.chapterCountLabel,
    required this.arabic,
    required this.onPickTime,
    required this.onTestament,
    required this.onSelectBook,
    required this.onShiftBook,
    required this.onToggleChapter,
    required this.onSelectAll,
    required this.onClear,
    required this.onSave,
    required this.onBookMetrics,
    required this.onChapterMetrics,
  });

  final bool dark;
  final String timeClock;
  final String periodLabel;
  final bool saving;
  final bool canSave;
  final String summaryLabel;
  final List<BibleBookInfo> books;
  final BibleBookInfo? book;
  final bool oldTestament;
  final Set<int> chapters;
  final Map<String, GlobalKey> bookKeys;
  final Map<int, GlobalKey> chapterKeys;
  final ScrollController bookScroll;
  final ScrollController chapterScroll;
  final String bookTitle;
  final String chapterCountLabel;
  final String Function(int) arabic;
  final VoidCallback onPickTime;
  final ValueChanged<bool> onTestament;
  final ValueChanged<BibleBookInfo> onSelectBook;
  final ValueChanged<int> onShiftBook;
  final ValueChanged<int> onToggleChapter;
  final VoidCallback onSelectAll;
  final VoidCallback onClear;
  final VoidCallback onSave;
  final ValueChanged<ScrollMetrics> onBookMetrics;
  final ValueChanged<ScrollMetrics> onChapterMetrics;

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final soft = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final sorted = chapters.toList()..sort();

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
              Icon(
                Icons.menu_book_rounded,
                size: 18,
                color: dark ? const Color(0xFFFBBF24) : const Color(0xFFD97706),
              ),
              const SizedBox(width: 6),
              Text(
                'خطة القراءة اليومية',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'حدد المكان اللي هتبدأ منه والقراءات اليومية',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: muted,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: soft,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: border.withValues(alpha: 0.85),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الوقت المختار',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: muted,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            timeClock,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: titleColor,
                              height: 1,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              periodLabel,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: muted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Material(
                  color: dark ? AppColors.darkCard : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    onTap: onPickTime,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: border),
                      ),
                      child: Icon(
                        Icons.edit_rounded,
                        size: 20,
                        color: dark
                            ? const Color(0xFFFBBF24)
                            : const Color(0xFFD97706),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'اختار السفر والإصحاحات اللي هتبدأ بيهم خطتك اليومية.',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: muted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          Divider(color: border, height: 1),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: dark ? AppColors.darkCardMuted : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                _TestamentTab(
                  dark: dark,
                  selected: oldTestament,
                  label: 'العهد القديم (٣٩ سفراً)',
                  showIcon: oldTestament,
                  onTap: () => onTestament(true),
                ),
                _TestamentTab(
                  dark: dark,
                  selected: !oldTestament,
                  label: 'العهد الجديد (٢٧ سفراً)',
                  showIcon: !oldTestament,
                  onTap: () => onTestament(false),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'السفر النشط',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFFBBF24),
                        ),
                      ),
                    ),
                    const Spacer(),
                    _BookArrow(
                      enabled: books.indexWhere((b) => b.id == book?.id) > 0,
                      icon: Icons.chevron_left_rounded,
                      onTap: () => onShiftBook(-1),
                    ),
                    const SizedBox(width: 4),
                    _BookArrow(
                      enabled: () {
                        final i = books.indexWhere((b) => b.id == book?.id);
                        return i >= 0 && i < books.length - 1;
                      }(),
                      icon: Icons.chevron_right_rounded,
                      onTap: () => onShiftBook(1),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Text(
                        bookTitle,
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    Text(
                      chapterCountLabel,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFCBD5E1),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 32,
                  child: NotificationListener<ScrollMetricsNotification>(
                    onNotification: (notification) {
                      onBookMetrics(notification.metrics);
                      return false;
                    },
                    child: ListView.separated(
                      controller: bookScroll,
                      scrollDirection: Axis.horizontal,
                      itemCount: books.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 6),
                      itemBuilder: (context, index) {
                        final item = books[index];
                        final selected = book?.id == item.id;
                        return Material(
                          key: bookKeys.putIfAbsent(item.id, GlobalKey.new),
                          color: selected
                              ? const Color(0xFFFBBF24)
                              : Colors.white.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(8),
                          child: InkWell(
                            onTap: () => onSelectBook(item),
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              child: Text(
                                item.name,
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: selected
                                      ? const Color(0xFF0F172A)
                                      : const Color(0xFFCBD5E1),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: soft,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.format_list_numbered_rounded,
                      size: 16,
                      color: dark
                          ? const Color(0xFFFBBF24)
                          : const Color(0xFFD97706),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        'حدد الأصحاح للقراءة:',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: titleColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: dark
                                ? const Color(0xFF78350F).withValues(alpha: 0.4)
                                : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            sorted.isEmpty
                                ? 'لم يُحدد'
                                : sorted.length == 1
                                    ? 'أصحاح ${arabic(sorted.first)}'
                                    : '${arabic(sorted.length)} أصحاحات',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: dark
                                  ? const Color(0xFFFCD34D)
                                  : const Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      'اختر الأصحاح المطلوب:',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: muted,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: book == null ? null : onSelectAll,
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'تحديد الكل',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: book == null
                              ? muted
                              : const Color(0xFF0284C7),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    TextButton(
                      onPressed: chapters.isEmpty ? null : onClear,
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'مسح الكل',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: chapters.isEmpty
                              ? muted
                              : const Color(0xFF0284C7),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 64,
                  child: NotificationListener<ScrollMetricsNotification>(
                    onNotification: (notification) {
                      onChapterMetrics(notification.metrics);
                      return false;
                    },
                    child: ListView.separated(
                      controller: chapterScroll,
                      scrollDirection: Axis.horizontal,
                      itemCount: book?.chapters ?? 0,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final chapter = index + 1;
                        final selected = chapters.contains(chapter);
                        return SizedBox(
                          key: chapterKeys.putIfAbsent(
                            chapter,
                            GlobalKey.new,
                          ),
                          width: 48,
                          height: 64,
                          child: Material(
                            color: selected
                                ? const Color(0xFF0F172A)
                                : (dark ? AppColors.darkCard : Colors.white),
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              onTap: () => onToggleChapter(chapter),
                              borderRadius: BorderRadius.circular(16),
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: selected
                                        ? const Color(0xFFFBBF24)
                                        : border,
                                    width: selected ? 1.5 : 1,
                                  ),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'أصحاح',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 9,
                                        height: 1.05,
                                        fontWeight: FontWeight.w700,
                                        color: selected
                                            ? const Color(0xFFFBBF24)
                                            : muted,
                                      ),
                                    ),
                                    Text(
                                      arabic(chapter),
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 13,
                                        height: 1.1,
                                        fontWeight: FontWeight.w900,
                                        color: selected
                                            ? Colors.white
                                            : titleColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: dark
                  ? const Color(0xFF78350F).withValues(alpha: 0.3)
                  : const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: dark
                    ? const Color(0xFFFBBF24).withValues(alpha: 0.3)
                    : const Color(0xFFFDE68A).withValues(alpha: 0.6),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.bookmark_rounded,
                  size: 16,
                  color:
                      dark ? const Color(0xFFFBBF24) : const Color(0xFFB45309),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    summaryLabel,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      height: 1.35,
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                    ),
                  ),
                ),
                Material(
                  color: dark ? AppColors.darkCard : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  child: InkWell(
                    onTap: onClear,
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: Icon(
                        Icons.delete_outline_rounded,
                        size: 16,
                        color: muted,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Opacity(
            opacity: canSave && !saving ? 1 : 0.45,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: saving || !canSave ? null : onSave,
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
                    boxShadow: canSave
                        ? [
                            BoxShadow(
                              color: const Color(0xFF0EA5E9)
                                  .withValues(alpha: 0.22),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ]
                        : null,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (saving)
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        else
                          const Icon(
                            Icons.save_rounded,
                            size: 18,
                            color: Colors.white,
                          ),
                        const SizedBox(width: 8),
                        Text(
                          saving
                              ? 'جارٍ الحفظ...'
                              : canSave
                                  ? 'حفظ الوقت والخطة'
                                  : 'اختر أصحاحًا للحفظ',
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
          ),
        ],
      ),
    );
  }
}

class _TestamentTab extends StatelessWidget {
  const _TestamentTab({
    required this.dark,
    required this.selected,
    required this.label,
    required this.showIcon,
    required this.onTap,
  });

  final bool dark;
  final bool selected;
  final String label;
  final bool showIcon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: selected
            ? (dark ? AppColors.darkCard : Colors.white)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (showIcon) ...[
                  Icon(
                    Icons.auto_stories_rounded,
                    size: 14,
                    color: dark
                        ? const Color(0xFFFBBF24)
                        : const Color(0xFFD97706),
                  ),
                  const SizedBox(width: 4),
                ],
                Flexible(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                      color: selected
                          ? (dark
                              ? AppColors.darkText
                              : const Color(0xFF0F172A))
                          : (dark
                              ? AppColors.darkMutedText
                              : const Color(0xFF64748B)),
                    ),
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

class _BookArrow extends StatelessWidget {
  const _BookArrow({
    required this.enabled,
    required this.icon,
    required this.onTap,
  });

  final bool enabled;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 28,
      height: 28,
      child: Material(
        color: Colors.white.withValues(alpha: 0.10),
        shape: const CircleBorder(),
        child: InkWell(
          onTap: enabled ? onTap : null,
          customBorder: const CircleBorder(),
          child: Icon(
            icon,
            size: 16,
            color: enabled ? Colors.white : Colors.white30,
          ),
        ),
      ),
    );
  }
}

class _TipsCard extends StatelessWidget {
  const _TipsCard({required this.dark, required this.tips});

  final bool dark;
  final List<({IconData icon, Color tint, Color bg, String text})> tips;

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF64748B);

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
              Icon(
                Icons.tips_and_updates_rounded,
                size: 18,
                color: dark ? const Color(0xFFFBBF24) : const Color(0xFFD97706),
              ),
              const SizedBox(width: 6),
              Text(
                'نصائح لوقت هادئ مع الله',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'خطوات صغيرة تساعدك على الاستمرار كل يوم',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: muted,
            ),
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < tips.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: dark
                          ? tips[i].tint.withValues(alpha: 0.18)
                          : tips[i].bg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(tips[i].icon, size: 18, color: tips[i].tint),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (i + 1).toString().padLeft(2, '0'),
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: tips[i].tint,
                          ),
                        ),
                        Text(
                          tips[i].text,
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: titleColor,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
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
