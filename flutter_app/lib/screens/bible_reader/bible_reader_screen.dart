import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/memorization/memorization_service.dart';
import '../../features/reading/bible_tools.dart';
import '../../features/reading/verse_annotations.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';
import '../../widgets/youth_sheets.dart';

/// Pastel markers — readable under dark verse text.
const _highlightsOnDarkInk = [
  Color(0xFFFFF1A8),
  Color(0xFFD9F99D),
  AppColors.steelLight,
  Color(0xFFFBCFE8),
];

/// Deeper markers — readable under white / light verse text.
const _highlightsOnLightInk = [
  Color(0xFFB45309),
  Color(0xFF3F6212),
  Color(0xFF0369A1),
  Color(0xFF9D174D),
];

class BibleReaderScreen extends StatefulWidget {
  const BibleReaderScreen({super.key, this.showBack = true});

  final bool showBack;

  @override
  State<BibleReaderScreen> createState() => _BibleReaderScreenState();
}

class _BibleReaderScreenState extends State<BibleReaderScreen> {
  final _notes = VerseAnnotationStore();
  List<_Book> _books = [];
  _Book? _book;
  int _chapter = 1;
  String _query = '';
  List<_Hit> _hits = [];
  BibleReaderPrefs _prefs = BibleReaderPrefs();
  Map<int, String> _life = {};
  Map<String, VerseAnnotation> _annotations = {};
  var _searchOpen = false;
  static const _textColors = <Color?>[
    null,
    Color(0xFF0A1124),
    Color(0xFF33506E),
    Color(0xFFB42318),
  ];
  static const _paperThemes = <_PaperTheme>[
    _PaperTheme(
      swatch: Color(0xFFE8EEF5),
      lightTop: Color(0xFFF4F7FB),
      lightBottom: Color(0xFFE8EEF5),
      darkTop: Color(0xFF070B14),
      darkBottom: Color(0xFF0B1220),
    ),
    _PaperTheme(
      swatch: Color(0xFFFFFFFF),
      lightTop: Color(0xFFFFFFFF),
      lightBottom: Color(0xFFF8FAFC),
      darkTop: Color(0xFF0F172A),
      darkBottom: Color(0xFF020617),
    ),
    _PaperTheme(
      swatch: Color(0xFFF3EDE3),
      lightTop: Color(0xFFF7F3EC),
      lightBottom: Color(0xFFEDE6DA),
      darkTop: Color(0xFF1A1612),
      darkBottom: Color(0xFF120F0C),
    ),
    _PaperTheme(
      swatch: Color(0xFFE7F2EC),
      lightTop: Color(0xFFF0F7F3),
      lightBottom: Color(0xFFE2EFE8),
      darkTop: Color(0xFF0B1410),
      darkBottom: Color(0xFF07100C),
    ),
    _PaperTheme(
      swatch: Color(0xFFE5F0F8),
      lightTop: Color(0xFFEFF6FB),
      lightBottom: Color(0xFFDCEAF4),
      darkTop: Color(0xFF0A121A),
      darkBottom: Color(0xFF071018),
    ),
    _PaperTheme(
      swatch: Color(0xFF1E293B),
      lightTop: Color(0xFF1E293B),
      lightBottom: Color(0xFF0F172A),
      darkTop: Color(0xFF020617),
      darkBottom: Color(0xFF000000),
    ),
  ];
  final _selected = <String>{};
  var _picking = false;
  String? _expandedPickerBookId;
  var _bookFilter = '';
  var _oldTestament = true;
  var _lifeSplitRatio = 0.5;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final json =
        jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
            as Map<String, dynamic>;
    final books = (json['books'] as List).asMap().entries.map((entry) {
      final book = entry.value as Map<String, dynamic>;
      return _Book(
        '${entry.key + 1}',
        book['name'] as String,
        (book['chapters'] as List)
            .map((chapter) =>
                ((chapter as Map<String, dynamic>)['verses'] as List)
                    .map((verse) {
                  final item = verse as Map<String, dynamic>;
                  return _Verse(item['verse'] as int, item['text'] as String);
                }).toList())
            .toList(),
      );
    }).toList();
    // Open from local cache first so Bible works offline; sync marks later.
    final annotations = await _notes.load(refreshRemote: false);
    final prefs = await BibleReaderPrefs.load();
    final saved = books.cast<_Book?>().firstWhere(
          (book) => book!.id == prefs.bookId,
          orElse: () => null,
        );
    final book = saved ?? books.first;
    final chapter = prefs.chapter < 1 || prefs.chapter > book.chapters.length
        ? 1
        : prefs.chapter;
    if (!mounted) return;
    setState(() {
      _books = books;
      _book = book;
      _chapter = chapter;
      _prefs = prefs;
      _annotations = annotations;
    });
    await _loadLife();
    final remoteNotes = await _notes.load();
    if (mounted) setState(() => _annotations = remoteNotes);
  }

  Future<void> _remember() async {
    _prefs
      ..bookId = _book?.id
      ..chapter = _chapter;
    await _prefs.save();
  }

  Future<void> _loadLife() async {
    if ((!_prefs.parallelTranslation && !_prefs.inlineLife) || _book == null) {
      if (mounted) setState(() => _life = {});
      return;
    }
    final verses = _book!.chapters[_chapter - 1];
    final map = <int, String>{};
    for (final verse in verses) {
      final text = await LifeTranslation.instance.verse(
        _book!.id,
        _chapter,
        verse.number,
      );
      if (text != null && text.isNotEmpty) map[verse.number] = text;
    }
    if (mounted) setState(() => _life = map);
  }

  String _display(String text) =>
      _prefs.stripDiacritics ? stripArabicDiacritics(text) : text;

  String _arabic(int value) => '$value'.replaceAllMapped(
        RegExp(r'\d'),
        (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match[0]!)],
      );

  Color _verseInk(bool paperDark) {
    final index = _prefs.textColor.clamp(0, _textColors.length - 1).toInt();
    return _textColors[index] ??
        (paperDark ? const Color(0xFFE8EEF5) : const Color(0xFF152033));
  }

  _PaperTheme get _paper {
    final index = _prefs.background.clamp(0, _paperThemes.length - 1).toInt();
    return _paperThemes[index];
  }

  void _search(String value) {
    final query = value.trim();
    if (query.length < 2) {
      setState(() {
        _query = value;
        _hits = [];
      });
      return;
    }
    final needle = stripArabicDiacritics(query);
    final hits = <_Hit>[];
    for (final book in _books) {
      for (var chapter = 0; chapter < book.chapters.length; chapter++) {
        for (final verse in book.chapters[chapter]) {
          if (stripArabicDiacritics(verse.text).contains(needle)) {
            hits.add(_Hit(book, chapter + 1, verse));
            if (hits.length >= 80) break;
          }
        }
        if (hits.length >= 80) break;
      }
      if (hits.length >= 80) break;
    }
    setState(() {
      _query = value;
      _hits = hits;
    });
  }

  String _key(int verse) => '${_book!.id}:$_chapter:$verse';

  Future<void> _persist() => _notes.save(_annotations);

  void _update(String key, VerseAnnotation annotation) {
    setState(() {
      if (annotation.isEmpty) {
        _annotations.remove(key);
      } else {
        _annotations[key] = annotation;
      }
    });
    _persist();
  }

  Future<void> _editNote() async {
    final key = _selected.first;
    final note = await showDialog<String>(
      context: context,
      builder: (context) => _VerseNoteDialog(
        initial: _annotations[key]?.note ?? '',
      ),
    );
    if (note == null) return;
    for (final selected in _selected) {
      final current = _annotations[selected] ?? const VerseAnnotation();
      _update(
        selected,
        note.isEmpty
            ? current.copyWith(clearNote: true)
            : current.copyWith(note: note),
      );
    }
  }

  Future<void> _shiftChapter(int delta) async {
    final book = _book;
    if (book == null || _books.isEmpty || delta == 0) return;
    final index = _books.indexWhere((item) => item.id == book.id);
    if (index < 0) return;

    var nextBook = book;
    var nextChapter = _chapter + delta;
    if (nextChapter > book.chapters.length) {
      if (index >= _books.length - 1) return;
      nextBook = _books[index + 1];
      nextChapter = 1;
    } else if (nextChapter < 1) {
      if (index <= 0) return;
      nextBook = _books[index - 1];
      nextChapter = nextBook.chapters.length;
    }

    setState(() {
      _book = nextBook;
      _chapter = nextChapter;
      _oldTestament = (int.tryParse(nextBook.id) ?? 0) <= 39;
      _selected.clear();
    });
    await _remember();
    await _loadLife();
  }

  bool get _canPrevChapter {
    if (_picking || _book == null || _books.isEmpty) return false;
    if (_chapter > 1) return true;
    final index = _books.indexWhere((item) => item.id == _book!.id);
    return index > 0;
  }

  bool get _canNextChapter {
    if (_picking || _book == null || _books.isEmpty) return false;
    if (_chapter < _book!.chapters.length) return true;
    final index = _books.indexWhere((item) => item.id == _book!.id);
    return index >= 0 && index < _books.length - 1;
  }

  void _onChapterSwipe(DragEndDetails details) {
    if (_picking || _searchOpen || _book == null) return;
    final velocity = details.primaryVelocity ?? 0;
    if (velocity.abs() < 280) return;
    // سحب لليمين → التالي، لليسار → السابق
    _shiftChapter(velocity > 0 ? 1 : -1);
  }

  Future<void> _openReaderMenu() async {
    final dark = context.read<ThemeProvider>().isNightMode;
    final result = await showModalBottomSheet<_ReaderMenuAction>(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      useSafeArea: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.45),
      builder: (sheetContext) {
        final maxHeight = MediaQuery.sizeOf(sheetContext).height * 0.78;
        return Directionality(
          textDirection: TextDirection.rtl,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight),
            child: _ReaderSettingsSheet(
              dark: dark,
              prefs: _prefs,
              textColors: _textColors,
              paperThemes: _paperThemes,
              onPrefsChanged: (next) async {
                if (!mounted) return;
                setState(() => _prefs = next);
                await _prefs.save();
              },
            ),
          ),
        );
      },
    );

    if (!mounted) return;
    // Rebuild parent once after the sheet is gone — never while it's open.
    setState(() {});
    await _loadLife();

    switch (result) {
      case _ReaderMenuAction.search:
        setState(() => _searchOpen = true);
      case _ReaderMenuAction.favorites:
        await _showSaved(favorites: true);
      case _ReaderMenuAction.highlights:
        await _showSaved(favorites: false);
      case _ReaderMenuAction.notes:
        await _showAllNotes();
      case null:
        break;
    }
  }

  Future<void> _showSaved({required bool favorites}) async {
    final dark = context.read<ThemeProvider>().isNightMode;
    final items = _annotations.entries.where((entry) {
      return favorites ? entry.value.favorite : entry.value.highlight != null;
    }).toList()
      ..sort((a, b) {
        final ap = a.key.split(':');
        final bp = b.key.split(':');
        final bookCmp =
            (int.tryParse(ap[0]) ?? 0).compareTo(int.tryParse(bp[0]) ?? 0);
        if (bookCmp != 0) return bookCmp;
        final chapterCmp =
            (int.tryParse(ap[1]) ?? 0).compareTo(int.tryParse(bp[1]) ?? 0);
        if (chapterCmp != 0) return chapterCmp;
        return (int.tryParse(ap[2]) ?? 0).compareTo(int.tryParse(bp[2]) ?? 0);
      });

    final outcome = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.45),
      builder: (sheetContext) {
        final maxHeight = MediaQuery.sizeOf(sheetContext).height * 0.68;
        final bg = dark ? AppColors.darkCard : const Color(0xFFF8FAFC);
        final title = dark ? AppColors.darkText : AppColors.navy;
        final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
        final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
        final card = dark ? AppColors.darkCardMuted : Colors.white;
        final accent = favorites
            ? (dark ? const Color(0xFFFBBF24) : const Color(0xFFD97706))
            : (dark ? const Color(0xFF7DD3FC) : const Color(0xFF0369A1));
        final emptyHint = favorites
            ? 'لما تعلّم آية كمفضلة هتظهر هنا.'
            : 'لما تظلّل آية هتظهر هنا.';

        return Directionality(
          textDirection: TextDirection.rtl,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight),
            child: Material(
              color: bg,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
              clipBehavior: Clip.antiAlias,
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                      child: Column(
                        children: [
                          youthSheetHandle(),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () =>
                                    Navigator.pop(sheetContext, 'menu'),
                                icon: Icon(
                                  Icons.arrow_back_rounded,
                                  color: title,
                                ),
                                tooltip: 'رجوع للقائمة',
                              ),
                              Expanded(
                                child: Column(
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          favorites
                                              ? Icons.star_rounded
                                              : Icons.highlight_rounded,
                                          size: 18,
                                          color: accent,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          favorites
                                              ? 'الآيات المفضلة'
                                              : 'الآيات المظللة',
                                          style: TextStyle(
                                            fontFamily: AppFonts.ui,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w900,
                                            color: title,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      items.isEmpty
                                          ? (favorites
                                              ? 'مفيش آيات مفضلة'
                                              : 'مفيش آيات مظللة')
                                          : '${_arabic(items.length)} ${favorites ? (items.length == 1 ? 'آية مفضلة' : 'آيات مفضلة') : (items.length == 1 ? 'آية مظللة' : 'آيات مظللة')}',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 48),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Flexible(
                      child: items.isEmpty
                          ? Padding(
                              padding:
                                  const EdgeInsets.fromLTRB(24, 12, 24, 28),
                              child: Text(
                                emptyHint,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 13,
                                  color: muted,
                                ),
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                              itemCount: items.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final item = items[index];
                                final parts = item.key.split(':');
                                final bookId =
                                    parts.isNotEmpty ? parts[0] : '';
                                final chapter = parts.length > 1
                                    ? int.tryParse(parts[1])
                                    : null;
                                final verse = parts.length > 2
                                    ? int.tryParse(parts[2])
                                    : null;
                                final book = _books.cast<_Book?>().firstWhere(
                                      (entry) => entry!.id == bookId,
                                      orElse: () => null,
                                    );
                                final reference = book == null ||
                                        chapter == null ||
                                        verse == null
                                    ? item.key
                                    : '${book.name} ${_arabic(chapter)}:${_arabic(verse)}';
                                String? verseText;
                                if (book != null &&
                                    chapter != null &&
                                    verse != null &&
                                    chapter >= 1 &&
                                    chapter <= book.chapters.length) {
                                  for (final v
                                      in book.chapters[chapter - 1]) {
                                    if (v.number == verse) {
                                      verseText = _display(v.text);
                                      break;
                                    }
                                  }
                                }
                                final highlightColor =
                                    _color(item.value.highlight);
                                final marker = favorites
                                    ? accent
                                    : (highlightColor ?? accent);

                                return Material(
                                  color: card,
                                  borderRadius: BorderRadius.circular(16),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () {
                                      if (book == null || chapter == null) {
                                        return;
                                      }
                                      Navigator.pop(sheetContext);
                                      setState(() {
                                        _book = book;
                                        _chapter = chapter;
                                        _searchOpen = false;
                                        _picking = false;
                                      });
                                      _remember();
                                      _loadLife();
                                    },
                                    child: Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.fromLTRB(
                                        12,
                                        12,
                                        12,
                                        12,
                                      ),
                                      decoration: BoxDecoration(
                                        borderRadius:
                                            BorderRadius.circular(16),
                                        border: Border.all(color: border),
                                      ),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            width: 4,
                                            height: 56,
                                            decoration: BoxDecoration(
                                              color: marker,
                                              borderRadius:
                                                  BorderRadius.circular(99),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        reference,
                                                        style: TextStyle(
                                                          fontFamily:
                                                              AppFonts.ui,
                                                          fontSize: 13,
                                                          fontWeight:
                                                              FontWeight.w800,
                                                          color: title,
                                                        ),
                                                      ),
                                                    ),
                                                    if (favorites)
                                                      Icon(
                                                        Icons.star_rounded,
                                                        size: 16,
                                                        color: accent,
                                                      )
                                                    else if (highlightColor !=
                                                        null)
                                                      Container(
                                                        width: 14,
                                                        height: 14,
                                                        decoration:
                                                            BoxDecoration(
                                                          color:
                                                              highlightColor,
                                                          shape:
                                                              BoxShape.circle,
                                                          border: Border.all(
                                                            color: border,
                                                          ),
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                                if (verseText != null) ...[
                                                  const SizedBox(height: 6),
                                                  Text(
                                                    verseText,
                                                    maxLines: 2,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    textAlign: TextAlign.right,
                                                    textDirection:
                                                        TextDirection.rtl,
                                                    style: TextStyle(
                                                      fontFamily:
                                                          AppFonts.verse,
                                                      fontSize: 14,
                                                      height: 1.55,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      color: muted,
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Icon(
                                            Icons.chevron_right_rounded,
                                            size: 20,
                                            color: muted,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
    if (outcome == 'menu' && mounted) {
      await _openReaderMenu();
    }
  }

  Future<void> _showAllNotes() async {
    final dark = context.read<ThemeProvider>().isNightMode;
    final items = _annotations.entries
        .where((entry) => entry.value.note?.trim().isNotEmpty == true)
        .toList()
      ..sort((a, b) {
        final ap = a.key.split(':');
        final bp = b.key.split(':');
        final bookCmp =
            (int.tryParse(ap[0]) ?? 0).compareTo(int.tryParse(bp[0]) ?? 0);
        if (bookCmp != 0) return bookCmp;
        final chapterCmp =
            (int.tryParse(ap[1]) ?? 0).compareTo(int.tryParse(bp[1]) ?? 0);
        if (chapterCmp != 0) return chapterCmp;
        return (int.tryParse(ap[2]) ?? 0).compareTo(int.tryParse(bp[2]) ?? 0);
      });

    final outcome = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.45),
      builder: (sheetContext) {
        final maxHeight = MediaQuery.sizeOf(sheetContext).height * 0.62;
        final bg = dark ? AppColors.darkCard : const Color(0xFFF8FAFC);
        final title = dark ? AppColors.darkText : AppColors.navy;
        final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
        final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
        final card = dark ? AppColors.darkCardMuted : Colors.white;

        return Directionality(
          textDirection: TextDirection.rtl,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight),
            child: Material(
              color: bg,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
              clipBehavior: Clip.antiAlias,
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                      child: Column(
                        children: [
                          youthSheetHandle(),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () =>
                                    Navigator.pop(sheetContext, 'menu'),
                                icon: Icon(
                                  Icons.arrow_back_rounded,
                                  color: title,
                                ),
                                tooltip: 'رجوع للقائمة',
                              ),
                              Expanded(
                                child: Column(
                                  children: [
                                    Text(
                                      'الملاحظات',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w900,
                                        color: title,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      items.isEmpty
                                          ? 'مفيش ملاحظات محفوظة'
                                          : '${_arabic(items.length)} ملاحظة في الكتاب المقدس',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 48),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Flexible(
                      child: items.isEmpty
                          ? Padding(
                              padding:
                                  const EdgeInsets.fromLTRB(24, 12, 24, 28),
                              child: Text(
                                'لما تضيف ملاحظة على آية هتظهر هنا.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 13,
                                  color: muted,
                                ),
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                              itemCount: items.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final item = items[index];
                                final parts = item.key.split(':');
                                final bookId = parts.isNotEmpty ? parts[0] : '';
                                final chapter = parts.length > 1
                                    ? int.tryParse(parts[1])
                                    : null;
                                final verse = parts.length > 2
                                    ? int.tryParse(parts[2])
                                    : null;
                                final book = _books.cast<_Book?>().firstWhere(
                                      (entry) => entry!.id == bookId,
                                      orElse: () => null,
                                    );
                                final reference = book == null ||
                                        chapter == null ||
                                        verse == null
                                    ? item.key
                                    : '${book.name} ${_arabic(chapter)}:${_arabic(verse)}';
                                String? verseText;
                                if (book != null &&
                                    chapter != null &&
                                    verse != null &&
                                    chapter >= 1 &&
                                    chapter <= book.chapters.length) {
                                  final verses = book.chapters[chapter - 1];
                                  for (final v in verses) {
                                    if (v.number == verse) {
                                      verseText = _display(v.text);
                                      break;
                                    }
                                  }
                                }

                                return Material(
                                  color: card,
                                  borderRadius: BorderRadius.circular(16),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () {
                                      if (book == null || chapter == null) {
                                        return;
                                      }
                                      Navigator.pop(sheetContext);
                                      setState(() {
                                        _book = book;
                                        _chapter = chapter;
                                        _searchOpen = false;
                                        _picking = false;
                                      });
                                      _remember();
                                      _loadLife();
                                    },
                                    child: Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(color: border),
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          Row(
                                            children: [
                                              Icon(
                                                Icons.sticky_note_2_outlined,
                                                size: 15,
                                                color: muted,
                                              ),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  reference,
                                                  style: TextStyle(
                                                    fontFamily: AppFonts.ui,
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w800,
                                                    color: title,
                                                  ),
                                                ),
                                              ),
                                              Icon(
                                                Icons.chevron_right_rounded,
                                                size: 18,
                                                color: muted,
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            item.value.note!.trim(),
                                            textDirection: TextDirection.rtl,
                                            style: TextStyle(
                                              fontFamily: AppFonts.ui,
                                              fontSize: 13,
                                              height: 1.55,
                                              fontWeight: FontWeight.w600,
                                              color: title,
                                            ),
                                          ),
                                          if (verseText != null) ...[
                                            const SizedBox(height: 8),
                                            Text(
                                              verseText,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              textDirection: TextDirection.rtl,
                                              style: TextStyle(
                                                fontFamily: AppFonts.verse,
                                                fontSize: 13,
                                                height: 1.6,
                                                color: muted,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
    if (outcome == 'menu' && mounted) {
      await _openReaderMenu();
    }
  }

  void _memorizeSelected() {
    if (_book == null || _selected.isEmpty) return;
    final verses = <int>[
      for (final key in _selected)
        if (key.startsWith('${_book!.id}:$_chapter:'))
          int.parse(key.split(':')[2]),
    ]..sort();
    if (verses.isEmpty) return;
    final seed = MemorizationSeed(
      bookId: _book!.id,
      chapter: _chapter,
      verses: verses,
    );
    setState(_selected.clear);
    context.push(Routes.bibleMemorization, extra: seed);
  }

  void _reflect() {
    final lines = <String>[];
    for (final key in _selected) {
      final parts = key.split(':');
      final chapter = int.parse(parts[1]);
      final number = int.parse(parts[2]);
      final text = _book!.chapters[chapter - 1]
          .firstWhere((verse) => verse.number == number)
          .text;
      lines.add('$text (${_book!.name} $chapter: $number)');
    }
    context.push(Routes.spiritualReflection, extra: lines.join('\n'));
  }

  Future<void> _copySelectedVerses() async {
    if (_book == null || _selected.isEmpty) return;
    final text = _selected.map((key) {
      final parts = key.split(':');
      final chapter = int.parse(parts[1]);
      final number = int.parse(parts[2]);
      final verse = _book!.chapters[chapter - 1]
          .firstWhere((item) => item.number == number);
      return '${_book!.name} $chapter : $number\n${_display(verse.text)}';
    }).join('\n\n');
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    setState(_selected.clear);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    if (_book == null) {
      return Scaffold(
        backgroundColor: youthBg(isDark),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    final verses = _book!.chapters[_chapter - 1];
    final searching = _query.trim().length >= 2;
    final paper = _paper;
    final paperTop = isDark ? paper.darkTop : paper.lightTop;
    final paperBottom = isDark ? paper.darkBottom : paper.lightBottom;
    final paperDark =
        ThemeData.estimateBrightnessForColor(paperTop) == Brightness.dark;
    final titleColor = paperDark ? AppColors.darkText : const Color(0xFF152033);
    final muted = paperDark ? AppColors.darkMutedText : const Color(0xFF6B7C93);
    final ink = _verseInk(paperDark);
    final inkIsLight =
        ThemeData.estimateBrightnessForColor(ink) == Brightness.light;
    final verseNumberColor =
        paperDark ? const Color(0xFF7DD3FC) : const Color(0xFF0369A1);
    // Selection wash: soft accent on paper, but never so light that white ink
    // disappears — for light ink use a deeper cool tint.
    final selectAccent =
        paperDark ? const Color(0xFF38BDF8) : const Color(0xFF0369A1);
    final selectWash = inkIsLight
        ? Color.lerp(paperTop, selectAccent, 0.38)!
        : Color.lerp(paperTop, selectAccent, paperDark ? 0.26 : 0.16)!;
    final selectBorder =
        selectAccent.withValues(alpha: inkIsLight ? 0.55 : 0.28);
    final selectedNumberColor =
        inkIsLight ? const Color(0xFFE0F2FE) : titleColor;
    final activeHighlights =
        inkIsLight ? _highlightsOnLightInk : _highlightsOnDarkInk;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value:
            (paperDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark)
                .copyWith(statusBarColor: Colors.transparent),
        child: Scaffold(
          backgroundColor: paperTop,
          body: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [paperTop, paperBottom],
              ),
            ),
            child: Column(
              children: [
                _ReaderTopBar(
                  dark: paperDark,
                  picking: _picking,
                  bookName: _book!.name,
                  chapterLabel: 'إصحاح ${_arabic(_chapter)}',
                  canPrev: _canPrevChapter,
                  canNext: _canNextChapter,
                  searchOpen: _searchOpen,
                  showBack: _picking || widget.showBack,
                  onBack: () {
                    if (_picking) {
                      setState(() {
                        _picking = false;
                        _bookFilter = '';
                        _expandedPickerBookId = null;
                      });
                    } else if (widget.showBack) {
                      Navigator.maybePop(context);
                    }
                  },
                  onPrev: () => _shiftChapter(-1),
                  onNext: () => _shiftChapter(1),
                  onPick: () => setState(() {
                    _picking = true;
                    _expandedPickerBookId = _book?.id;
                    _bookFilter = '';
                    _searchOpen = false;
                    if (_book != null) {
                      final id = int.tryParse(_book!.id) ?? 0;
                      _oldTestament = id <= 39;
                    }
                  }),
                  onSearch: () => setState(() {
                    _searchOpen = !_searchOpen;
                    if (!_searchOpen) {
                      _query = '';
                      _hits = [];
                    }
                  }),
                  onMenu: _openReaderMenu,
                ),
                if (_searchOpen && !_picking)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: paperDark
                            ? Colors.white.withValues(alpha: 0.06)
                            : Colors.white.withValues(alpha: 0.78),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: paperDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : const Color(0xFFD7E3F0),
                        ),
                        boxShadow: paperDark
                            ? null
                            : [
                                BoxShadow(
                                  color: const Color(0xFF152033)
                                      .withValues(alpha: 0.04),
                                  blurRadius: 18,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                      ),
                      child: TextField(
                        autofocus: true,
                        onChanged: _search,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          color: titleColor,
                          fontWeight: FontWeight.w600,
                        ),
                        decoration: InputDecoration(
                          prefixIcon: Icon(Icons.search_rounded, color: muted),
                          hintText: 'ابحث في الكتاب المقدس',
                          hintStyle: TextStyle(
                            fontFamily: AppFonts.ui,
                            color: muted,
                            fontWeight: FontWeight.w500,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 14,
                          ),
                        ),
                      ),
                    ),
                  ),
                Expanded(
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: RadialGradient(
                                center: const Alignment(0, -0.85),
                                radius: 1.15,
                                colors: [
                                  paperDark
                                      ? const Color(0xFF1E3A5F)
                                          .withValues(alpha: 0.28)
                                      : const Color(0xFFB8D4EC)
                                          .withValues(alpha: 0.35),
                                  Colors.transparent,
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      _picking
                          ? ColoredBox(
                              color: youthBg(isDark),
                              child: _placePicker(),
                            )
                          : searching
                              ? ListView.separated(
                                  padding:
                                      const EdgeInsets.fromLTRB(18, 8, 18, 28),
                                  itemCount: _hits.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 8),
                                  itemBuilder: (context, index) {
                                    final hit = _hits[index];
                                    return _SearchHitCard(
                                      dark: paperDark,
                                      text: _display(hit.verse.text),
                                      reference:
                                          '${hit.book.name} ${_arabic(hit.chapter)}:${_arabic(hit.verse.number)}',
                                      onTap: () async {
                                        setState(() {
                                          _book = hit.book;
                                          _chapter = hit.chapter;
                                          _query = '';
                                          _hits = [];
                                          _searchOpen = false;
                                          _selected.clear();
                                        });
                                        await _remember();
                                        await _loadLife();
                                      },
                                    );
                                  },
                                )
                              : _prefs.parallelTranslation
                                  ? LayoutBuilder(
                                      builder: (context, constraints) {
                                        const dividerH = 44.0;
                                        final usable =
                                            (constraints.maxHeight - dividerH)
                                                .clamp(0.0, double.infinity);
                                        final topH = usable * _lifeSplitRatio;
                                        final bottomH =
                                            usable * (1 - _lifeSplitRatio);
                                        return Column(
                                          children: [
                                            SizedBox(
                                              height: topH,
                                              child: _buildOriginalVerseList(
                                                verses: verses,
                                                paperDark: paperDark,
                                                ink: ink,
                                                inkIsLight: inkIsLight,
                                                muted: muted,
                                                verseNumberColor:
                                                    verseNumberColor,
                                                selectedNumberColor:
                                                    selectedNumberColor,
                                                selectWash: selectWash,
                                                selectBorder: selectBorder,
                                                showInlineLife: false,
                                              ),
                                            ),
                                            _LifeSplitDivider(
                                              dark: paperDark,
                                              onDrag: (delta) {
                                                if (usable <= 0) return;
                                                setState(() {
                                                  _lifeSplitRatio =
                                                      (_lifeSplitRatio +
                                                              delta / usable)
                                                          .clamp(0.22, 0.78);
                                                });
                                              },
                                              onHide: _hideLifeSplit,
                                            ),
                                            SizedBox(
                                              height: bottomH,
                                              child: _buildLifePane(
                                                verses: verses,
                                                paperDark: paperDark,
                                                muted: muted,
                                                verseNumberColor:
                                                    verseNumberColor,
                                              ),
                                            ),
                                          ],
                                        );
                                      },
                                    )
                                  : _buildOriginalVerseList(
                                      verses: verses,
                                      paperDark: paperDark,
                                      ink: ink,
                                      inkIsLight: inkIsLight,
                                      muted: muted,
                                      verseNumberColor: verseNumberColor,
                                      selectedNumberColor: selectedNumberColor,
                                      selectWash: selectWash,
                                      selectBorder: selectBorder,
                                      showInlineLife: true,
                                    ),
                    ],
                  ),
                ),
                if (_selected.isNotEmpty)
                  _SelectionBar(
                    countLabel:
                        '${_arabic(_selected.length)} ${_selected.length == 1 ? 'آية' : 'آيات'}',
                    highlights: activeHighlights,
                    onClear: () => setState(_selected.clear),
                    onHighlight: (color) {
                      for (final key in _selected) {
                        final current =
                            _annotations[key] ?? const VerseAnnotation();
                        _update(
                          key,
                          current.copyWith(
                            highlight:
                                '#${color.toARGB32().toRadixString(16).padLeft(8, '0')}',
                          ),
                        );
                      }
                    },
                    onClearHighlight: () {
                      for (final key in _selected) {
                        final current = _annotations[key];
                        if (current == null) continue;
                        _update(key, current.copyWith(clearHighlight: true));
                      }
                    },
                    onCopy: _copySelectedVerses,
                    onFavorite: () {
                      for (final key in _selected) {
                        final current =
                            _annotations[key] ?? const VerseAnnotation();
                        _update(
                          key,
                          current.copyWith(favorite: !current.favorite),
                        );
                      }
                    },
                    onNote: _editNote,
                    onReflect: _reflect,
                    onMemorize: _memorizeSelected,
                  ),
              ],
            ),
          ),
          bottomNavigationBar: widget.showBack
              ? YouthAppTabBar(isDark: isDark, currentIndex: -1)
              : null,
        ),
      ),
    );
  }

  Color? _color(String? value) {
    if (value == null) return null;
    final parsed = int.tryParse(value.replaceFirst('#', ''), radix: 16);
    if (parsed == null) return null;
    return Color(parsed);
  }

  /// Pastel highlights wash out white text — deepen them for display.
  Color? _readableHighlight(Color? stored, bool inkIsLight) {
    if (stored == null) return null;
    if (!inkIsLight) return stored;
    final luminance = stored.computeLuminance();
    if (luminance < 0.35) return stored;
    return Color.lerp(stored, const Color(0xFF0B1220), 0.55)!;
  }

  Future<void> _openPickedReading({_Book? book, int? chapter}) async {
    setState(() {
      if (book != null) _book = book;
      if (chapter != null) _chapter = chapter;
      _picking = false;
      _expandedPickerBookId = null;
      _bookFilter = '';
      _selected.clear();
    });
    await _remember();
    await _loadLife();
  }

  Future<void> _hideLifeSplit() async {
    setState(() => _prefs.parallelTranslation = false);
    await _prefs.save();
    await _loadLife();
  }

  Widget _buildOriginalVerseList({
    required List<_Verse> verses,
    required bool paperDark,
    required Color ink,
    required bool inkIsLight,
    required Color muted,
    required Color verseNumberColor,
    required Color selectedNumberColor,
    required Color selectWash,
    required Color selectBorder,
    required bool showInlineLife,
  }) {
    return GestureDetector(
      onHorizontalDragEnd: _onChapterSwipe,
      child: ListView.builder(
        padding: EdgeInsets.fromLTRB(
          28,
          8,
          28,
          _prefs.parallelTranslation ? 16 : 36,
        ),
        itemCount: verses.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _ChapterOpener(
              dark: paperDark,
              bookName: _book!.name,
              chapterLabel: 'الإصحاح ${_arabic(_chapter)}',
            );
          }
          final verse = verses[index - 1];
          final key = _key(verse.number);
          final annotation = _annotations[key];
          final selected = _selected.contains(key);
          final highlight = _readableHighlight(
            _color(annotation?.highlight),
            inkIsLight,
          );
          return Material(
            color: highlight ??
                (selected ? selectWash : Colors.transparent),
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onLongPress: () => setState(() => _selected.add(key)),
              onTap: () {
                setState(() {
                  if (selected) {
                    _selected.remove(key);
                  } else {
                    _selected.add(key);
                  }
                });
              },
              child: Container(
                decoration: selected
                    ? BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: selectBorder),
                      )
                    : null,
                padding: const EdgeInsets.symmetric(
                  vertical: 15,
                  horizontal: 6,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: '${_arabic(verse.number)}  ',
                            style: TextStyle(
                              fontFamily: AppFonts.verse,
                              fontSize: (_prefs.fontSize + 2) * 0.68,
                              fontWeight: FontWeight.w700,
                              color: selected
                                  ? selectedNumberColor
                                  : verseNumberColor,
                              height: 1.15,
                            ),
                          ),
                          TextSpan(
                            text:
                                '${_display(verse.text)}${annotation?.favorite == true ? '  ★' : ''}',
                            style: verseStyle(
                              fontSize: _prefs.fontSize + 5,
                              color: ink,
                              height: 2.22,
                            ),
                          ),
                        ],
                      ),
                      textAlign: TextAlign.right,
                      textDirection: TextDirection.rtl,
                    ),
                    if (showInlineLife && _prefs.inlineLife && selected)
                      _LifeLine(
                        dark: paperDark,
                        muted: muted,
                        fontSize: _prefs.fontSize + 1,
                        body: _life[verse.number] ??
                            'الترجمة غير متاحة لهذه الآية.',
                      ),
                    if (_prefs.showNotesUnderVerse &&
                        annotation?.note?.isNotEmpty == true)
                      Padding(
                        padding: const EdgeInsets.only(top: 10, right: 8),
                        child: Text(
                          annotation!.note!,
                          textDirection: TextDirection.rtl,
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            height: 1.55,
                            color: muted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLifePane({
    required List<_Verse> verses,
    required bool paperDark,
    required Color muted,
    required Color verseNumberColor,
  }) {
    final panel = paperDark
        ? Colors.white.withValues(alpha: 0.04)
        : const Color(0xFFF1F5F9).withValues(alpha: 0.72);
    return ColoredBox(
      color: panel,
      child: GestureDetector(
        onHorizontalDragEnd: _onChapterSwipe,
        child: ListView.builder(
          padding: const EdgeInsets.fromLTRB(28, 8, 28, 24),
          itemCount: verses.length,
          itemBuilder: (context, index) {
            final verse = verses[index];
            final body = _life[verse.number];
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${_arabic(verse.number)}  ',
                      style: TextStyle(
                        fontFamily: AppFonts.verse,
                        fontSize: (_prefs.fontSize + 2) * 0.62,
                        fontWeight: FontWeight.w700,
                        color: verseNumberColor.withValues(alpha: 0.85),
                        height: 1.15,
                      ),
                    ),
                    TextSpan(
                      text: body ?? 'الترجمة غير متاحة لهذه الآية.',
                      style: TextStyle(
                        fontFamily: AppFonts.verse,
                        fontSize: _prefs.fontSize + 2,
                        height: 1.9,
                        fontWeight: FontWeight.w500,
                        color: muted,
                      ),
                    ),
                  ],
                ),
                textAlign: TextAlign.right,
                textDirection: TextDirection.rtl,
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _placePicker() {
    final filter = _bookFilter.trim();
    final books = _books.where((book) {
      final id = int.tryParse(book.id) ?? 0;
      if (_oldTestament ? id > 39 : id < 40) return false;
      if (filter.isEmpty) return true;
      return book.name.contains(filter);
    }).toList();
    final dark = Theme.of(context).brightness == Brightness.dark;
    final surface = dark ? AppColors.darkCard : Colors.white;
    final soft = dark ? AppColors.darkCardMuted : const Color(0xFFF1F5F9);
    final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final text = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF64748B);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: soft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                _TestamentChip(
                  label: 'العهد القديم',
                  selected: _oldTestament,
                  dark: dark,
                  onTap: () => setState(() {
                    _oldTestament = true;
                    _bookFilter = '';
                    _expandedPickerBookId = null;
                  }),
                ),
                _TestamentChip(
                  label: 'العهد الجديد',
                  selected: !_oldTestament,
                  dark: dark,
                  onTap: () => setState(() {
                    _oldTestament = false;
                    _bookFilter = '';
                    _expandedPickerBookId = null;
                  }),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: TextField(
            onChanged: (value) => setState(() => _bookFilter = value),
            textInputAction: TextInputAction.search,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: text,
            ),
            decoration: InputDecoration(
              hintText: 'ابحث عن سفر…',
              hintStyle: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: muted,
              ),
              prefixIcon: Icon(Icons.search_rounded, color: muted, size: 20),
              filled: true,
              fillColor: surface,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: Color(0xFF0EA5E9),
                  width: 1.4,
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
          child: Align(
            alignment: Alignment.centerRight,
            child: Text(
              filter.isEmpty
                  ? (_oldTestament ? 'أسفار العهد القديم' : 'أسفار العهد الجديد')
                  : 'نتائج البحث (${_arabic(books.length)})',
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: muted,
              ),
            ),
          ),
        ),
        Expanded(
          child: books.isEmpty
              ? Center(
                  child: Text(
                    'مفيش سفر بهذا الاسم',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: muted,
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                  itemCount: books.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final book = books[index];
                    final expanded = _expandedPickerBookId == book.id;
                    final currentBook = _book?.id == book.id;
                    return Material(
                      color: expanded
                          ? const Color(0xFF0F172A)
                          : surface,
                      borderRadius: BorderRadius.circular(16),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: expanded
                                ? const Color(0xFFFBBF24)
                                : border,
                            width: expanded ? 1.6 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            InkWell(
                              onTap: () => setState(() {
                                if (expanded) {
                                  _expandedPickerBookId = null;
                                } else {
                                  _expandedPickerBookId = book.id;
                                }
                              }),
                              borderRadius: BorderRadius.circular(16),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        book.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: expanded
                                              ? Colors.white
                                              : text,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      '${_arabic(book.chapters.length)} إصحاح',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: expanded
                                            ? const Color(0xFFFBBF24)
                                            : muted,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    AnimatedRotation(
                                      turns: expanded ? 0.25 : 0,
                                      duration:
                                          const Duration(milliseconds: 180),
                                      child: Icon(
                                        Icons.chevron_right_rounded,
                                        size: 20,
                                        color: expanded
                                            ? const Color(0xFFFBBF24)
                                            : muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (expanded)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  12,
                                  0,
                                  12,
                                  14,
                                ),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    for (var chapter = 1;
                                        chapter <= book.chapters.length;
                                        chapter++)
                                      Material(
                                        color: currentBook &&
                                                _chapter == chapter
                                            ? const Color(0xFFFBBF24)
                                            : Colors.white.withValues(
                                                alpha: 0.1,
                                              ),
                                        borderRadius:
                                            BorderRadius.circular(12),
                                        child: InkWell(
                                          onTap: () => _openPickedReading(
                                            book: book,
                                            chapter: chapter,
                                          ),
                                          borderRadius:
                                              BorderRadius.circular(12),
                                          child: SizedBox(
                                            width: 48,
                                            height: 48,
                                            child: Center(
                                              child: Text(
                                                _arabic(chapter),
                                                style: TextStyle(
                                                  fontFamily: AppFonts.ui,
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w900,
                                                  color: currentBook &&
                                                          _chapter == chapter
                                                      ? const Color(
                                                          0xFF0F172A,
                                                        )
                                                      : Colors.white,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ChapterOpener extends StatelessWidget {
  const _ChapterOpener({
    required this.dark,
    required this.bookName,
    required this.chapterLabel,
  });

  final bool dark;
  final String bookName;
  final String chapterLabel;

  @override
  Widget build(BuildContext context) {
    final ink = dark ? AppColors.darkText : const Color(0xFF152033);
    final soft = dark ? AppColors.darkMutedText : const Color(0xFF6B7C93);
    final line = dark ? const Color(0xFF334155) : const Color(0xFFB7C9DC);
    final jewel = dark ? const Color(0xFF7DD3FC) : const Color(0xFF0284C7);

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 520),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, (1 - value) * 10),
            child: child,
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.fromLTRB(4, 36, 4, 34),
        child: Column(
          children: [
            Text(
              bookName,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.verse,
                fontSize: 38,
                fontWeight: FontWeight.w700,
                color: ink,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              chapterLabel,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: soft,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 26),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 42,
                  height: 1,
                  color: line.withValues(alpha: 0.7),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: jewel.withValues(alpha: 0.85),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: jewel.withValues(alpha: 0.28),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                  ),
                ),
                Container(
                  width: 42,
                  height: 1,
                  color: line.withValues(alpha: 0.7),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ReaderTopBar extends StatelessWidget {
  const _ReaderTopBar({
    required this.dark,
    required this.picking,
    required this.bookName,
    required this.chapterLabel,
    required this.canPrev,
    required this.canNext,
    required this.searchOpen,
    required this.showBack,
    required this.onBack,
    required this.onPrev,
    required this.onNext,
    required this.onPick,
    required this.onSearch,
    required this.onMenu,
  });

  final bool dark;
  final bool picking;
  final String bookName;
  final String chapterLabel;
  final bool canPrev;
  final bool canNext;
  final bool searchOpen;
  final bool showBack;
  final VoidCallback onBack;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final VoidCallback onPick;
  final VoidCallback onSearch;
  final VoidCallback onMenu;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final ink = dark ? AppColors.darkText : const Color(0xFF152033);
    final soft = dark ? AppColors.darkMutedText : const Color(0xFF6B7C93);

    return Padding(
      padding: EdgeInsets.fromLTRB(12, top + 8, 12, 10),
      child: picking
          ? Row(
              children: [
                if (showBack)
                  _TopIconButton(
                    dark: dark,
                    icon: Icons.arrow_back_rounded,
                    onTap: onBack,
                  ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'اختيار القراءة',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                ),
              ],
            )
          : Row(
              children: [
                if (showBack) ...[
                  _TopIconButton(
                    dark: dark,
                    icon: Icons.arrow_back_rounded,
                    onTap: onBack,
                  ),
                  const SizedBox(width: 6),
                ],
                _TopIconButton(
                  dark: dark,
                  icon: Icons.chevron_left_rounded,
                  onTap: canPrev ? onPrev : null,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Material(
                    color: dark
                        ? Colors.white.withValues(alpha: 0.06)
                        : Colors.white.withValues(alpha: 0.72),
                    borderRadius: BorderRadius.circular(18),
                    child: InkWell(
                      onTap: onPick,
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: dark
                                ? Colors.white.withValues(alpha: 0.08)
                                : const Color(0xFFD5E3F2),
                          ),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Text(
                                    bookName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontFamily: AppFonts.verse,
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      color: ink,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 2),
                                Icon(
                                  Icons.expand_more_rounded,
                                  size: 18,
                                  color: soft,
                                ),
                              ],
                            ),
                            Text(
                              chapterLabel,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: soft,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                _TopIconButton(
                  dark: dark,
                  icon: Icons.chevron_right_rounded,
                  onTap: canNext ? onNext : null,
                ),
                const SizedBox(width: 4),
                _TopIconButton(
                  dark: dark,
                  icon: Icons.search_rounded,
                  active: searchOpen,
                  onTap: onSearch,
                ),
                const SizedBox(width: 4),
                _TopIconButton(
                  dark: dark,
                  icon: Icons.tune_rounded,
                  onTap: onMenu,
                ),
              ],
            ),
    );
  }
}

class _TopIconButton extends StatelessWidget {
  const _TopIconButton({
    required this.dark,
    required this.icon,
    this.onTap,
    this.active = false,
  });

  final bool dark;
  final IconData icon;
  final VoidCallback? onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    final ink = dark ? AppColors.darkText : const Color(0xFF243447);
    final soft = dark ? AppColors.darkMutedText : const Color(0xFF94A3B8);
    return Material(
      color: active
          ? (dark
              ? const Color(0xFF0284C7).withValues(alpha: 0.22)
              : const Color(0xFFDFECF8))
          : (dark
              ? Colors.white.withValues(alpha: 0.06)
              : Colors.white.withValues(alpha: 0.7)),
      borderRadius: BorderRadius.circular(14),
      elevation: dark ? 0 : 0.5,
      shadowColor: const Color(0xFF152033).withValues(alpha: 0.08),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(
            icon,
            size: 20,
            color: enabled ? ink : soft,
          ),
        ),
      ),
    );
  }
}

class _SearchHitCard extends StatelessWidget {
  const _SearchHitCard({
    required this.dark,
    required this.text,
    required this.reference,
    required this.onTap,
  });

  final bool dark;
  final String text;
  final String reference;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final title = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF64748B);
    return Material(
      color: surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                reference,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0284C7),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                text,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.right,
                textDirection: TextDirection.rtl,
                style: verseStyle(fontSize: 16, color: title, height: 1.7),
              ),
              const SizedBox(height: 4),
              Text(
                'اضغط للانتقال',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: muted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClearHighlightPainter extends CustomPainter {
  const _ClearHighlightPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(size.width * 0.28, size.height * 0.72),
      Offset(size.width * 0.72, size.height * 0.28),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _ClearHighlightPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _SelectionBar extends StatelessWidget {
  const _SelectionBar({
    required this.countLabel,
    required this.highlights,
    required this.onClear,
    required this.onHighlight,
    required this.onClearHighlight,
    required this.onCopy,
    required this.onFavorite,
    required this.onNote,
    required this.onReflect,
    required this.onMemorize,
  });

  final String countLabel;
  final List<Color> highlights;
  final VoidCallback onClear;
  final ValueChanged<Color> onHighlight;
  final VoidCallback onClearHighlight;
  final VoidCallback onCopy;
  final VoidCallback onFavorite;
  final VoidCallback onNote;
  final VoidCallback onReflect;
  final VoidCallback onMemorize;

  @override
  Widget build(BuildContext context) {
    // Always white — independent from the bible paper background.
    const surface = Colors.white;
    const border = Color(0xFFE2E8F0);
    return Material(
      color: surface,
      elevation: 10,
      shadowColor: const Color(0x330F172A),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: const BoxDecoration(
          color: surface,
          border: Border(top: BorderSide(color: border, width: 1)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0EA5E9).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    countLabel,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      color: Color(0xFF0369A1),
                    ),
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: onClear,
                  icon:
                      const Icon(Icons.close_rounded, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                GestureDetector(
                  onTap: onClearHighlight,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: border, width: 1.4),
                    ),
                    child: CustomPaint(
                      painter: _ClearHighlightPainter(
                        color: const Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                ),
                for (final color in highlights)
                  GestureDetector(
                    onTap: () => onHighlight(color),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: Border.all(color: border),
                      ),
                    ),
                  ),
                _ActionChip(
                    icon: Icons.copy_rounded, label: 'نسخ', onTap: onCopy),
                _ActionChip(
                    icon: Icons.star_rounded,
                    label: 'مفضلة',
                    onTap: onFavorite),
                _ActionChip(
                    icon: Icons.edit_note_rounded,
                    label: 'ملاحظة',
                    onTap: onNote),
                _ActionChip(
                    icon: Icons.psychology_rounded,
                    label: 'احفظ',
                    onTap: onMemorize),
                _ActionChip(
                    icon: Icons.menu_book_rounded,
                    label: 'تأمل',
                    onTap: onReflect),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF0F9FF),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 15, color: const Color(0xFF0369A1)),
              const SizedBox(width: 4),
              Text(
                label,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0369A1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TestamentChip extends StatelessWidget {
  const _TestamentChip({
    required this.label,
    required this.selected,
    required this.dark,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool dark;
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
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: selected
                    ? (dark ? AppColors.darkText : const Color(0xFF0F172A))
                    : (dark
                        ? AppColors.darkMutedText
                        : const Color(0xFF64748B)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LifeSplitDivider extends StatelessWidget {
  const _LifeSplitDivider({
    required this.dark,
    required this.onDrag,
    required this.onHide,
  });

  final bool dark;
  final ValueChanged<double> onDrag;
  final VoidCallback onHide;

  @override
  Widget build(BuildContext context) {
    final line = dark ? const Color(0xFF334155) : const Color(0xFFD5E3F2);
    final accent = dark ? const Color(0xFF7DD3FC) : const Color(0xFF0369A1);
    final fill = dark
        ? Colors.white.withValues(alpha: 0.06)
        : const Color(0xFFF8FAFC);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF64748B);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragUpdate: (details) => onDrag(details.delta.dy),
      child: Container(
        width: double.infinity,
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: fill,
          border: Border(
            top: BorderSide(color: line),
            bottom: BorderSide(color: line),
          ),
        ),
        child: Row(
          children: [
            Icon(Icons.drag_handle_rounded, size: 20, color: muted),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'كتاب الحياة · اسحب للتحريك',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: accent,
                ),
              ),
            ),
            Material(
              color: dark
                  ? Colors.white.withValues(alpha: 0.08)
                  : const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(99),
              child: InkWell(
                onTap: onHide,
                borderRadius: BorderRadius.circular(99),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.close_rounded, size: 14, color: muted),
                      const SizedBox(width: 4),
                      Text(
                        'إخفاء',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LifeLine extends StatelessWidget {
  const _LifeLine({
    required this.dark,
    required this.muted,
    required this.fontSize,
    required this.body,
  });

  final bool dark;
  final Color muted;
  final double fontSize;
  final String body;

  @override
  Widget build(BuildContext context) {
    final accent = dark ? const Color(0xFF7DD3FC) : const Color(0xFF0369A1);
    final line = dark ? const Color(0xFF334155) : const Color(0xFFD5E3F2);
    return Padding(
      padding: const EdgeInsets.only(top: 10, right: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 18,
                height: 1,
                color: line,
              ),
              const SizedBox(width: 8),
              Text(
                'كتاب الحياة',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: accent.withValues(alpha: 0.85),
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            body,
            textAlign: TextAlign.right,
            textDirection: TextDirection.rtl,
            style: TextStyle(
              fontFamily: AppFonts.verse,
              fontSize: fontSize,
              height: 1.85,
              fontWeight: FontWeight.w500,
              color: muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _VerseNoteDialog extends StatefulWidget {
  const _VerseNoteDialog({required this.initial});

  final String initial;

  @override
  State<_VerseNoteDialog> createState() => _VerseNoteDialogState();
}

class _VerseNoteDialogState extends State<_VerseNoteDialog> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('ملاحظة على الآية'),
      content: TextField(
        controller: _controller,
        minLines: 3,
        maxLines: 6,
        autofocus: true,
        textDirection: TextDirection.rtl,
        decoration: const InputDecoration(hintText: 'اكتب ملاحظتك'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('إلغاء'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _controller.text.trim()),
          child: const Text('حفظ'),
        ),
      ],
    );
  }
}

enum _ReaderMenuAction { search, favorites, highlights, notes }

class _PaperTheme {
  const _PaperTheme({
    required this.swatch,
    required this.lightTop,
    required this.lightBottom,
    required this.darkTop,
    required this.darkBottom,
  });

  final Color swatch;
  final Color lightTop;
  final Color lightBottom;
  final Color darkTop;
  final Color darkBottom;
}

class _ReaderSettingsSheet extends StatefulWidget {
  const _ReaderSettingsSheet({
    required this.dark,
    required this.prefs,
    required this.textColors,
    required this.paperThemes,
    required this.onPrefsChanged,
  });

  final bool dark;
  final BibleReaderPrefs prefs;
  final List<Color?> textColors;
  final List<_PaperTheme> paperThemes;
  final Future<void> Function(BibleReaderPrefs prefs) onPrefsChanged;

  @override
  State<_ReaderSettingsSheet> createState() => _ReaderSettingsSheetState();
}

class _ReaderSettingsSheetState extends State<_ReaderSettingsSheet> {
  late double _fontSize = widget.prefs.fontSize;
  late bool _stripDiacritics = widget.prefs.stripDiacritics;
  late bool _parallel = widget.prefs.parallelTranslation;
  late bool _inlineLife = widget.prefs.inlineLife;
  late bool _showNotesUnderVerse = widget.prefs.showNotesUnderVerse;
  late int _textColor = widget.prefs.textColor;
  late int _background = widget.prefs.background;

  BibleReaderPrefs get _snapshot => BibleReaderPrefs(
        fontSize: _fontSize,
        stripDiacritics: _stripDiacritics,
        parallelTranslation: _parallel,
        inlineLife: _inlineLife,
        showNotesUnderVerse: _showNotesUnderVerse,
        textColor: _textColor,
        background: _background,
        bookId: widget.prefs.bookId,
        chapter: widget.prefs.chapter,
      );

  Future<void> _commitPrefs() => widget.onPrefsChanged(_snapshot);

  @override
  Widget build(BuildContext context) {
    final dark = widget.dark;
    final bg = dark ? AppColors.darkCard : const Color(0xFFF8FAFC);
    final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final title = dark ? AppColors.darkText : AppColors.navy;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final bottomPad = MediaQuery.paddingOf(context).bottom;

    Widget quickChip({
      required IconData icon,
      required Color tint,
      required String label,
      required _ReaderMenuAction action,
    }) {
      return Expanded(
        child: Material(
          color: dark ? AppColors.darkCardMuted : Colors.white,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: () => Navigator.pop(context, action),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: border),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 17, color: tint),
                  const SizedBox(height: 3),
                  Text(
                    label,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: title,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Material(
      color: bg,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 0, 16, 12 + bottomPad),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              youthSheetHandle(),
              Text(
                'إعدادات القراءة',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: title,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  quickChip(
                    icon: Icons.search_rounded,
                    tint: const Color(0xFF0284C7),
                    label: 'بحث',
                    action: _ReaderMenuAction.search,
                  ),
                  const SizedBox(width: 8),
                  quickChip(
                    icon: Icons.star_rounded,
                    tint: const Color(0xFFF59E0B),
                    label: 'مفضلة',
                    action: _ReaderMenuAction.favorites,
                  ),
                  const SizedBox(width: 8),
                  quickChip(
                    icon: Icons.highlight_rounded,
                    tint: const Color(0xFF10B981),
                    label: 'مظللة',
                    action: _ReaderMenuAction.highlights,
                  ),
                  const SizedBox(width: 8),
                  quickChip(
                    icon: Icons.sticky_note_2_outlined,
                    tint: const Color(0xFF8B5CF6),
                    label: 'ملاحظات',
                    action: _ReaderMenuAction.notes,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
                decoration: BoxDecoration(
                  color: dark ? AppColors.darkCardMuted : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: border),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.text_fields_rounded, size: 16, color: muted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'حجم الخط',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: title,
                            ),
                          ),
                        ),
                        _FontStepper(
                          dark: dark,
                          value: _fontSize.round(),
                          onMinus: () async {
                            setState(() =>
                                _fontSize = (_fontSize - 2).clamp(14, 32));
                            await _commitPrefs();
                          },
                          onPlus: () async {
                            setState(() =>
                                _fontSize = (_fontSize + 2).clamp(14, 32));
                            await _commitPrefs();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          'لون النص',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: title,
                          ),
                        ),
                        const Spacer(),
                        for (var i = 0; i < widget.textColors.length; i++) ...[
                          if (i > 0) const SizedBox(width: 6),
                          _ColorDot(
                            color: widget.textColors[i] ??
                                (dark ? Colors.white : AppColors.navy),
                            selected: _textColor == i,
                            outlined: widget.textColors[i] == null,
                            onTap: () async {
                              setState(() => _textColor = i);
                              await _commitPrefs();
                            },
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          'الخلفية',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: title,
                          ),
                        ),
                        const Spacer(),
                        for (var i = 0; i < widget.paperThemes.length; i++) ...[
                          if (i > 0) const SizedBox(width: 6),
                          _ColorDot(
                            color: widget.paperThemes[i].swatch,
                            selected: _background == i,
                            outlined: i == 1,
                            onTap: () async {
                              setState(() => _background = i);
                              await _commitPrefs();
                            },
                          ),
                        ],
                      ],
                    ),
                    Container(
                      height: 1,
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      color: border,
                    ),
                    _ReaderToggleTile(
                      dark: dark,
                      icon: Icons.format_clear_rounded,
                      label: 'إزالة التشكيل',
                      value: _stripDiacritics,
                      onChanged: (v) async {
                        setState(() => _stripDiacritics = v);
                        await _commitPrefs();
                      },
                    ),
                    _ReaderToggleTile(
                      dark: dark,
                      icon: Icons.sticky_note_2_outlined,
                      label: 'إظهار الملاحظات تحت الآية',
                      value: _showNotesUnderVerse,
                      onChanged: (v) async {
                        setState(() => _showNotesUnderVerse = v);
                        await _commitPrefs();
                      },
                    ),
                    _ReaderToggleTile(
                      dark: dark,
                      icon: Icons.menu_book_rounded,
                      label: 'تقسيم الشاشة مع كتاب الحياة',
                      value: _parallel,
                      onChanged: (v) async {
                        setState(() {
                          _parallel = v;
                          if (v) _inlineLife = false;
                        });
                        await _commitPrefs();
                      },
                    ),
                    _ReaderToggleTile(
                      dark: dark,
                      icon: Icons.book_rounded,
                      label: 'ترجمة الحياة آية بآية',
                      value: _inlineLife,
                      onChanged: (v) async {
                        setState(() {
                          _inlineLife = v;
                          if (v) _parallel = false;
                        });
                        await _commitPrefs();
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReaderToggleTile extends StatelessWidget {
  const _ReaderToggleTile({
    required this.dark,
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final bool dark;
  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final title = dark ? AppColors.darkText : AppColors.navy;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 16, color: muted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: title,
              ),
            ),
          ),
          Switch.adaptive(
            value: value,
            activeThumbColor: Colors.white,
            activeTrackColor: AppColors.steel,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

class _FontStepper extends StatelessWidget {
  const _FontStepper({
    required this.dark,
    required this.value,
    required this.onMinus,
    required this.onPlus,
  });

  final bool dark;
  final int value;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    final bg = dark ? AppColors.darkCard : const Color(0xFFF1F5F9);
    final title = dark ? AppColors.darkText : AppColors.navy;
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _stepBtn(Icons.remove_rounded, onMinus),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '$value',
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: title,
              ),
            ),
          ),
          _stepBtn(Icons.add_rounded, onPlus),
        ],
      ),
    );
  }

  Widget _stepBtn(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 34,
          height: 34,
          child: Icon(icon, size: 16, color: AppColors.steelDark),
        ),
      ),
    );
  }
}

class _ColorDot extends StatelessWidget {
  const _ColorDot({
    required this.color,
    required this.selected,
    required this.onTap,
    this.outlined = false,
  });

  final Color color;
  final bool selected;
  final bool outlined;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: outlined ? Colors.transparent : color,
          shape: BoxShape.circle,
          border: Border.all(
            color: selected ? AppColors.steel : color.withValues(alpha: 0.35),
            width: selected ? 2.5 : 1.2,
          ),
        ),
        child: outlined
            ? Icon(Icons.format_color_text_rounded, size: 14, color: color)
            : (selected
                ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                : null),
      ),
    );
  }
}

class _Hit {
  const _Hit(this.book, this.chapter, this.verse);
  final _Book book;
  final int chapter;
  final _Verse verse;
}

class _Book {
  const _Book(this.id, this.name, this.chapters);
  final String id;
  final String name;
  final List<List<_Verse>> chapters;
}

class _Verse {
  const _Verse(this.number, this.text);
  final int number;
  final String text;
}
