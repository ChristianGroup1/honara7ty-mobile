import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/journal/reflections_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';
import '../../widgets/voice_memo_field.dart';
import '../../widgets/screen_hero.dart';

class SpiritualReflectionScreen extends StatefulWidget {
  const SpiritualReflectionScreen({super.key, this.initialText});

  final String? initialText;
  @override
  State<SpiritualReflectionScreen> createState() =>
      _SpiritualReflectionScreenState();
}

class _SpiritualReflectionScreenState extends State<SpiritualReflectionScreen> {
  final _service = ReflectionsService();
  final _search = TextEditingController();
  List<ReflectionEntry> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
    final initial = widget.initialText;
    if (initial != null && initial.trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _edit(initialText: initial));
    }
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  String _date(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
  Future<void> _refresh() async {
    if (mounted) setState(() => _loading = true);
    final values = await _service.load();
    if (mounted)
      setState(() {
        _items = values;
        _loading = false;
      });
  }

  List<ReflectionEntry> get _visible {
    final q = _search.text.trim().toLowerCase();
    return q.isEmpty
        ? _items
        : _items
            .where((item) => item.content.toLowerCase().contains(q))
            .toList();
  }

  Future<void> _edit({ReflectionEntry? entry, String? initialText}) async {
    final text = TextEditingController(text: entry?.content ?? initialText ?? '');
    DateTime date = entry == null ? DateTime.now() : DateTime.parse(entry.date);
    var audioPath = entry?.audioPath;
    var audioMs = entry?.audioDurationMs;
    final saved = await showModalBottomSheet<ReflectionEntry>(
        context: context,
        isScrollControlled: true,
        builder: (context) => StatefulBuilder(
            builder: (context, setModalState) => Padding(
                padding: EdgeInsets.only(
                    bottom: MediaQuery.viewInsetsOf(context).bottom),
                child: SafeArea(
                    child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(entry == null ? 'تأمل جديد' : 'تعديل التأمل',
                                  style:
                                      Theme.of(context).textTheme.titleLarge),
                              const SizedBox(height: 12),
                              TextField(
                                  controller: text,
                                  autofocus: true,
                                  minLines: 5,
                                  maxLines: 8,
                                  textAlign: TextAlign.right,
                                  decoration: const InputDecoration(
                                      border: OutlineInputBorder(),
                                      hintText: 'اكتب هنا...')),
                              const SizedBox(height: 8),
                              const Text('ماذا كلّمك الله اليوم؟'),
                              const SizedBox(height: 8),
                              VoiceMemoField(
                                path: audioPath,
                                durationMs: audioMs,
                                onChanged: (path, ms) => setModalState(() {
                                  audioPath = path;
                                  audioMs = ms;
                                }),
                              ),
                              TextButton.icon(
                                  onPressed: () async {
                                    final picked = await showDatePicker(
                                        context: context,
                                        firstDate: DateTime(2020),
                                        lastDate: DateTime.now(),
                                        initialDate: date);
                                    if (picked != null)
                                      setModalState(() => date = picked);
                                  },
                                  icon:
                                      const Icon(Icons.calendar_today_outlined),
                                  label: Text(_date(date))),
                              FilledButton(
                                  onPressed: () {
                                    final content = text.text.trim();
                                    if (content.isEmpty && audioPath == null) return;
                                    Navigator.pop(
                                        context,
                                        ReflectionEntry(
                                            id: entry?.id ??
                                                '${DateTime.now().microsecondsSinceEpoch}',
                                            remoteId: entry?.remoteId,
                                            content: content,
                                            date: _date(date),
                                            createdAt: entry?.createdAt ??
                                                DateTime.now(),
                                            audioPath: audioPath,
                                            audioDurationMs: audioMs));
                                  },
                                  child: Text(entry == null
                                      ? 'حفظ التأمل'
                                      : 'حفظ التعديل'))
                            ]))))));
    text.dispose();
    if (saved == null) return;
    final stored = await _service.save(saved);
    if (mounted)
      setState(() {
        _items.removeWhere((item) => item.id == stored.id);
        _items.insert(0, stored);
      });
  }

  Future<void> _delete(ReflectionEntry entry) async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('حذف التأمل'),
                content: const Text('هل تريد حذف هذا التأمل؟'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('إلغاء')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('حذف'))
                ]));
    if (ok != true) return;
    try {
      await _service.delete(entry);
    } catch (_) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('تعذر الحذف. تحقق من الاتصال وحاول مجددًا.')));
      return;
    }
    if (mounted)
      setState(() => _items.removeWhere((item) => item.id == entry.id));
  }

  @override
  Widget build(BuildContext context) {
    final dark = context.watch<ThemeProvider>().isNightMode;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor:
            dark ? AppColors.darkBackground : AppColors.lightBackground,
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _edit,
          icon: const Icon(Icons.edit_outlined),
          label: const Text('تأمل جديد'),
        ),
        body: SafeArea(
          top: false,
          child: Column(children: [
            AppHeader(
                eyebrow: 'مساحة هادية',
                title: 'التأمل الروحي',
                onBack: () => Navigator.maybePop(context)),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: ScreenHero(
                icon: Icons.edit_note_outlined,
                badge: 'يومياتك مع ربنا',
                eyebrow: 'مساحة هادية',
                title: 'اكتب اللي لمسه ربنا في قلبك',
                body: 'سجّل لمسات ربنا، آية أثرت فيك، أو فكرة صغيرة عايز ترجع لها بعدين.',
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'ابحث في التأملات...',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14))),
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _refresh,
                      child: _visible.isEmpty
                          ? ListView(children: const [
                              SizedBox(height: 120),
                              Center(
                                  child: Text(
                                      'لا يوجد تأملات بعد\nاضغط + لإنشاء تامل.',
                                      textAlign: TextAlign.center))
                            ])
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                              itemCount: _visible.length,
                              itemBuilder: (context, index) {
                                final item = _visible[index];
                                return Card(
                                    child: ListTile(
                                  isThreeLine: true,
                                  onTap: () => _edit(entry: item),
                                  title: Text(
                                      item.content.trim().isEmpty && item.audioPath != null
                                          ? 'تسجيل صوتي'
                                          : item.content,
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis),
                                  subtitle: Text('${item.date}${item.audioPath != null ? ' • تسجيل صوتي' : ''}'),
                                  leading:
                                      const Icon(Icons.auto_awesome_outlined),
                                  trailing: IconButton(
                                      icon: const Icon(Icons.delete_outline),
                                      onPressed: () => _delete(item)),
                                ));
                              },
                            ),
                    ),
            ),
          ]),
        ),
      ),
    );
  }
}
