// ─── BibleMemorizationScreen ─────────────────────────────────────────────────────────────

import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../features/memorization/memorization_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class BibleMemorizationScreen extends StatefulWidget {
  const BibleMemorizationScreen({super.key});
  @override
  State<BibleMemorizationScreen> createState() =>
      _BibleMemorizationScreenState();
}

class _BibleMemorizationScreenState extends State<BibleMemorizationScreen> {
  final _service = MemorizationService();
  final _random = Random();
  List<_Book> _books = [];
  List<MemorizationAttempt> _history = [];
  _Book? _book;
  int _chapter = 1;
  Set<int> _selected = {1};
  String _difficulty = 'medium';
  bool _stats = false, _reciting = false, _result = false;
  List<_Word> _words = [];
  String _fullAnswer = '';
  DateTime? _started;
  int _score = 0, _total = 0;

  @override
  void initState() {
    super.initState();
    _load();
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
              .toList());
    }).toList();
    if (!mounted) return;
    setState(() {
      _books = books;
      _book = books.first;
      _selected = {books.first.chapters.first.first.number};
    });
    _history = await _service.load();
    if (mounted) setState(() {});
  }

  List<_Verse> get _verses => _book!.chapters[_chapter - 1];
  String get _text => _verses
      .where((v) => _selected.contains(v.number))
      .map((v) => v.text.replaceFirst(RegExp(r'^[٠-٩0-9]+\\s*'), '').trim())
      .join(' ');
  String _normal(String s) => s
      .replaceAll(RegExp(r'[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]'), '')
      .replaceAll(RegExp(r'[أإآٱ]'), 'ا')
      .replaceAll('ى', 'ي')
      .replaceAll('ة', 'ه')
      .replaceAll(RegExp(r'[،.؟!:؛]'), '')
      .trim();
  void _start() {
    final words =
        _text.split(RegExp(r'\\s+')).where((w) => w.isNotEmpty).toList();
    final candidates = [
      for (var i = 0; i < words.length; i++)
        if (words[i].replaceAll(RegExp(r'[،.؟!:؛]'), '').length >= 3) i
    ]..shuffle(_random);
    final ratio = _difficulty == 'easy'
        ? .2
        : _difficulty == 'hard'
            ? .5
            : _difficulty == 'full'
                ? 1.0
                : .35;
    final hidden =
        candidates.take(max(1, (candidates.length * ratio).round())).toSet();
    setState(() {
      _words = [
        for (var i = 0; i < words.length; i++)
          _Word(words[i], _difficulty == 'full' || hidden.contains(i))
      ];
      _fullAnswer = '';
      _started = DateTime.now();
      _reciting = true;
      _result = false;
      _stats = false;
    });
  }

  Future<void> _check() async {
    final answers =
        _difficulty == 'full' ? _fullAnswer.split(RegExp(r'\\s+')) : <String>[];
    var cursor = 0;
    var score = 0;
    var total = 0;
    for (final word in _words) {
      if (!word.hidden) continue;
      total++;
      final answer = _difficulty == 'full'
          ? (cursor < answers.length ? answers[cursor++] : '')
          : word.answer;
      word.correct = _normal(answer) == _normal(word.text);
      if (word.correct!) score++;
    }
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
        createdAt: DateTime.now());
    await _service.save(attempt);
    if (!mounted) return;
    setState(() {
      _score = score;
      _total = total;
      _history.insert(0, attempt);
      _result = true;
      _reciting = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    return Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
            backgroundColor:
                isDark ? AppColors.darkBackground : AppColors.lightBackground,
            body: SafeArea(
                child: Column(children: [
              AppHeader(
                  title: _stats ? 'إحصائياتي' : 'حفظ الآيات',
                  onBack: () {
                    if (_stats || _reciting || _result) {
                      setState(() {
                        _stats = _reciting = _result = false;
                      });
                    } else {
                      Navigator.maybePop(context);
                    }
                  }),
              Expanded(
                  child: _books.isEmpty
                      ? const Center(child: CircularProgressIndicator())
                      : _stats
                          ? _statsView()
                          : _result
                              ? _resultView()
                              : _reciting
                                  ? _reciteView()
                                  : _picker())
            ]))));
  }

  Widget _card(Widget child) =>
      Card(child: Padding(padding: const EdgeInsets.all(16), child: child));
  Widget _hero(String title, String text) => Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          gradient:
              const LinearGradient(colors: [AppColors.navy, AppColors.accent]),
          borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 22)),
        const SizedBox(height: 6),
        Text(text, style: const TextStyle(color: Colors.white))
      ]));
  Widget _picker() => ListView(padding: const EdgeInsets.all(16), children: [
        _hero('اختبر حفظك', 'اختر آية واكتب الكلمات الناقصة من ذاكرتك.'),
        const SizedBox(height: 16),
        _card(Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('المقطع',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          OutlinedButton.icon(
              onPressed: _chooseBook,
              icon: const Icon(Icons.menu_book_outlined),
              label: Text(_book!.name)),
          DropdownButtonFormField<int>(
              value: _chapter,
              decoration: const InputDecoration(labelText: 'الإصحاح'),
              items: List.generate(
                  _book!.chapters.length,
                  (i) => DropdownMenuItem(
                      value: i + 1, child: Text('الإصحاح ${i + 1}'))),
              onChanged: (value) => setState(() {
                    _chapter = value!;
                    _selected = {_verses.first.number};
                  })),
          const SizedBox(height: 12),
          const Text('الآيات'),
          Wrap(
              spacing: 6,
              children: _verses
                  .map((v) => FilterChip(
                      label: Text('${v.number}'),
                      selected: _selected.contains(v.number),
                      onSelected: (on) => setState(() {
                            if (on)
                              _selected.add(v.number);
                            else if (_selected.length > 1)
                              _selected.remove(v.number);
                          })))
                  .toList())
        ])),
        const SizedBox(height: 16),
        _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('مستوى التحدي',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          Wrap(
              spacing: 6,
              children: {
                'easy': 'سهل',
                'medium': 'متوسط',
                'hard': 'صعب',
                'full': 'اكتب كاملة'
              }
                  .entries
                  .map((e) => ChoiceChip(
                      label: Text(e.value),
                      selected: _difficulty == e.key,
                      onSelected: (_) => setState(() => _difficulty = e.key)))
                  .toList())
        ])),
        const SizedBox(height: 20),
        FilledButton.icon(
            onPressed: _start,
            icon: const Icon(Icons.psychology_outlined),
            label: const Text('ابدأ الحفظ'),
            style:
                FilledButton.styleFrom(minimumSize: const Size.fromHeight(52))),
        TextButton.icon(
            onPressed: () => setState(() => _stats = true),
            icon: const Icon(Icons.insights_outlined),
            label: const Text('إحصائياتي'))
      ]);
  Widget _reciteView() =>
      ListView(padding: const EdgeInsets.all(16), children: [
        _card(Text('${_book!.name} $_chapter:${_selected.join(',')}',
            style: const TextStyle(fontWeight: FontWeight.bold))),
        const SizedBox(height: 12),
        _card(_difficulty == 'full'
            ? TextField(
                maxLines: 7,
                textAlign: TextAlign.right,
                onChanged: (v) => _fullAnswer = v,
                decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'اكتب الآية من ذاكرتك…'))
            : Wrap(
                spacing: 6,
                runSpacing: 10,
                children: _words
                    .map((w) => w.hidden
                        ? SizedBox(
                            width: 105,
                            child: TextField(
                                textAlign: TextAlign.center,
                                onChanged: (v) => w.answer = v,
                                decoration: const InputDecoration(
                                    isDense: true,
                                    border: OutlineInputBorder(),
                                    hintText: '…')))
                        : Text(w.text, style: const TextStyle(fontSize: 17)))
                    .toList())),
        const SizedBox(height: 20),
        FilledButton(
            onPressed: _check,
            style:
                FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            child: const Text('راجع إجابتي'))
      ]);
  Widget _resultView() =>
      ListView(padding: const EdgeInsets.all(16), children: [
        _hero(_score == _total ? 'ممتاز جدًا!' : 'أحسنت المحاولة',
            'النتيجة: $_score من $_total كلمة صحيحة'),
        const SizedBox(height: 16),
        _card(Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _words
                .where((w) => w.hidden)
                .map((w) => Chip(
                    backgroundColor: w.correct == true
                        ? Colors.green.shade100
                        : Colors.red.shade100,
                    label: Text(w.correct == true
                        ? w.text
                        : '${w.answer.isEmpty ? '—' : w.answer} ← ${w.text}')))
                .toList())),
        const SizedBox(height: 20),
        FilledButton(onPressed: _start, child: const Text('حاول مرة أخرى')),
        TextButton(
            onPressed: () => setState(() => _result = false),
            child: const Text('اختر مقطعًا آخر'))
      ]);
  Widget _statsView() => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _hero(
              '${_history.where((x) => x.score == x.total && x.total > 0).fold(0, (sum, x) => sum + x.verses.length)} آيات بإتقان',
              '${_history.length} محاولة مسجلة على هذا الجهاز'),
          const SizedBox(height: 12),
          if (_history.isEmpty)
            const Padding(
                padding: EdgeInsets.all(30),
                child: Center(child: Text('لم تبدأ أي محاولة بعد.'))),
          ..._history.map((a) => Card(
                  child: ListTile(
                title: Text('${a.bookName} ${a.chapter}:${a.verses.join(',')}'),
                subtitle: Text(
                    '${a.createdAt.toLocal().toString().substring(0, 10)} • ${a.timeSeconds} ثانية'),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('${a.score}/${a.total}'),
                  IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () async {
                        await _service.delete(a.id);
                        if (mounted) setState(() => _history.remove(a));
                      }),
                ]),
              ))),
        ],
      );
  Future<void> _chooseBook() async {
    final book = await showModalBottomSheet<_Book>(
        context: context,
        isScrollControlled: true,
        builder: (context) => SafeArea(
            child: SizedBox(
                height: MediaQuery.sizeOf(context).height * .72,
                child: ListView(
                    children: _books
                        .map((b) => ListTile(
                            title: Text(b.name),
                            onTap: () => Navigator.pop(context, b)))
                        .toList()))));
    if (book != null)
      setState(() {
        _book = book;
        _chapter = 1;
        _selected = {book.chapters.first.first.number};
      });
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
}
