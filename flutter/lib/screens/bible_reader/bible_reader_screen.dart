import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../features/reading/bible_tools.dart';
import '../../features/reading/reading_log_service.dart';
import '../../features/reading/verse_annotations.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

const _highlights = [
  Color(0xFFFFF1A8),
  Color(0xFFD9F99D),
  Color(0xFFBFDBFE),
  Color(0xFFFBCFE8),
];

class BibleReaderScreen extends StatefulWidget {
  const BibleReaderScreen({super.key, this.showBack = true});

  final bool showBack;

  @override
  State<BibleReaderScreen> createState() => _BibleReaderScreenState();
}

class _BibleReaderScreenState extends State<BibleReaderScreen> {
  final _log = ReadingLogService();
  final _notes = VerseAnnotationStore();
  List<_Book> _books = [];
  _Book? _book;
  int _chapter = 1;
  Set<String> _read = {};
  String _query = '';
  List<_Hit> _hits = [];
  BibleReaderPrefs _prefs = BibleReaderPrefs();
  Map<int, String> _life = {};
  Map<String, VerseAnnotation> _annotations = {};
  var _menuOpen = false;
  var _searchOpen = false;
  var _wordMeanings = false;
  final _wordCards = <int, List<({String word, String id, String meaning})>>{};
  static const _textColors = <Color?>[
    null,
    Color(0xFF0A1124),
    Color(0xFF33506E),
    Color(0xFFB42318),
  ];
  final _selected = <String>{};
  var _picking = false;
  var _oldTestament = true;

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
    final read = await _log.loadToday();
    final annotations = await _notes.load();
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
      _read = read;
      _annotations = annotations;
    });
    await _loadLife();
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
        _book!.name,
        _chapter,
        verse.number,
      );
      if (text != null && text.isNotEmpty) map[verse.number] = text;
    }
    if (mounted) setState(() => _life = map);
  }

  String _display(String text) =>
      _prefs.stripDiacritics ? stripArabicDiacritics(text) : text;

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

  Future<void> _showStrongs(int number) async {
    final words =
        await StrongsLookup.instance.verse(_book!.id, _chapter, number);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: words.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(24),
                child: Text('لا يوجد قاموس لهذه الآية',
                    textDirection: TextDirection.rtl),
              )
            : ListView(
                children: [
                  for (final word in words)
                    ListTile(
                      title: Text(word.word, textDirection: TextDirection.rtl),
                      subtitle:
                          Text(word.meaning, textDirection: TextDirection.rtl),
                      trailing: Text(word.id),
                    ),
                ],
              ),
      ),
    );
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
    final controller =
        TextEditingController(text: _annotations[key]?.note ?? '');
    final note = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ملاحظة على الآية'),
        content: TextField(
          controller: controller,
          minLines: 3,
          maxLines: 6,
          textDirection: TextDirection.rtl,
          decoration: const InputDecoration(hintText: 'اكتب ملاحظتك'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('إلغاء')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    controller.dispose();
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
    final next = _chapter + delta;
    if (_book == null || next < 1 || next > _book!.chapters.length) return;
    setState(() {
      _chapter = next;
      _selected.clear();
    });
    await _remember();
    await _loadLife();
  }

  Widget _readerMenu() {
    return Material(
      color: Theme.of(context).cardColor,
      child: Column(
        children: [
          _menuRow(Icons.search, 'بحث في الكتاب', () {
            setState(() {
              _menuOpen = false;
              _searchOpen = !_searchOpen;
            });
          }),
          _menuRow(Icons.star_outline, 'الآيات المفضلة', () {
            setState(() => _menuOpen = false);
            _showSaved(favorites: true);
          }),
          _menuRow(Icons.highlight_outlined, 'الآيات المظللة', () {
            setState(() => _menuOpen = false);
            _showSaved(favorites: false);
          }),
          _menuRow(Icons.text_increase, 'تكبير الخط', () {
            setState(
                () => _prefs.fontSize = (_prefs.fontSize + 2).clamp(14, 32));
            _prefs.save();
          }),
          _menuRow(Icons.text_decrease, 'تصغير الخط', () {
            setState(
                () => _prefs.fontSize = (_prefs.fontSize - 2).clamp(14, 32));
            _prefs.save();
          }),
          _menuRow(
            Icons.format_clear,
            _prefs.stripDiacritics ? 'إظهار التشكيل' : 'إزالة التشكيل',
            () {
              setState(() {
                _prefs.stripDiacritics = !_prefs.stripDiacritics;
                _menuOpen = false;
              });
              _prefs.save();
            },
          ),
          _menuRow(Icons.palette_outlined, 'تغيير لون الكلام', () {
            setState(() =>
                _prefs.textColor = (_prefs.textColor + 1) % _textColors.length);
            _prefs.save();
          }),
          _menuRow(
            Icons.menu_book_outlined,
            _prefs.parallelTranslation
                ? 'إغلاق كتاب الحياة الجانبي'
                : 'فتح كتاب الحياة جنب النص',
            () async {
              setState(() {
                _prefs.parallelTranslation = !_prefs.parallelTranslation;
                if (_prefs.parallelTranslation) _prefs.inlineLife = false;
                _menuOpen = false;
              });
              await _prefs.save();
              await _loadLife();
            },
          ),
          _menuRow(Icons.book_outlined, 'ترجمة الحياة آية بآية', () async {
            setState(() {
              _prefs.inlineLife = !_prefs.inlineLife;
              if (_prefs.inlineLife) {
                _prefs.parallelTranslation = false;
                _wordMeanings = false;
              }
              _menuOpen = false;
            });
            await _prefs.save();
            await _loadLife();
          }),
          _menuRow(
            Icons.translate,
            _wordMeanings ? 'إغلاق معاني الكلمات' : 'معاني الكلمات',
            () {
              setState(() {
                _wordMeanings = !_wordMeanings;
                if (_wordMeanings) _prefs.inlineLife = false;
                _menuOpen = false;
              });
              _loadWordMeanings();
            },
          ),
        ],
      ),
    );
  }

  Future<void> _loadWordMeanings() async {
    if (!_wordMeanings || _book == null) {
      if (mounted) setState(_wordCards.clear);
      return;
    }
    final next = <int, List<({String word, String id, String meaning})>>{};
    for (final key in _selected) {
      final number = int.tryParse(key.split(':').elementAtOrNull(2) ?? '');
      if (number == null) continue;
      next[number] =
          await StrongsLookup.instance.verse(_book!.id, _chapter, number);
    }
    if (mounted)
      setState(() {
        _wordCards
          ..clear()
          ..addAll(next);
      });
  }

  Widget _menuRow(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF78A1BD)),
      title: Text(label, textDirection: TextDirection.rtl),
      onTap: onTap,
    );
  }

  void _showSaved({required bool favorites}) {
    final items = _annotations.entries.where((entry) {
      return favorites ? entry.value.favorite : entry.value.highlight != null;
    }).toList();
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  favorites ? 'الآيات المفضلة' : 'الآيات المظللة',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ),
              if (items.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('لا توجد آيات هنا بعد'),
                )
              else
                for (final item in items)
                  ListTile(
                    title: Text(item.key.replaceAll(':', ' : ')),
                    onTap: () {
                      final parts = item.key.split(':');
                      if (parts.length < 3) return;
                      final chapter = int.tryParse(parts[1]);
                      Navigator.pop(context);
                      if (chapter == null) return;
                      final book = _books.cast<_Book?>().firstWhere(
                            (entry) => entry!.id == parts[0],
                            orElse: () => null,
                          );
                      if (book == null) return;
                      setState(() {
                        _book = book;
                        _chapter = chapter;
                        _searchOpen = false;
                      });
                      _remember();
                      _loadLife();
                    },
                  ),
            ],
          ),
        );
      },
    );
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
    if (_book == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final verses = _book!.chapters[_chapter - 1];
    final searching = _query.trim().length >= 2;
    final completed = _read.contains('${_book!.id}:$_chapter');
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              AppHeader(
                eyebrow: 'كلمة ليومك',
                title: _picking ? 'اختيار القراءة' : 'قراءة الكتاب المقدس',
                onBack: () {
                  if (_picking) {
                    setState(() => _picking = false);
                  } else if (widget.showBack) {
                    Navigator.maybePop(context);
                  }
                },
                trailing: _picking
                    ? null
                    : HeaderAction(
                        icon: Icons.more_vert,
                        onPressed: () => setState(() => _menuOpen = !_menuOpen),
                      ),
              ),
              if (!_picking)
                Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                child: Row(
                  children: [
                    _ChapterButton(
                      label: 'السابق',
                      icon: Icons.chevron_right,
                      enabled: _chapter > 1,
                      onTap: () => _shiftChapter(-1),
                    ),
                    Expanded(
                      child: TextButton(
                        onPressed: () => setState(() => _picking = true),
                        child: Text('${_book!.name} $_chapter'),
                      ),
                    ),
                    _ChapterButton(
                      label: 'التالي',
                      icon: Icons.chevron_left,
                      trailing: true,
                      enabled: _chapter < _book!.chapters.length,
                      onTap: () => _shiftChapter(1),
                    ),
                  ],
                ),
              ),
              if (_searchOpen && !_picking)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: TextField(
                    autofocus: true,
                    onChanged: _search,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'اكتب كلمة أو جملة',
                    ),
                  ),
                ),
              if (_menuOpen && !_picking) _readerMenu(),
              Expanded(
                child: _picking
                    ? _placePicker()
                    : searching
                    ? ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _hits.length,
                        itemBuilder: (context, index) {
                          final hit = _hits[index];
                          return ListTile(
                            title: Text(
                              _display(hit.verse.text),
                              textDirection: TextDirection.rtl,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                                '${hit.book.name} ${hit.chapter}:${hit.verse.number}'),
                            onTap: () async {
                              setState(() {
                                _book = hit.book;
                                _chapter = hit.chapter;
                                _query = '';
                                _hits = [];
                                _selected.clear();
                              });
                              await _remember();
                              await _loadLife();
                            },
                          );
                        },
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: verses.length,
                        itemBuilder: (context, index) {
                          final verse = verses[index];
                          final key = _key(verse.number);
                          final annotation = _annotations[key];
                          final selected = _selected.contains(key);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Material(
                              color: selected
                                  ? const Color(0x3378A1BD)
                                  : _color(annotation?.highlight) ??
                                      Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onLongPress: () =>
                                    setState(() => _selected.add(key)),
                                onTap: () {
                                  if (_selected.isEmpty) {
                                    _showStrongs(verse.number);
                                    return;
                                  }
                                  setState(() {
                                    if (selected) {
                                      _selected.remove(key);
                                    } else {
                                      _selected.add(key);
                                    }
                                  });
                                  if (_wordMeanings) _loadWordMeanings();
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Row(
                                        textDirection: TextDirection.rtl,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            width: 28,
                                            height: 28,
                                            alignment: Alignment.center,
                                            decoration: BoxDecoration(
                                              color: const Color(0x1A78A1BD),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              '${verse.number}',
                                              style: const TextStyle(
                                                  color: Color(0xFF78A1BD),
                                                  fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              '${_display(verse.text)}${annotation?.favorite == true ? '  ★' : ''}',
                                              textDirection: TextDirection.rtl,
                                              textAlign: TextAlign.right,
                                              style: TextStyle(
                                                fontSize: _prefs.fontSize,
                                                height: 1.8,
                                                color: _textColors[_prefs
                                                    .textColor
                                                    .clamp(0,
                                                        _textColors.length - 1)
                                                    .toInt()],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (_prefs.inlineLife &&
                                          selected &&
                                          !_wordMeanings)
                                        _LifeCard(
                                          label: 'ترجمة الحياة',
                                          body: _life[verse.number] ??
                                              'الترجمة غير متاحة لهذه الآية.',
                                        ),
                                      if (_wordMeanings && selected)
                                        _WordMeaningsCard(
                                            items: _wordCards[verse.number] ??
                                                const []),
                                      if (_prefs.parallelTranslation &&
                                          _life[verse.number] != null)
                                        _LifeCard(
                                            label: 'كتاب الحياة',
                                            body: _life[verse.number]!),
                                      if (annotation?.note?.isNotEmpty == true)
                                        Text(
                                          annotation!.note!,
                                          textDirection: TextDirection.rtl,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            height: 1.5,
                                            color: Color(0xFF667085),
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
              if (_selected.isNotEmpty)
                Material(
                  elevation: 8,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Text('${_selected.length} آية'),
                            const Spacer(),
                            IconButton(
                              onPressed: () => setState(_selected.clear),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                        Wrap(
                          spacing: 8,
                          children: [
                            for (final color in _highlights)
                              GestureDetector(
                                onTap: () {
                                  for (final key in _selected) {
                                    final current = _annotations[key] ??
                                        const VerseAnnotation();
                                    _update(
                                      key,
                                      current.copyWith(
                                        highlight:
                                            '#${color.toARGB32().toRadixString(16).padLeft(8, '0')}',
                                      ),
                                    );
                                  }
                                },
                                child: CircleAvatar(
                                    radius: 14, backgroundColor: color),
                              ),
                            IconButton(
                              tooltip: 'نسخ',
                              onPressed: _copySelectedVerses,
                              icon: const Icon(Icons.copy_outlined),
                            ),
                            IconButton(
                              tooltip: 'إزالة التظليل',
                              onPressed: () {
                                for (final key in _selected) {
                                  final current = _annotations[key];
                                  if (current == null) continue;
                                  _update(key,
                                      current.copyWith(clearHighlight: true));
                                }
                              },
                              icon: const Icon(Icons.format_color_reset),
                            ),
                            IconButton(
                              tooltip: 'مفضلة',
                              onPressed: () {
                                for (final key in _selected) {
                                  final current = _annotations[key] ??
                                      const VerseAnnotation();
                                  _update(
                                      key,
                                      current.copyWith(
                                          favorite: !current.favorite));
                                }
                              },
                              icon: const Icon(Icons.star_outline),
                            ),
                            IconButton(
                              tooltip: 'ملاحظة',
                              onPressed: _editNote,
                              icon: const Icon(Icons.edit_note),
                            ),
                            IconButton(
                              tooltip: 'تأمل',
                              onPressed: _reflect,
                              icon: const Icon(Icons.menu_book_outlined),
                            ),
                            IconButton(
                              tooltip: 'قاموس سترونج',
                              onPressed: () {
                                final parts = _selected.first.split(':');
                                _showStrongs(int.parse(parts[2]));
                              },
                              icon: const Icon(Icons.translate),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: FilledButton.icon(
                    onPressed: () async {
                      await _log.toggle(
                        bookId: _book!.id,
                        chapter: _chapter,
                        completed: !completed,
                      );
                      if (!mounted) return;
                      setState(() {
                        final id = '${_book!.id}:$_chapter';
                        if (completed) {
                          _read.remove(id);
                        } else {
                          _read.add(id);
                        }
                      });
                    },
                    icon: Icon(
                      completed
                          ? Icons.check_circle
                          : Icons.check_circle_outline,
                    ),
                    label: Text(completed
                        ? 'تمت قراءة الإصحاح'
                        : 'علّم الإصحاح كمقروء'),
                    style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48)),
                  ),
                ),
            ],
          ),
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

  Widget _placePicker() {
    final books = _books.where((book) {
      final id = int.tryParse(book.id) ?? 0;
      return _oldTestament ? id <= 39 : id >= 40;
    }).toList();
    final dark = Theme.of(context).brightness == Brightness.dark;
    final card = dark ? AppColors.darkCard : AppColors.lightCard;
    final text = dark ? AppColors.darkText : AppColors.lightText;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: const LinearGradient(colors: [Color(0xFF0A1124), Color(0xFF33506E)]),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('اختار المكان اللي تحب تقرأ منه', textAlign: TextAlign.right, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
              SizedBox(height: 8),
              Text('حدد العهد والسفر والإصحاح، وبعدها افتح القراءة مباشرة.', textAlign: TextAlign.right, style: TextStyle(color: Colors.white)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SegmentedButton<bool>(
          segments: const [
            ButtonSegment(value: true, label: Text('العهد القديم')),
            ButtonSegment(value: false, label: Text('العهد الجديد')),
          ],
          selected: {_oldTestament},
          onSelectionChanged: (value) => setState(() => _oldTestament = value.first),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final book in books)
              ChoiceChip(
                label: Text(book.name),
                selected: _book?.id == book.id,
                onSelected: (_) => setState(() {
                  _book = book;
                  _chapter = 1;
                }),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text('الإصحاح', textAlign: TextAlign.right, style: TextStyle(color: text, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (var chapter = 1; chapter <= (_book?.chapters.length ?? 0); chapter++)
              ChoiceChip(
                label: Text('$chapter'),
                selected: _chapter == chapter,
                onSelected: (_) => setState(() => _chapter = chapter),
              ),
          ],
        ),
        const SizedBox(height: 16),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: card == AppColors.darkCard ? AppColors.accent : AppColors.navy, minimumSize: const Size.fromHeight(48)),
          onPressed: _book == null
              ? null
              : () async {
                  setState(() => _picking = false);
                  await _remember();
                  await _loadLife();
                },
          child: Text('ابدأ القراءة: ${_book?.name ?? ''} $_chapter'),
        ),
      ],
    );
  }
}

class _ChapterButton extends StatelessWidget {
  const _ChapterButton({
    required this.label,
    required this.icon,
    required this.enabled,
    required this.onTap,
    this.trailing = false,
  });

  final String label;
  final IconData icon;
  final bool enabled;
  final bool trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = enabled ? const Color(0xFF0A1124) : const Color(0xFFC0C8D6);
    final iconWidget =
        Icon(icon, color: enabled ? Colors.white : color, size: 22);
    final text = Text(label,
        style: TextStyle(
            color: enabled ? Colors.white : color,
            fontWeight: FontWeight.w700));
    return Material(
      color: enabled ? const Color(0xFF0A1124) : const Color(0xFFF8FAFD),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: trailing ? [text, iconWidget] : [iconWidget, text],
          ),
        ),
      ),
    );
  }
}

class _LifeCard extends StatelessWidget {
  const _LifeCard({required this.label, required this.body});

  final String label;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8, right: 36),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0x1A78A1BD),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x3378A1BD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(label,
              style: const TextStyle(
                  color: Color(0xFF78A1BD),
                  fontSize: 12,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(body,
              textAlign: TextAlign.right,
              textDirection: TextDirection.rtl,
              style: const TextStyle(
                  fontSize: 15, height: 1.65, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _WordMeaningsCard extends StatelessWidget {
  const _WordMeaningsCard({required this.items});

  final List<({String word, String id, String meaning})> items;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(top: 8, right: 36),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: dark ? AppColors.darkCardMuted : AppColors.lightCardMuted,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x3378A1BD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const Text('معاني الكلمات',
              style: TextStyle(
                  color: Color(0xFF78A1BD),
                  fontSize: 12,
                  fontWeight: FontWeight.w900)),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('لسه مفيش معاني محفوظة للآية دي.',
                  textAlign: TextAlign.right),
            )
          else
            for (final item in items)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.only(top: 8),
                decoration: BoxDecoration(
                  border: Border(
                      top: BorderSide(
                          color: dark
                              ? AppColors.darkBorder
                              : AppColors.lightBorder)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(item.word,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w900)),
                    Text(item.id,
                        textAlign: TextAlign.right,
                        style: const TextStyle(fontSize: 12)),
                    Text(
                      item.meaning.isEmpty
                          ? 'لم يتم تحميل معنى هذا الرقم بعد.'
                          : item.meaning,
                      textAlign: TextAlign.right,
                      textDirection: TextDirection.rtl,
                    ),
                  ],
                ),
              ),
        ],
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
