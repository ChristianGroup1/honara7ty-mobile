import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../features/reading/active_reading_plan_service.dart';
import '../../features/reading/reading_log_service.dart';
import '../../widgets/app_header.dart';

class ReadingPlanSuggestionsScreen extends StatefulWidget {
  const ReadingPlanSuggestionsScreen({super.key});
  @override
  State<ReadingPlanSuggestionsScreen> createState() =>
      _ReadingPlanSuggestionsScreenState();
}

class _ReadingPlanSuggestionsScreenState
    extends State<ReadingPlanSuggestionsScreen> {
  final _service = ActiveReadingPlanService();
  List<_Book> _books = [];
  _Book? _book;
  int _start = 1, _pace = 2, _days = 30;
  ActiveReadingPlan? _plan;
  bool _saving = false;
  String get _today => DateTime.now().toIso8601String().substring(0, 10);
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data =
        jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
            as Map<String, dynamic>;
    final books = (data['books'] as List).asMap().entries.map((e) {
      final x = e.value as Map<String, dynamic>;
      return _Book(
          '${e.key + 1}', x['name'] as String, (x['chapters'] as List).length);
    }).toList();
    final plan = await _service.load();
    if (mounted)
      setState(() {
        _books = books;
        _book = books.firstWhere((b) => b.id == plan?.bookId,
            orElse: () => books.first);
        _plan = plan;
      });
  }

  Future<void> _save() async {
    final plan = ActiveReadingPlan(
        bookId: _book!.id,
        bookName: _book!.name,
        startChapter: _start,
        chaptersPerDay: _pace,
        days: _days.clamp(1, ((_book!.chapters - _start + 1) / _pace).ceil()),
        completedDays: 0);
    await _service.save(plan);
    if (mounted) setState(() => _plan = plan);
  }

  Future<void> _complete() async {
    if (_saving || _plan == null || _plan!.lastCompletedDate == _today) return;
    final chapters = _plan!.chaptersForDay(_book!.chapters);
    if (chapters.isEmpty) return;
    setState(() => _saving = true);
    try {
      for (final chapter in chapters) {
        await ReadingLogService()
            .toggle(bookId: _plan!.bookId, chapter: chapter, completed: true);
      }
      final next = _plan!.copyWith(
          completedDays: (_plan!.completedDays + 1).clamp(0, _plan!.days),
          lastCompletedDate: _today);
      await _service.save(next);
      if (mounted) setState(() => _plan = next);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_book == null)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
            body: SafeArea(
                child: Column(children: [
          AppHeader(
              title: 'خطط القراءة', onBack: () => Navigator.maybePop(context)),
          Expanded(child: _plan == null ? _setup() : _active())
        ]))));
  }

  Widget _setup() => ListView(padding: const EdgeInsets.all(16), children: [
        const Text('أنشئ خطة تناسب وقتك',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text(
            'لن تتجاوز الخطة يومًا إذا تأخرت؛ تقدّمها يعتمد على إكمالك الفعلي.'),
        const SizedBox(height: 18),
        DropdownButtonFormField<_Book>(
            value: _book,
            items: _books
                .map((b) => DropdownMenuItem(value: b, child: Text(b.name)))
                .toList(),
            onChanged: (b) => setState(() {
                  _book = b;
                  _start = 1;
                }),
            decoration: const InputDecoration(labelText: 'ابدأ من سفر')),
        DropdownButtonFormField<int>(
            value: _start,
            items: List.generate(
                _book!.chapters,
                (i) => DropdownMenuItem(
                    value: i + 1, child: Text('الإصحاح ${i + 1}'))),
            onChanged: (v) => setState(() => _start = v!),
            decoration: const InputDecoration(labelText: 'الإصحاح الأول')),
        const SizedBox(height: 12),
        Text('إصحاحات يوميًا: $_pace'),
        Slider(
            value: _pace.toDouble(),
            min: 1,
            max: 6,
            divisions: 5,
            label: '$_pace',
            onChanged: (v) => setState(() => _pace = v.round())),
        Text('مدة الخطة: $_days يومًا'),
        Slider(
            value: _days.toDouble(),
            min: 7,
            max: 90,
            divisions: 83,
            label: '$_days',
            onChanged: (v) => setState(() => _days = v.round())),
        const SizedBox(height: 16),
        FilledButton(
            onPressed: _save,
            style:
                FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            child: const Text('ابدأ الخطة'))
      ]);
  Widget _active() {
    final p = _plan!;
    final chapters = p.chaptersForDay(_book!.chapters);
    final done = p.completedDays >= p.days || chapters.isEmpty;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(p.bookName,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      Text(
          'اليوم ${(p.completedDays + 1).clamp(1, p.days)} من ${p.days} • ${p.chaptersPerDay} إصحاحات يوميًا'),
      const SizedBox(height: 20),
      Card(
          child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('قراءة اليوم',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 8),
                    Text(done
                        ? 'أكملت الخطة. أحسنت!'
                        : chapters.isEmpty
                            ? 'انتهى السفر المحدد. ابدأ خطة جديدة.'
                            : '${p.bookName}: الإصحاحات ${chapters.join('، ')}'),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                        onPressed:
                            done || _saving || p.lastCompletedDate == _today
                                ? null
                                : _complete,
                        icon: const Icon(Icons.check),
                        label: const Text('تمت قراءة اليوم')),
                  ]))),
      const SizedBox(height: 16),
      LinearProgressIndicator(value: p.completedDays / p.days),
      const SizedBox(height: 8),
      Text('${p.completedDays}/${p.days} أيام مكتملة'),
      TextButton(
          onPressed: () async {
            await _service.save(null);
            if (mounted) setState(() => _plan = null);
          },
          child: const Text('إنهاء الخطة')),
    ]);
  }
}

class _Book {
  const _Book(this.id, this.name, this.chapters);
  final String id, name;
  final int chapters;
}
