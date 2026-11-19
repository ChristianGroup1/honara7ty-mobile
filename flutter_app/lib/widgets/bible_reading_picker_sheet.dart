import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../features/reading/bible_catalog.dart';
import '../providers/theme_provider.dart';

String arabicDigits(String value) => value.replaceAllMapped(
      RegExp(r'\d'),
      (m) => '٠١٢٣٤٥٦٧٨٩'[int.parse(m.group(0)!)],
    );

class BibleReadingPlanResult {
  const BibleReadingPlanResult({
    required this.book,
    required this.chapters,
    this.days,
  });

  final BibleBookInfo book;
  final List<int> chapters;
  final int? days;
}

Future<BibleReadingPlanResult?> showBibleReadingPlanSheet({
  required BuildContext context,
  required List<BibleBookInfo> books,
  BibleBookInfo? initialBook,
  Set<int> initialChapters = const {},
  int? initialDays,
  String title = 'خطة القراءة المشتركة',
  String subtitle = 'اختر السفر والأصحاحات ومدة الخطة للمجموعة',
  String confirmLabel = 'حفظ الخطة',
  bool showDays = true,
}) {
  return showModalBottomSheet<BibleReadingPlanResult>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    enableDrag: true,
    useSafeArea: true,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.45),
    builder: (context) => _BibleReadingPlanSheet(
      books: books,
      initialBook: initialBook,
      initialChapters: initialChapters,
      initialDays: initialDays,
      title: title,
      subtitle: subtitle,
      confirmLabel: confirmLabel,
      showDays: showDays,
    ),
  );
}

class _BibleReadingPlanSheet extends StatefulWidget {
  const _BibleReadingPlanSheet({
    required this.books,
    required this.initialBook,
    required this.initialChapters,
    required this.initialDays,
    required this.title,
    required this.subtitle,
    required this.confirmLabel,
    required this.showDays,
  });

  final List<BibleBookInfo> books;
  final BibleBookInfo? initialBook;
  final Set<int> initialChapters;
  final int? initialDays;
  final String title;
  final String subtitle;
  final String confirmLabel;
  final bool showDays;

  @override
  State<_BibleReadingPlanSheet> createState() => _BibleReadingPlanSheetState();
}

class _BibleReadingPlanSheetState extends State<_BibleReadingPlanSheet> {
  static const _navy = AppColors.navy;
  static const _yellow = AppColors.champagne;
  static const _amber = AppColors.steelDark;
  static const _slate = AppColors.lightMutedText;
  static const _caption = AppColors.lightMutedText;

  late var _oldTestament = false;
  BibleBookInfo? _book;
  late final Set<int> _chapters;
  late final TextEditingController _days;
  final _bookKeys = <String, GlobalKey>{};
  final _bookScroll = ScrollController();
  final _chapterScroll = ScrollController();
  var _pinnedBook = false;
  var _pinnedChapters = false;

  bool get _dark => context.read<ThemeProvider>().isNightMode;
  Color get _surface => _dark ? AppColors.darkCard : Colors.white;
  Color get _muted => _dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
  Color get _border => _dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
  Color get _text => _dark ? AppColors.darkText : _navy;

  List<BibleBookInfo> get _visibleBooks => widget.books.where((book) {
        final id = int.tryParse(book.id) ?? 0;
        return _oldTestament ? id <= 39 : id >= 40;
      }).toList();

