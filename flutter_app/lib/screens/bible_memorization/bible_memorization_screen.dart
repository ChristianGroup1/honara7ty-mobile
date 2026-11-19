import 'dart:convert';
import 'dart:math';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/memorization/arabic_answer.dart';
import '../../features/memorization/memorization_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/youth_screen_shell.dart';

class BibleMemorizationScreen extends StatefulWidget {
  const BibleMemorizationScreen({super.key, this.initial});

  final MemorizationSeed? initial;
  @override
  State<BibleMemorizationScreen> createState() =>
      _BibleMemorizationScreenState();
}

class _BibleMemorizationScreenState extends State<BibleMemorizationScreen> {
  final _service = MemorizationService();
  final _random = Random();
  List<_Book> _books = [];
  List<MemorizationAttempt> _history = [];
  MemorizationGoal _goal = const MemorizationGoal();
  _Book? _book;
  var _oldTestament = true;
  int _chapter = 1;
  Set<int> _selected = {};
  String _difficulty = 'medium';
  String _fillLevel = 'medium';
  static const _fillLevels = {'easy', 'medium', 'hard'};
  static const _orderChunk = 12;
  bool _stats = false, _reciting = false, _result = false;
  List<_Word> _words = [];
  String _fullAnswer = '';
  int _orderMistakes = 0, _orderPlaced = 0;
  int? _orderWrongTap;
  List<int> _orderPool = [];
  List<int> _fadeOrder = [];
  int _fadeRound = 1;
  static const _fadeRounds = 4;
  bool _fadeChecked = false;
  int _fadeScore = 0, _fadeTotal = 0;
  int _letterCursor = 0, _letterTries = 0;
  bool _letterWrong = false;
  bool _fullBlurred = false;
  final _letterInput = TextEditingController();
  final _letterFocus = FocusNode();
  int? _activeBlank;
  final _blankKeys = <int, GlobalKey>{};
  final _reciteScroll = ScrollController();
  static const _modes = [
    (
      key: 'fill',
      label: 'أكمل',
      icon: Icons.edit_rounded,
      hint: 'كلمات من الآية بتتخفى، واكتبها من ذاكرتك.',
    ),
    (
      key: 'order',
      label: 'ترتيب الكلمات',
      icon: Icons.swap_vert_rounded,
      hint: 'الكلمات مخلوطة، اضغط عليها بالترتيب الصح.',
    ),
    (
      key: 'choice',
      label: 'اختار الكلمة',
      icon: Icons.checklist_rounded,
      hint: 'مكان كل كلمة ناقصة فيه ٤ اختيارات، اختار الصح.',
    ),
    (
      key: 'letters',
      label: 'أول حرف',
      icon: Icons.abc_rounded,
      hint:
          'بيظهر أول حرف من كل كلمة كتلميح، واكتب الكلمة كاملة والتطبيق يصحح.',
    ),
    (
      key: 'fade',
      label: 'اختفاء تدريجي',
      icon: Icons.blur_on_rounded,
      hint:
          '٤ جولات، في كل جولة تكتب الكلمات المخفية والمخفي بيزيد لحد ما تكتب الآية كلها.',
    ),
    (
      key: 'full',
      label: 'كتابة كاملة',
      icon: Icons.keyboard_rounded,
      hint: 'اكتب الآية كلها من ذاكرتك.',
    ),
  ];
  DateTime? _started;
  int _score = 0, _total = 0;
  final _bookKeys = <String, GlobalKey>{};
  final _bookScroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _bookScroll.dispose();
    _reciteScroll.dispose();
    _letterInput.dispose();
    _letterFocus.dispose();
    super.dispose();
  }

  List<_Book> get _visibleBooks => _books.where((book) {
        final id = int.tryParse(book.id) ?? 0;
        return _oldTestament ? id <= 39 : id >= 40;
      }).toList();

  void _selectBook(_Book book) {
    if (_book?.id == book.id) return;
    setState(() {
      _book = book;
      _oldTestament = (int.tryParse(book.id) ?? 0) <= 39;
      _chapter = 1;
      _selected = {};
    });
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
    final books = _books
        .where((book) => ((int.tryParse(book.id) ?? 0) <= 39) == oldTestament)
        .toList();
    if (books.isEmpty) return;
    if (_bookScroll.hasClients) _bookScroll.jumpTo(0);
    _selectBook(books.first);
  }

  void _shiftBook(int offset) {
    final books = _visibleBooks;
    final index = books.indexWhere((book) => book.id == _book?.id);
    final next = index + offset;
    if (index < 0 || next < 0 || next >= books.length) return;
    _selectBook(books[next]);
  }

  Future<void> _load() async {
    final data =
        jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
            as Map<String, dynamic>;
    final books = (data['books'] as List).asMap().entries.map((entry) {
      final value = entry.value as Map<String, dynamic>;
      return _Book(
        '${entry.key + 1}',
        value['name'] as String,
        (value['chapters'] as List)
            .map((chapter) =>
                ((chapter as Map<String, dynamic>)['verses'] as List)
                    .map((verse) {
                  final v = verse as Map<String, dynamic>;
                  return _Verse(v['verse'] as int, v['text'] as String);
                }).toList())
            .toList(),
      );
    }).toList();
    if (!mounted) return;
    final seed = widget.initial;
    final seededBook = seed == null
        ? null
        : books.cast<_Book?>().firstWhere(
              (item) => item!.id == seed.bookId,
              orElse: () => null,
            );
    final seededChapter = seededBook != null &&
            seed!.chapter >= 1 &&
            seed.chapter <= seededBook.chapters.length
        ? seed.chapter
        : null;
    setState(() {
      _books = books;
      _book = seededChapter != null
          ? seededBook
          : books.firstWhere(
              (item) => (int.tryParse(item.id) ?? 0) <= 39,
              orElse: () => books.first,
            );
      _oldTestament = (int.tryParse(_book!.id) ?? 0) <= 39;
      if (seededChapter != null) {
        _chapter = seededChapter;
        final available = {
          for (final verse in seededBook!.chapters[seededChapter - 1])
            verse.number,
        };
        _selected = seed!.verses.where(available.contains).toSet();
      } else {
        _selected = {};
      }
    });
    if (seededChapter != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final chipContext = _bookKeys[_book!.id]?.currentContext;
        final target = chipContext?.findRenderObject();
        if (chipContext != null && target != null) {
          Scrollable.of(chipContext).position.ensureVisible(
                target,
                alignment: 0.5,
              );
        }
      });
    }
    final history = await _service.load();
    final goal = await _service.goal();
    if (!mounted) return;
    setState(() {
      _history = history;
      _goal = goal;
    });
  }

  List<_Verse> get _verses => _book!.chapters[_chapter - 1];
  String get _text => _verses
      .where((v) => _selected.contains(v.number))
      .map((v) => stripVerseNumber(v.text).trim())
      .join(' ');
  String _normal(String s) => normalizeArabicAnswer(s);

  bool get _canStart =>
      _book != null && _selected.isNotEmpty && _difficulty.isNotEmpty;

  String get _passageSummary {
    if (_book == null || _selected.isEmpty) return 'اختر الآيات اللي هتحفظها';
    final verses = (_selected.toList()..sort()).join('، ');
    return 'المقطع: ${_book!.name} $_chapter — الآيات $verses';
  }

  bool get _isFill => _fillLevels.contains(_difficulty);

  bool get _choiceActive => _difficulty == 'choice';

  static bool _isMeaningful(String word) =>
      word.replaceAll(RegExp(r'[،.؟!:؛]'), '').length >= 3;

  void _start() {
    if (!_canStart) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختار الآيات وطريقة الحفظ قبل البداية')),
      );
      return;
    }
    final words = verseWords(_text);
    final candidates = [
      for (var i = 0; i < words.length; i++)
        if (_isMeaningful(words[i])) i
    ]..shuffle(_random);
    final ratio = switch (_difficulty) {
      'easy' => .2,
      'hard' => .5,
      'full' => 1.0,
      _ => .35,
    };
    final hidden = switch (_difficulty) {
      'easy' ||
      'medium' ||
      'hard' ||
      'choice' =>
        candidates.take(max(1, (candidates.length * ratio).round())).toSet(),
      _ => <int>{},
    };
    final hideAll = _difficulty == 'full' || _difficulty == 'letters';
    _fadeOrder = [for (var i = 0; i < words.length; i++) i]..shuffle(_random);
    final built = _difficulty == 'fade'
        ? _fadeWords(words, 1)
        : [
            for (var i = 0; i < words.length; i++)
              _Word(words[i], hideAll || hidden.contains(i))
          ];
    if (_difficulty == 'choice') _assignOptions(built);
    _blankKeys.clear();
    _letterInput.clear();
    if (_reciteScroll.hasClients) _reciteScroll.jumpTo(0);
    setState(() {
      _words = built;
      _fullAnswer = '';
      _orderMistakes = 0;
      _orderPlaced = 0;
      _orderWrongTap = null;
      _orderPool = [];
      _fadeRound = 1;
      _fadeChecked = false;
      _fadeScore = 0;
      _fadeTotal = 0;
      _letterCursor = 0;
      _letterTries = 0;
      _letterWrong = false;
      _fullBlurred = false;
      _activeBlank = _difficulty == 'choice' ? _firstBlank(built) : null;
      _started = DateTime.now();
      _reciting = true;
      _result = false;
      _stats = false;
    });
    if (_difficulty == 'order') _refillOrderPool();
    if (_difficulty == 'letters') _skipEmptyLetters();
  }

  static int? _firstBlank(List<_Word> words) {
    final index = words.indexWhere((w) => w.hidden);
    return index == -1 ? null : index;
  }

  void _assignOptions(List<_Word> words) {
    final pool = <String>{
      for (final verse in _verses)
        for (final word in verseWords(stripVerseNumber(verse.text)))
          if (_isMeaningful(word)) word,
    }.toList();
    for (final word in words.where((w) => w.hidden)) {
      final distractors = pool
          .where((candidate) => _normal(candidate) != _normal(word.text))
          .toList()
        ..shuffle(_random);
      word.options = [word.text, ...distractors.take(3)]..shuffle(_random);
    }
  }

  void _skipEmptyLetters() {
    while (_letterCursor < _words.length &&
        _normal(_firstLetter(_words[_letterCursor].text)).isEmpty) {
      final word = _words[_letterCursor];
      word.answer = word.text;
      _letterCursor++;
    }
    if (_letterCursor >= _words.length) {
      _check();
    } else {
      _revealBlank(_letterCursor);
    }
  }

  void _submitLetterWord() {
    final value = _letterInput.text.trim();
    if (value.isEmpty || _letterCursor >= _words.length) return;
    _letterInput.clear();
    _letterFocus.requestFocus();
    final word = _words[_letterCursor];
    if (_normal(value) == _normal(word.text)) {
      word.answer = word.text;
      _advanceLetter();
      return;
    }
    HapticFeedback.lightImpact();
    if (_letterTries >= 1) {
      word.answer = value;
      _advanceLetter();
    } else {
      setState(() {
        _letterTries++;
        _letterWrong = true;
      });
    }
  }

  void _giveUpLetter() {
    if (_letterCursor >= _words.length) return;
    _words[_letterCursor].answer = '';
    _advanceLetter();
  }

  void _advanceLetter() {
    setState(() {
      _letterCursor++;
      _letterTries = 0;
      _letterWrong = false;
    });
    _skipEmptyLetters();
  }

  void _refillOrderPool() {
    final end = min(_orderPlaced + _orderChunk, _words.length);
    _orderPool = [for (var i = _orderPlaced; i < end; i++) i]..shuffle(_random);
  }

  void _tapOrderWord(int index) {
    if (index == _orderPlaced) {
      setState(() {
        _orderPlaced++;
        _orderPool.remove(index);
        _orderWrongTap = null;
        if (_orderPool.isEmpty && _orderPlaced < _words.length) {
          _refillOrderPool();
        }
      });
      _followOrderProgress();
      if (_orderPlaced == _words.length) _check();
    } else {
      HapticFeedback.lightImpact();
      setState(() {
        _orderMistakes++;
        _orderWrongTap = index;
      });
    }
  }

  Future<void> _check() async {
    if (_difficulty == 'order') {
      final total = _words.length;
      await _finish(
        score: max(0, total - _orderMistakes),
        total: total,
      );
      return;
    }
    final graded = _gradeWords(fullText: _difficulty == 'full');
    await _finish(score: graded.score, total: graded.total);
  }

  ({int score, int total}) _gradeWords({required bool fullText}) {
    final answers = fullText ? verseWords(_fullAnswer) : <String>[];
    var cursor = 0;
    var score = 0;
    var total = 0;
    for (final word in _words) {
      if (!word.hidden) continue;
      total++;
      final answer = fullText
          ? (cursor < answers.length ? answers[cursor++] : '')
          : word.answer;
      word.correct = _normal(answer) == _normal(word.text);
      word.answer = answer;
      if (word.correct!) score++;
    }
    return (score: score, total: total);
  }

  bool get _fadeFinalRound => _fadeRound >= _fadeRounds;

  List<_Word> _fadeWords(List<String> texts, int round) {
    final count = max(1, (texts.length * round / _fadeRounds).round())
        .clamp(1, texts.length);
    final hidden = _fadeOrder.take(count).toSet();
    return [
      for (var i = 0; i < texts.length; i++) _Word(texts[i], hidden.contains(i))
    ];
  }

  Future<void> _checkFadeRound() async {
    final graded = _gradeWords(fullText: _fadeFinalRound);
    setState(() {
      _fadeScore += graded.score;
      _fadeTotal += graded.total;
      _fadeChecked = true;
    });
    if (_fadeFinalRound) {
      await _finish(score: _fadeScore, total: _fadeTotal);
    }
  }

  void _nextFadeRound() {
    final texts = [for (final w in _words) w.text];
    if (_reciteScroll.hasClients) _reciteScroll.jumpTo(0);
    setState(() {
      _fadeRound++;
      _fadeChecked = false;
      _fullAnswer = '';
      _words = _fadeWords(texts, _fadeRound);
    });
  }

  Future<void> _finish({required int score, required int total}) async {
    final attempt = MemorizationAttempt(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      bookId: _book!.id,
      bookName: _book!.name,
      chapter: _chapter,
      verses: _selected.toList()..sort(),
      score: score,
      total: total,
      timeSeconds: DateTime.now().difference(_started!).inSeconds,
      difficulty: _difficulty,
      createdAt: DateTime.now(),
    );
    final saved = await _service.save(attempt);
    if (!mounted) return;
    setState(() {
      _score = score;
      _total = total;
      _history.insert(0, saved.attempt);
      _result = true;
      _reciting = false;
    });
    if (!saved.synced) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'اتحفظت على الجهاز، وهتتبعت لـ Supabase تلقائي لما النت يستقر.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final title = _stats
        ? 'الإحصائيات'
        : _reciting
            ? 'التسميع'
            : _result
                ? 'النتيجة'
                : 'حفظ الكتاب المقدس';

    return Scaffold(
      backgroundColor: youthBg(isDark),
      body: Stack(
        children: [
          YouthAmbientBlurs(dark: isDark),
          Column(
            children: [
              YouthStickyHeader(
                dark: isDark,
                eyebrow: 'ذاكرة القلب',
                title: title,
                onBack: () {
                  if (_stats || _reciting || _result) {
                    setState(() {
                      _stats = _reciting = _result = false;
                    });
                  } else {
                    Navigator.maybePop(context);
                  }
                },
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.psychology_rounded,
                  color: const Color(0xFF7C3AED),
                  bg: const Color(0xFFF5F3FF),
                ),
              ),
              Expanded(
                child: _books.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _stats
                        ? _statsView(isDark)
                        : _result
                            ? _resultView(isDark)
                            : _reciting
                                ? _reciteView(isDark)
                                : _picker(isDark),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: YouthAppTabBar(
        isDark: isDark,
        currentIndex: -1,
      ),
    );
  }

  Widget _picker(bool isDark) {
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final border = isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final selectedVerses = (_selected.toList()..sort());
    final verseLabel = selectedVerses.isEmpty
        ? 'لم تحدد آيات'
        : selectedVerses.length == 1
            ? 'الآية ${selectedVerses.first}'
            : '${selectedVerses.length} آيات محددة';

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        const YouthHeroBanner(
          badge: 'احفظ آية',
          title: 'اختر الجزء الذي تريد حفظه',
          body:
              'اختار السفر والإصحاح والآيات زي اختيار مقطع الخلوة، وبعدين حدّد مستوى التحدي.',
          icon: Icons.psychology_rounded,
        ),
        const SizedBox(height: 16),
        YouthSoftCard(
          dark: isDark,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: soft,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Material(
                        color: _oldTestament
                            ? (isDark ? AppColors.darkCard : Colors.white)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () => _selectTestament(true),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (_oldTestament) ...[
                                  const Icon(
                                    Icons.auto_stories_outlined,
                                    size: 14,
                                    color: Color(0xFFD97706),
                                  ),
                                  const SizedBox(width: 5),
                                ],
                                Text(
                                  'العهد القديم',
                                  style: TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: _oldTestament ? text : muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Material(
                        color: !_oldTestament
                            ? (isDark ? AppColors.darkCard : Colors.white)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () => _selectTestament(false),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (!_oldTestament) ...[
                                  const Icon(
                                    Icons.auto_stories_outlined,
                                    size: 14,
                                    color: Color(0xFFD97706),
                                  ),
                                  const SizedBox(width: 5),
                                ],
                                Text(
                                  'العهد الجديد',
                                  style: TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: !_oldTestament ? text : muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
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
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(99),
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
                        _MemorizationBookArrow(
                          enabled: _visibleBooks
                                  .indexWhere((b) => b.id == _book?.id) >
                              0,
                          icon: Icons.chevron_right_rounded,
                          onTap: () => _shiftBook(-1),
                        ),
                        const SizedBox(width: 4),
                        _MemorizationBookArrow(
                          enabled: () {
                            final i = _visibleBooks
                                .indexWhere((b) => b.id == _book?.id);
                            return i >= 0 && i < _visibleBooks.length - 1;
                          }(),
                          icon: Icons.chevron_left_rounded,
                          onTap: () => _shiftBook(1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Text(
                            _book!.name,
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        Text(
                          '${_book!.chapters.length} إصحاحاً',
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFCBD5E1),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 32,
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
                                ? const Color(0xFFFBBF24)
                                : Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            child: InkWell(
                              onTap: () => _selectBook(item),
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
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Text(
                    'حدد الإصحاح:',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: text,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF78350F).withValues(alpha: 0.4)
                          : const Color(0xFFFFF5D6),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'الإصحاح $_chapter',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isDark
                            ? const Color(0xFFFBBF24)
                            : const Color(0xFF92400E),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _book!.chapters.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final chapter = index + 1;
                    final selected = _chapter == chapter;
                    return Material(
                      color: selected
                          ? const Color(0xFF0F172A)
                          : (isDark ? AppColors.darkCard : Colors.white),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: selected ? const Color(0xFFFBBF24) : border,
                          width: selected ? 2 : 1,
                        ),
                      ),
                      child: InkWell(
                        onTap: () => setState(() {
                          _chapter = chapter;
                          _selected = {};
                        }),
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          width: 48,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'أصحاح',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: selected
                                      ? const Color(0xFFFBBF24)
                                      : muted,
                                ),
                              ),
                              Text(
                                '$chapter',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: selected ? Colors.white : text,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Text(
                    'حدد الآيات (العدد):',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: text,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: isDark
                          ? const Color(0xFF78350F).withValues(alpha: 0.4)
                          : const Color(0xFFFFF5D6),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      verseLabel,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isDark
                            ? const Color(0xFFFBBF24)
                            : const Color(0xFF92400E),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'لازم تختار عدد الآيات قبل التسميع',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: muted,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _verses.isEmpty
                        ? null
                        : () => setState(() {
                              _selected
                                ..clear()
                                ..addAll(_verses.map((v) => v.number));
                            }),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'تحديد الكل',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () => setState(_selected.clear),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'مسح الكل',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _verses.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final verse = _verses[index];
                    final selected = _selected.contains(verse.number);
                    return Material(
                      color: selected
                          ? const Color(0xFF0F172A)
                          : (isDark ? AppColors.darkCard : Colors.white),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: selected ? const Color(0xFFFBBF24) : border,
                          width: selected ? 2 : 1,
                        ),
                      ),
                      child: InkWell(
                        onTap: () => setState(() {
                          if (!_selected.add(verse.number)) {
                            _selected.remove(verse.number);
                          }
                        }),
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          width: 48,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'آية',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: selected
                                      ? const Color(0xFFFBBF24)
                                      : muted,
                                ),
                              ),
                              Text(
                                '${verse.number}',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: selected ? Colors.white : text,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              if (_selected.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF78350F).withValues(alpha: 0.3)
                        : const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark
                          ? const Color(0xFFFBBF24).withValues(alpha: 0.3)
                          : const Color(0xFFFDE68A).withValues(alpha: 0.6),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.bookmark_outline_rounded,
                        size: 16,
                        color: isDark
                            ? const Color(0xFFFBBF24)
                            : const Color(0xFFB45309),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _passageSummary,
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: text,
                          ),
                        ),
                      ),
                      Material(
                        color: isDark ? AppColors.darkCard : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        child: InkWell(
                          onTap: () => setState(_selected.clear),
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
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        YouthSoftCard(
          dark: isDark,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'طريقة الحفظ',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  color: text,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final mode in _modes)
                    _optionPill(
                      label: mode.label,
                      icon: mode.icon,
                      selected: mode.key == 'fill'
                          ? _isFill
                          : _difficulty == mode.key,
                      onTap: () => setState(() => _difficulty =
                          mode.key == 'fill' ? _fillLevel : mode.key),
                      text: text,
                      soft: soft,
                      border: border,
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                _modes
                    .firstWhere((mode) =>
                        mode.key == 'fill' ? _isFill : mode.key == _difficulty)
                    .hint,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                  height: 1.5,
                  color: muted,
                ),
              ),
              if (_isFill) ...[
                const SizedBox(height: 14),
                Text(
                  'المستوى',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                    color: text,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final level in const {
                      'easy': 'سهل',
                      'medium': 'متوسط',
                      'hard': 'صعب',
                    }.entries)
                      _optionPill(
                        label: level.value,
                        selected: _difficulty == level.key,
                        onTap: () => setState(() {
                          _fillLevel = level.key;
                          _difficulty = level.key;
                        }),
                        text: text,
                        soft: soft,
                        border: border,
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        YouthPrimaryButton(
          label: _canStart ? 'ابدأ التسميع' : 'اختار الآيات أولًا',
          icon: Icons.psychology_rounded,
          onTap: _canStart ? _start : null,
        ),
        const SizedBox(height: 10),
        TextButton.icon(
          onPressed: () => setState(() => _stats = true),
          icon: const Icon(Icons.insights_outlined),
          label: const Text(
            'إحصائياتي',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }

  Widget _reciteView(bool isDark) {
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final border = isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9);

    final dock = _reciteDock(isDark, text, soft, border);
    return Column(
      children: [
        Expanded(child: _recitePassage(isDark, text, soft, border)),
        if (dock.isNotEmpty)
          Material(
            color: isDark ? AppColors.darkCard : Colors.white,
            elevation: 12,
            shadowColor: const Color(0x330F172A),
            child: SafeArea(
              top: false,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(context).height * 0.42,
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: dock,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  List<Widget> _reciteDock(
    bool isDark,
    Color text,
    Color soft,
    Color border,
  ) {
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    if (_difficulty == 'order') {
      return [
        Text(
          'اضغط الكلمة اللي بعدها '
          '(${_arabicDigits(_orderPlaced)} من ${_arabicDigits(_words.length)} · '
          'أخطاء ${_arabicDigits(_orderMistakes)})',
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final index in _orderPool)
              _optionPill(
                label: _words[index].text,
                selected: false,
                wrong: _orderWrongTap == index,
                onTap: () => _tapOrderWord(index),
                text: text,
                soft: soft,
                border: border,
              ),
          ],
        ),
      ];
    }
    if (_difficulty == 'letters') {
      return [
        Text(
          _letterWrong
              ? 'مش الكلمة دي، جرّب مرة كمان'
              : 'اكتب الكلمة المظللة كاملة '
                  '(${_arabicDigits(min(_letterCursor, _words.length))} من ${_arabicDigits(_words.length)})',
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: _letterWrong ? const Color(0xFFDC2626) : muted,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _letterInput,
                focusNode: _letterFocus,
                autofocus: true,
                textAlign: TextAlign.center,
                textDirection: TextDirection.rtl,
                autocorrect: false,
                enableSuggestions: false,
                textInputAction: TextInputAction.done,
                onEditingComplete: _submitLetterWord,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: text,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  filled: true,
                  fillColor: soft,
                  hintText: 'اكتب الكلمة',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(
                      color: _letterWrong ? const Color(0xFFDC2626) : border,
                      width: _letterWrong ? 2 : 1,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _optionPill(
              label: 'تأكيد',
              icon: Icons.check_rounded,
              selected: true,
              onTap: _submitLetterWord,
              text: text,
              soft: soft,
              border: border,
            ),
          ],
        ),
        const SizedBox(height: 8),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton.icon(
            onPressed: _giveUpLetter,
            icon: const Icon(Icons.skip_next_rounded, size: 18),
            label: const Text(
              'مش فاكر الكلمة دي',
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ];
    }
    if (_difficulty == 'fade') {
      final roundWords = _words.where((w) => w.hidden).length;
      final roundCorrect = _words.where((w) => w.correct == true).length;
      return [
        Text(
          _fadeChecked
              ? 'الجولة ${_arabicDigits(_fadeRound)}: ${_arabicDigits(roundCorrect)} من ${_arabicDigits(roundWords)} صح'
              : _fadeFinalRound
                  ? 'الجولة الأخيرة: اكتب الآية كلها من ذاكرتك'
                  : 'الجولة ${_arabicDigits(_fadeRound)} من ${_arabicDigits(_fadeRounds)}: اكتب الكلمات المخفية',
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
        const SizedBox(height: 10),
        YouthPrimaryButton(
          label: _fadeChecked ? 'اخفي كلمات أكتر' : 'راجع الجولة',
          icon: _fadeChecked
              ? Icons.visibility_off_rounded
              : Icons.fact_check_rounded,
          onTap: _fadeChecked ? _nextFadeRound : _checkFadeRound,
        ),
      ];
    }
    if (_choiceActive) {
      final active = _activeBlank;
      final answered =
          _words.where((w) => w.hidden && w.answer.isNotEmpty).length;
      final blanks = _words.where((w) => w.hidden).length;
      return [
        Text(
          active == null
              ? 'خلصت كل الكلمات (${_arabicDigits(answered)} من ${_arabicDigits(blanks)})'
              : 'اختار الكلمة المناسبة للمكان المظلل '
                  '(${_arabicDigits(answered)} من ${_arabicDigits(blanks)})',
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: muted,
          ),
        ),
        if (active != null) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final option in _words[active].options)
                _optionPill(
                  label: option,
                  selected: _words[active].answer == option,
                  onTap: () => _pickChoice(active, option),
                  text: text,
                  soft: soft,
                  border: border,
                ),
            ],
          ),
        ],
        const SizedBox(height: 12),
        ..._reciteActions(text, soft, border),
      ];
    }
    return _reciteActions(text, soft, border);
  }

  void _pickChoice(int index, String option) {
    setState(() {
      _words[index].answer = option;
      _activeBlank = _nextBlank(index);
    });
    _revealBlank(_activeBlank);
  }

  void _revealBlank(int? index) {
    if (index == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _blankKeys[index]?.currentContext;
      if (target == null || !mounted) return;
      Scrollable.ensureVisible(
        target,
        alignment: 0.35,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  void _followOrderProgress() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_reciteScroll.hasClients) return;
      _reciteScroll.animateTo(
        _reciteScroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      );
    });
  }

  Widget _recitePassage(bool isDark, Color text, Color soft, Color border) {
    return ListView(
      controller: _reciteScroll,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        YouthSoftCard(
          dark: isDark,
          padding: const EdgeInsets.all(14),
          child: Text(
            '${_book!.name} $_chapter:${_selected.join(',')}',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontWeight: FontWeight.w900,
              color: text,
            ),
          ),
        ),
        const SizedBox(height: 12),
        YouthSoftCard(
          dark: isDark,
          child: switch (_difficulty) {
            'full' => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(end: _fullBlurred ? 9 : 0),
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOut,
                      builder: (context, sigma, child) => ImageFiltered(
                        enabled: sigma > 0.01,
                        imageFilter:
                            ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
                        child: child,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Text(
                          _text,
                          style: _wordStyle(text).copyWith(height: 1.9),
                        ),
                      ),
                    ),
                  ),
                  if (_fullBlurred) ...[
                    const SizedBox(height: 14),
                    TextField(
                      autofocus: true,
                      maxLines: 7,
                      textAlign: TextAlign.right,
                      onChanged: (v) => _fullAnswer = v,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        color: text,
                        height: 1.6,
                      ),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: soft,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: border),
                        ),
                        hintText: 'اكتب الآية من ذاكرتك…',
                      ),
                    ),
                  ],
                ],
              ),
            'order' => _orderBody(isDark, text, soft, border),
            'choice' => _choiceBody(isDark, text, soft, border),
            'letters' => _lettersBody(text, soft),
            'fade' => _fadeBody(text, soft, border),
            _ => Wrap(
                spacing: 6,
                runSpacing: 10,
                children: _words
                    .map(
                      (w) => w.hidden
                          ? SizedBox(
                              width: 105,
                              child: TextField(
                                textAlign: TextAlign.center,
                                onChanged: (v) => w.answer = v,
                                decoration: InputDecoration(
                                  isDense: true,
                                  filled: true,
                                  fillColor: soft,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(color: border),
                                  ),
                                  hintText: '…',
                                ),
                              ),
                            )
                          : Text(
                              w.text,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 17,
                                color: text,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    )
                    .toList(),
              ),
          },
        ),
      ],
    );
  }

  List<Widget> _reciteActions(Color text, Color soft, Color border) {
    if (_difficulty == 'order' || _difficulty == 'letters') return const [];
    if (_difficulty == 'full' && !_fullBlurred) {
      return [
        YouthPrimaryButton(
          label: 'اخفي الآية وابدأ الكتابة',
          icon: Icons.blur_on_rounded,
          onTap: () => setState(() => _fullBlurred = true),
        ),
      ];
    }
    return [
      YouthPrimaryButton(
        label: 'راجع إجابتي',
        icon: Icons.fact_check_rounded,
        onTap: _check,
      ),
    ];
  }

  TextStyle _wordStyle(Color color) => TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 17,
        color: color,
        fontWeight: FontWeight.w700,
        height: 1.5,
      );

  Widget _orderBody(bool isDark, Color text, Color soft, Color border) {
    return Container(
      constraints: const BoxConstraints(minHeight: 64),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: soft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: _orderPlaced == 0
          ? Text(
              'الكلمات اللي هترتبها هتظهر هنا',
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: text.withValues(alpha: 0.45),
              ),
            )
          : Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (var i = 0; i < _orderPlaced; i++)
                  Text(_words[i].text, style: _wordStyle(text)),
              ],
            ),
    );
  }

  Widget _choiceBody(bool isDark, Color text, Color soft, Color border) {
    final active = _activeBlank;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 10,
          children: [
            for (var i = 0; i < _words.length; i++)
              if (!_words[i].hidden)
                Text(_words[i].text, style: _wordStyle(text))
              else
                InkWell(
                  key: _blankKeys.putIfAbsent(i, GlobalKey.new),
                  onTap: () => setState(() => _activeBlank = i),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: active == i
                          ? const Color(0xFFFBBF24).withValues(alpha: 0.18)
                          : soft,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: active == i ? const Color(0xFFFBBF24) : border,
                        width: active == i ? 2 : 1,
                      ),
                    ),
                    child: Text(
                      _words[i].answer.isEmpty ? '؟' : _words[i].answer,
                      style: _wordStyle(text),
                    ),
                  ),
                ),
          ],
        ),
      ],
    );
  }

  int? _nextBlank(int from) {
    for (var step = 1; step <= _words.length; step++) {
      final i = (from + step) % _words.length;
      if (_words[i].hidden && _words[i].answer.isEmpty) return i;
    }
    return null;
  }

  static String _firstLetter(String word) {
    final bare = word.replaceAll(
      RegExp(r'[\u064B-\u0652\u0670\u0640،.؟!:؛«»"()]'),
      '',
    );
    return bare.isEmpty ? '' : bare.substring(0, 1);
  }

  Widget _lettersBody(Color text, Color soft) {
    const good = Color(0xFF059669);
    const bad = Color(0xFFDC2626);
    return Wrap(
      spacing: 6,
      runSpacing: 10,
      children: [
        for (var i = 0; i < _words.length; i++)
          if (i < _letterCursor)
            Text(
              _words[i].text,
              style: _wordStyle(
                _normal(_words[i].answer) == _normal(_words[i].text)
                    ? good
                    : bad,
              ),
            )
          else
            Container(
              key: _blankKeys.putIfAbsent(i, GlobalKey.new),
              constraints: BoxConstraints(
                minWidth: (_words[i].text.length * 9.0).clamp(30, 110),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: i == _letterCursor
                    ? (_letterWrong ? bad : const Color(0xFFFBBF24))
                        .withValues(alpha: 0.22)
                    : text.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: i == _letterCursor
                    ? Border.all(
                        color: _letterWrong ? bad : const Color(0xFFFBBF24),
                        width: 2,
                      )
                    : null,
              ),
              child: Text(
                '${_firstLetter(_words[i].text)}ـ…',
                textAlign: TextAlign.right,
                style: _wordStyle(
                  text.withValues(alpha: i == _letterCursor ? 0.9 : 0.5),
                ),
              ),
            ),
      ],
    );
  }

  Widget _fadeBody(Color text, Color soft, Color border) {
    const good = Color(0xFF059669);
    const bad = Color(0xFFDC2626);
    if (_fadeFinalRound && !_fadeChecked) {
      return TextField(
        key: ValueKey('fade-full-$_fadeRound'),
        maxLines: 7,
        textAlign: TextAlign.right,
        onChanged: (v) => _fullAnswer = v,
        style: TextStyle(fontFamily: AppFonts.ui, color: text, height: 1.6),
        decoration: InputDecoration(
          filled: true,
          fillColor: soft,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: border),
          ),
          hintText: 'اكتب الآية كلها من ذاكرتك…',
        ),
      );
    }
    return Wrap(
      spacing: 6,
      runSpacing: 10,
      children: [
        for (var i = 0; i < _words.length; i++)
          if (!_words[i].hidden)
            Text(_words[i].text, style: _wordStyle(text))
          else if (_fadeChecked)
            Text(
              _words[i].correct == true
                  ? _words[i].text
                  : '${_words[i].answer.isEmpty ? '—' : _words[i].answer} ← ${_words[i].text}',
              style: _wordStyle(_words[i].correct == true ? good : bad),
            )
          else
            SizedBox(
              key: ValueKey('fade-$_fadeRound-$i'),
              width: (_words[i].text.length * 11.0).clamp(70, 130),
              child: TextField(
                textAlign: TextAlign.center,
                onChanged: (v) => _words[i].answer = v,
                decoration: InputDecoration(
                  isDense: true,
                  filled: true,
                  fillColor: soft,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: border),
                  ),
                  hintText: '…',
                ),
              ),
            ),
      ],
    );
  }

  Widget _optionPill({
    required String label,
    required bool selected,
    required VoidCallback onTap,
    required Color text,
    required Color soft,
    required Color border,
    IconData? icon,
    bool wrong = false,
  }) {
    final borderColor = wrong
        ? const Color(0xFFDC2626)
        : selected
            ? const Color(0xFFFBBF24)
            : border;
    return Material(
      color: selected
          ? const Color(0xFF0F172A)
          : wrong
              ? const Color(0xFFFEE2E2)
              : soft,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: borderColor,
              width: selected || wrong ? 2 : 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 16,
                  color: selected ? Colors.white : text,
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w800,
                  color: selected
                      ? Colors.white
                      : wrong
                          ? const Color(0xFFB91C1C)
                          : text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultView(bool isDark) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        YouthHeroBanner(
          badge: 'نتيجة التسميع',
          title: _score == _total ? 'ممتاز جدًا!' : 'أحسنت المحاولة',
          body: switch (_difficulty) {
            'order' =>
              'رتّبت ${_arabicDigits(_total)} كلمة بـ ${_arabicDigits(_orderMistakes)} غلطة',
            _ => 'النتيجة: $_score من $_total كلمة صحيحة',
          },
          icon: Icons.emoji_events_rounded,
        ),
        const SizedBox(height: 16),
        YouthSoftCard(
          dark: isDark,
          child: !_words.any((w) => w.hidden)
              ? Text(
                  _text,
                  style: _wordStyle(
                    isDark ? AppColors.darkText : const Color(0xFF0F172A),
                  ).copyWith(height: 1.9),
                )
              : Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _words
                      .where((w) => w.hidden)
                      .map(
                        (w) => Chip(
                          backgroundColor: w.correct == true
                              ? const Color(0xFFD1FAE5)
                              : const Color(0xFFFEE2E2),
                          label: Text(
                            w.correct == true
                                ? w.text
                                : '${w.answer.isEmpty ? '—' : w.answer} ← ${w.text}',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
        ),
        const SizedBox(height: 16),
        YouthPrimaryButton(
          label: 'حاول مرة أخرى',
          icon: Icons.refresh_rounded,
          onTap: _start,
        ),
        TextButton(
          onPressed: () => setState(() => _result = false),
          child: const Text(
            'اختر مقطعًا آخر',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _editGoal() async {
    var period = _goal.period;
    var target = _goal.target == 0 ? 5 : _goal.target;
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheet) => AlertDialog(
          title: const Text('حدد هدف الحفظ', textDirection: TextDirection.rtl),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'week', label: Text('أسبوعي')),
                  ButtonSegment(value: 'month', label: Text('شهري')),
                ],
                selected: {period},
                onSelectionChanged: (value) =>
                    setSheet(() => period = value.first),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: () => setSheet(
                        () => target = (target - 1).clamp(1, 100).toInt()),
                    icon: const Icon(Icons.remove),
                  ),
                  Text('$target آيات'),
                  IconButton(
                    onPressed: () => setSheet(
                        () => target = (target + 1).clamp(1, 100).toInt()),
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('إلغاء')),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('حفظ الهدف'),
            ),
          ],
        ),
      ),
    );
    if (saved != true) return;
    final goal = MemorizationGoal(period: period, target: target);
    await _service.saveGoal(goal);
    if (mounted) setState(() => _goal = goal);
  }

  Widget _statsView(bool isDark) {
    final stats = memorizationStats(_history, _goal);
    final periodLabel =
        _goal.period == 'month' ? 'تقدمك الشهري' : 'تقدمك الأسبوعي';
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final progress = _goal.target <= 0
        ? 0.0
        : (stats.periodCount / _goal.target).clamp(0.0, 1.0);
    final heroBody = _goal.target > 0
        ? 'حفظت صح ${_arabicDigits(stats.periodCount)} من هدفك (${_arabicDigits(_goal.target)} آيات)'
        : stats.totalVerses > 0
            ? 'معاك ${_arabicDigits(stats.totalVerses)} آية صحيحة · ${_arabicDigits(stats.totalAttempts)} محاولة'
            : 'ابدأ محاولة حفظ وهنا هتتابع تقدمك وهدفك.';

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        _StatsHero(
          periodLabel: periodLabel,
          body: heroBody,
          progress: progress,
          current: stats.periodCount,
          target: _goal.target,
          onEditGoal: _editGoal,
          arabicDigits: _arabicDigits,
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                isDark: isDark,
                soft: soft,
                icon: Icons.auto_stories_rounded,
                tint: const Color(0xFFD97706),
                tintBg: const Color(0xFFFFF7ED),
                value: _arabicDigits(stats.periodCount),
                label: 'الفترة الحالية',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MetricCard(
                isDark: isDark,
                soft: soft,
                icon: Icons.menu_book_rounded,
                tint: const Color(0xFF0284C7),
                tintBg: const Color(0xFFF0F9FF),
                value: _arabicDigits(stats.totalVerses),
                label: 'آيات صحيحة',
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                isDark: isDark,
                soft: soft,
                icon: Icons.percent_rounded,
                tint: const Color(0xFF059669),
                tintBg: const Color(0xFFECFDF5),
                value: '${_arabicDigits(stats.averageScore)}%',
                label: 'متوسط النتيجة',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MetricCard(
                isDark: isDark,
                soft: soft,
                icon: Icons.replay_circle_filled_rounded,
                tint: const Color(0xFF0F172A),
                tintBg: soft,
                value: _arabicDigits(stats.totalAttempts),
                label: 'عدد المحاولات',
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        YouthSoftCard(
          dark: isDark,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'لمحة سريعة',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  color: text,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _InsightChip(
                      isDark: isDark,
                      icon: Icons.local_fire_department_rounded,
                      value: _arabicDigits(stats.streak),
                      label: 'أيام متتالية',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _InsightChip(
                      isDark: isDark,
                      icon: Icons.timer_outlined,
                      value: formatMemorizationDuration(stats.averageTime),
                      label: 'متوسط الوقت',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _InsightChip(
                      isDark: isDark,
                      icon: Icons.verified_rounded,
                      value: _arabicDigits(stats.perfectAttempts),
                      label: 'محاولات كاملة',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _InsightChip(
                      isDark: isDark,
                      icon: Icons.star_rounded,
                      value: '${_arabicDigits(stats.bestScore)}%',
                      label: 'أفضل نتيجة',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (stats.difficultyBreakdown.isNotEmpty) ...[
          const SizedBox(height: 14),
          YouthSoftCard(
            dark: isDark,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'حسب مستوى الحفظ',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                    color: text,
                  ),
                ),
                const SizedBox(height: 12),
                for (final item in stats.difficultyBreakdown)
                  _DifficultyRow(
                    isDark: isDark,
                    soft: soft,
                    label: _difficultyLabel(item.difficulty),
                    attempts: item.attempts,
                    averageScore: item.averageScore,
                    maxAttempts: stats.difficultyBreakdown
                        .map((entry) => entry.attempts)
                        .fold<int>(1, (a, b) => a > b ? a : b),
                    arabicDigits: _arabicDigits,
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: Text(
                'سجل النتائج',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  color: text,
                ),
              ),
            ),
            Text(
              '${_arabicDigits(_history.length)} محاولة',
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontWeight: FontWeight.w700,
                fontSize: 12,
                color: muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_history.isEmpty)
          YouthSoftCard(
            dark: isDark,
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: soft,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(
                    Icons.insights_outlined,
                    color: muted,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'لم تبدأ أي محاولة بعد',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    color: text,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'أول تسميع هيبان هنا مع نتيجتك وتقدمك.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    color: muted,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          )
        else
          for (final a in _history) ...[
            _HistoryCard(
              isDark: isDark,
              soft: soft,
              attempt: a,
              title: '${a.bookName} ${a.chapter}:${a.verses.join(',')}',
              subtitle:
                  '${_formatAttemptDate(a.createdAt)} · ${formatMemorizationDuration(a.timeSeconds)} · ${_difficultyLabel(a.difficulty)}',
              percentLabel: _arabicDigits(
                a.total > 0 ? ((a.score / a.total) * 100).round() : 0,
              ),
              onDelete: () async {
                await _service.delete(a.id);
                if (mounted) setState(() => _history.remove(a));
              },
            ),
            const SizedBox(height: 8),
          ],
      ],
    );
  }

  String _difficultyLabel(String key) =>
      switch (normalizeMemorizationDifficulty(key)) {
        'easy' => 'سهل',
        'hard' => 'صعب',
        'full' => 'الآية كاملة',
        'order' => 'ترتيب الكلمات',
        'choice' => 'اختار الكلمة',
        'letters' => 'أول حرف',
        'fade' => 'اختفاء تدريجي',
        _ => 'متوسط',
      };

  String _arabicDigits(int value) => '$value'.replaceAllMapped(
        RegExp(r'\d'),
        (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match[0]!)],
      );

  String _formatAttemptDate(DateTime value) {
    final local = value.toLocal();
    return '${_arabicDigits(local.day)}/${_arabicDigits(local.month)}/${_arabicDigits(local.year)}';
  }
}

class _StatsHero extends StatelessWidget {
  const _StatsHero({
    required this.periodLabel,
    required this.body,
    required this.progress,
    required this.current,
    required this.target,
    required this.onEditGoal,
    required this.arabicDigits,
  });

  final String periodLabel;
  final String body;
  final double progress;
  final int current;
  final int target;
  final VoidCallback onEditGoal;
  final String Function(int) arabicDigits;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E293B),
            Color(0xFF0C4A6E),
          ],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.16),
            blurRadius: 24,
            offset: const Offset(0, 10),
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
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.insights_rounded,
                        size: 13, color: Color(0xFFFBBF24)),
                    SizedBox(width: 6),
                    Text(
                      'إحصائيات الحفظ',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFFBBF24),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Material(
                color: Colors.white.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: onEditGoal,
                  borderRadius: BorderRadius.circular(12),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.flag_rounded,
                            size: 14, color: Color(0xFFFBBF24)),
                        SizedBox(width: 6),
                        Text(
                          'تحديد الهدف',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            color: Color(0xFFFBBF24),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      periodLabel,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      body,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFCBD5E1),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              SizedBox(
                width: 86,
                height: 86,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 86,
                      height: 86,
                      child: CircularProgressIndicator(
                        value: target > 0 ? progress : 0,
                        strokeWidth: 8,
                        backgroundColor: Colors.white.withValues(alpha: 0.12),
                        color: const Color(0xFFFBBF24),
                        strokeCap: StrokeCap.round,
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          target > 0
                              ? '${arabicDigits((progress * 100).round())}%'
                              : arabicDigits(current),
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          target > 0 ? 'من الهدف' : 'آيات',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontWeight: FontWeight.w600,
                            fontSize: 10,
                            color: Colors.white.withValues(alpha: 0.7),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.isDark,
    required this.soft,
    required this.icon,
    required this.tint,
    required this.tintBg,
    required this.value,
    required this.label,
  });

  final bool isDark;
  final Color soft;
  final IconData icon;
  final Color tint;
  final Color tintBg;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    return YouthSoftCard(
      dark: isDark,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: isDark ? soft : tintBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 18, color: tint),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontWeight: FontWeight.w900,
              fontSize: 22,
              color: text,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _InsightChip extends StatelessWidget {
  const _InsightChip({
    required this.isDark,
    required this.icon,
    required this.value,
    required this.label,
  });

  final bool isDark;
  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: soft,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFFD97706)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                    color: text,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                    color: muted,
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

class _DifficultyRow extends StatelessWidget {
  const _DifficultyRow({
    required this.isDark,
    required this.soft,
    required this.label,
    required this.attempts,
    required this.averageScore,
    required this.maxAttempts,
    required this.arabicDigits,
  });

  final bool isDark;
  final Color soft;
  final String label;
  final int attempts;
  final int averageScore;
  final int maxAttempts;
  final String Function(int) arabicDigits;

  @override
  Widget build(BuildContext context) {
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final ratio = maxAttempts <= 0 ? 0.0 : attempts / maxAttempts;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: text,
                  ),
                ),
              ),
              Text(
                '${arabicDigits(attempts)} · ${arabicDigits(averageScore)}%',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  color: muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: ratio.clamp(0.0, 1.0),
              minHeight: 7,
              backgroundColor: soft,
              color: const Color(0xFF0284C7),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({
    required this.isDark,
    required this.soft,
    required this.attempt,
    required this.title,
    required this.subtitle,
    required this.percentLabel,
    required this.onDelete,
  });

  final bool isDark;
  final Color soft;
  final MemorizationAttempt attempt;
  final String title;
  final String subtitle;
  final String percentLabel;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final perfect = attempt.total > 0 && attempt.score == attempt.total;
    final percent =
        attempt.total > 0 ? ((attempt.score / attempt.total) * 100).round() : 0;
    return YouthSoftCard(
      dark: isDark,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: perfect
                    ? const [Color(0xFF059669), Color(0xFF34D399)]
                    : const [Color(0xFF0284C7), Color(0xFF38BDF8)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              perfect ? Icons.check_rounded : Icons.menu_book_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w900,
                    color: text,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    color: muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: (percent / 100).clamp(0.0, 1.0),
                    minHeight: 5,
                    backgroundColor: soft,
                    color: perfect
                        ? const Color(0xFF059669)
                        : const Color(0xFF0284C7),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${attempt.score}/${attempt.total}',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w900,
                  color: text,
                  fontSize: 14,
                ),
              ),
              Text(
                '$percentLabel%',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w700,
                  color: perfect ? const Color(0xFF059669) : muted,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          IconButton(
            tooltip: 'حذف النتيجة',
            icon: Icon(Icons.delete_outline_rounded, color: muted),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

class _MemorizationBookArrow extends StatelessWidget {
  const _MemorizationBookArrow({
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
      width: 24,
      height: 24,
      child: IconButton(
        onPressed: enabled ? onTap : null,
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
}

class _Verse {
  const _Verse(this.number, this.text);
  final int number;
  final String text;
}

class _Book {
  const _Book(this.id, this.name, this.chapters);
  final String id, name;
  final List<List<_Verse>> chapters;
}

class _Word {
  _Word(this.text, this.hidden);
  final String text;
  final bool hidden;
  String answer = '';
  bool? correct;
  List<String> options = const [];
}