  TextStyle _font(
    double size,
    Color color, [
    FontWeight weight = FontWeight.w700,
  ]) =>
      TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: size,
        color: color,
        fontWeight: weight,
        height: 1.4,
      );

  @override
  void initState() {
    super.initState();
    _chapters = {...widget.initialChapters};
    _days = TextEditingController(
      text: (widget.initialDays ?? 30).toString(),
    );
    if (widget.books.isEmpty) return;
    _book = widget.initialBook ??
        widget.books.firstWhere(
          (book) => (int.tryParse(book.id) ?? 0) >= 40,
          orElse: () => widget.books.first,
        );
    _oldTestament = (int.tryParse(_book!.id) ?? 0) <= 39;
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

  @override
  void dispose() {
    _days.dispose();
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

  void _selectBook(BibleBookInfo book) {
    if (_book?.id == book.id) return;
    setState(() {
      _book = book;
      _oldTestament = (int.tryParse(book.id) ?? 0) <= 39;
      _chapters.clear();
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

  void _selectTestament(bool oldTestament) {
    if (_oldTestament == oldTestament) return;
    final books = widget.books
        .where((book) => ((int.tryParse(book.id) ?? 0) <= 39) == oldTestament)
        .toList();
    if (books.isNotEmpty) _selectBook(books.first);
    if (_bookScroll.hasClients) _bookScroll.jumpTo(0);
  }

  String get _selectionLabel {
    final sorted = _chapters.toList()..sort();
    if (sorted.isEmpty) return 'لم تحدد أصحاحات';
    if (sorted.length == 1) {
      return 'الأصحاح ${arabicDigits('${sorted.first}')}';
    }
    final count = arabicDigits('${sorted.length}');
    if (sorted.last - sorted.first + 1 == sorted.length) {
      return 'من ${arabicDigits('${sorted.first}')} إلى ${arabicDigits('${sorted.last}')} ($count أصحاحات)';
    }
    return '$count أصحاحات محددة';
  }

  Widget _testamentTab(bool oldTestament) {
    final selected = _oldTestament == oldTestament;
    return Expanded(
      child: Material(
        color: selected ? _surface : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _selectTestament(oldTestament),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 5),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (selected) ...[
                  const Icon(
                    Icons.auto_stories_outlined,
                    size: 14,
                    color: Color(0xFFD97706),
                  ),
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
                      FontWeight.w800,
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

  Widget _bookArrow(int offset, IconData icon) {
    final books = _visibleBooks;
    final index = books.indexWhere((book) => book.id == _book?.id);
    final next = index + offset;
    final enabled = index >= 0 && next >= 0 && next < books.length;
    return SizedBox(
      width: 24,
      height: 24,
      child: IconButton(
        onPressed: enabled ? () => _selectBook(books[next]) : null,
        padding: EdgeInsets.zero,
        style: IconButton.styleFrom(
          backgroundColor: Colors.white.withValues(alpha: 0.1),
          foregroundColor: Colors.white,
          disabledForegroundColor: Colors.white30,
        ),
        icon: Icon(icon, size: 14, textDirection: TextDirection.ltr),
      ),
    );
  }

  Widget _bookCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _navy,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(
            color: _navy.withValues(alpha: 0.12),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text('السفر النشط', style: _font(10, _yellow)),
              ),
              const Spacer(),
              _bookArrow(-1, Icons.chevron_right_rounded),
              const SizedBox(width: 4),
              _bookArrow(1, Icons.chevron_left_rounded),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  _book == null ? 'اختر سفرًا' : _bookTitle(_book!.name),
                  style: _font(20, Colors.white, FontWeight.w900),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${arabicDigits('${_book?.chapters ?? 0}')} أصحاحاً',
                style: _font(12, const Color(0xFFCBD5E1), FontWeight.w400),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 28,
            child: NotificationListener<ScrollMetricsNotification>(
              onNotification: (notification) {
                _pinBook(notification.metrics);
                return false;
              },
              child: ListView.separated(
                controller: _bookScroll,
                scrollDirection: Axis.horizontal,
                itemCount: _visibleBooks.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (context, index) {
                  final item = _visibleBooks[index];
                  final selected = _book?.id == item.id;
                  return Material(
                    key: _bookKeys.putIfAbsent(item.id, GlobalKey.new),
                    color: selected
                        ? _yellow
                        : Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      onTap: () => _selectBook(item),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        child: Text(
                          item.name,
                          style: _font(
                            11,
                            selected
                                ? const Color(0xFF020617)
                                : const Color(0xFFCBD5E1),
                            selected ? FontWeight.w900 : FontWeight.w700,
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
    );
  }

  Widget _chapterCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _muted,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(color: _border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              Text(
                'حدد نطاق الأصحاحات:',
                style: _font(12, _text, FontWeight.w800),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                decoration: BoxDecoration(
                  color: _dark
                      ? _yellow.withValues(alpha: 0.12)
                      : const Color(0xFFFFF5D6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _selectionLabel,
                  style: _font(11, _dark ? _yellow : _amber),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  'أو انقر لتخصيص الأصحاح:',
                  style: _font(11, _dark ? _caption : _slate),
                ),
              ),
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
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'تحديد الكل',
                  style: _font(10, const Color(0xFF2563EB)),
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => setState(_chapters.clear),
                style: TextButton.styleFrom(
                  minimumSize: const Size(44, 32),
                  padding: EdgeInsets.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'مسح الكل',
                  style: _font(10, const Color(0xFF2563EB)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (_book != null)
            SizedBox(
              height: 64,
              child: NotificationListener<ScrollMetricsNotification>(
                onNotification: (notification) {
                  _pinChapters(notification.metrics);
                  return false;
                },
                child: ListView.separated(
                  controller: _chapterScroll,
                  scrollDirection: Axis.horizontal,
                  itemCount: _book!.chapters,
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final chapter = index + 1;
                    final selected = _chapters.contains(chapter);
                    return Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                  color: _yellow.withValues(alpha: 0.2),
                                  spreadRadius: 2,
                                  blurRadius: 0,
                                ),
                              ]
                            : null,
                      ),
                      child: Material(
                        color: selected ? _navy : _surface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: selected
                                ? _yellow
                                : (_dark ? _border : const Color(0xFFE2E8F0)),
                            width: selected ? 2 : 1,
                          ),
                        ),
                        child: InkWell(
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
                                Text(
                                  'أصحاح',
                                  style: _font(
                                    9,
                                    selected ? _yellow : _caption,
                                    selected
                                        ? FontWeight.w700
                                        : FontWeight.w400,
                                  ),
                                ),
                                Text(
                                  arabicDigits('$chapter'),
                                  style: _font(
                                    14,
                                    selected
                                        ? Colors.white
                                        : (_dark
                                            ? _text
                                            : const Color(0xFF475569)),
                                    FontWeight.w900,
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
    );
  }

  void _save() {
    final book = _book;
    if (book == null || _chapters.isEmpty) return;
    final sorted = _chapters.toList()..sort();
    Navigator.pop(
      context,
      BibleReadingPlanResult(
        book: book,
        chapters: sorted,
        days: widget.showDays ? int.tryParse(_days.text) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<ThemeProvider>();
    final media = MediaQuery.of(context);
    final bottomInset = media.viewInsets.bottom > media.viewPadding.bottom
        ? media.viewInsets.bottom
        : media.viewPadding.bottom;
    final canSave = _book != null && _chapters.isNotEmpty;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Align(
        alignment: Alignment.bottomCenter,
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: media.size.height * 0.92),
          child: Material(
            color: _surface,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(36)),
            clipBehavior: Clip.antiAlias,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                    const SizedBox(height: 20),
                    Container(
                      width: 48,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _dark ? _border : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: _font(16, _text, FontWeight.w800),
                            ),
                            Text(
                              widget.subtitle,
                              style: _font(11, _caption, FontWeight.w400),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 32,
                        height: 32,
                        child: IconButton(
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          style: IconButton.styleFrom(
                            backgroundColor:
                                _dark ? _muted : const Color(0xFFF1F5F9),
                          ),
                          icon: const Icon(
                            Icons.close_rounded,
                            color: _slate,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Divider(height: 1, color: _border),
                ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: _dark ? _muted : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              _testamentTab(false),
                              const SizedBox(width: 4),
                              _testamentTab(true),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        _bookCard(),
                        const SizedBox(height: 16),
                        _chapterCard(),
                        if (widget.showDays) ...[
                          const SizedBox(height: 16),
                          TextField(
                            controller: _days,
                            keyboardType: TextInputType.number,
                            style: _font(15, _text, FontWeight.w700),
                            decoration: InputDecoration(
                              labelText: 'عدد الأيام',
                              labelStyle: _font(13, _caption),
                              filled: true,
                              fillColor: _muted,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: _border),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide(color: _border),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: const BorderSide(
                                  color: Color(0xFF0EA5E9),
                                  width: 1.5,
                                ),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
                Container(
                  padding: EdgeInsets.fromLTRB(20, 12, 20, bottomInset + 18),
                  decoration: BoxDecoration(
                    color: _surface,
                    border: Border(top: BorderSide(color: _border)),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: canSave ? _save : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: _navy,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: _border,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              widget.confirmLabel,
                              style: _font(
                                14,
                                canSave ? Colors.white : _caption,
                                FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.check_rounded, size: 18),
                        ],
                      ),
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
