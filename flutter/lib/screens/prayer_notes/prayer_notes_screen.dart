import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/journal/prayer_notes_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';
import '../../widgets/screen_hero.dart';
import '../../widgets/voice_memo_field.dart';

class PrayerNotesScreen extends StatefulWidget {
  const PrayerNotesScreen({super.key});

  @override
  State<PrayerNotesScreen> createState() => _PrayerNotesScreenState();
}

class _PrayerNotesScreenState extends State<PrayerNotesScreen> {
  final _service = PrayerNotesService();
  final _search = TextEditingController();
  List<PrayerNote> _notes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (mounted) setState(() => _loading = true);
    final notes = await _service.load();
    if (mounted)
      setState(() {
        _notes = notes;
        _loading = false;
      });
  }

  List<PrayerNote> get _visible {
    final query = _search.text.trim().toLowerCase();
    return query.isEmpty
        ? _notes
        : _notes
            .where((note) => note.content.toLowerCase().contains(query))
            .toList();
  }

  Future<void> _edit([PrayerNote? note]) async {
    final controller = TextEditingController(text: note?.content ?? '');
    var audioPath = note?.audioPath;
    var audioMs = note?.audioDurationMs;
    final saved = await showModalBottomSheet<PrayerNote>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheet) => Padding(
        padding:
            EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(note == null ? 'طلبة صلاة جديدة' : 'تعديل طلبة الصلاة',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  const Text('اكتب الطلبة اللي عايز تفضل تصلي بيها'),
                  const SizedBox(height: 16),
                  TextField(
                      controller: controller,
                      autofocus: true,
                      maxLines: 6,
                      minLines: 4,
                      textAlign: TextAlign.right,
                      decoration: const InputDecoration(
                          border: OutlineInputBorder(), hintText: 'اكتب هنا...')),
                  const SizedBox(height: 12),
                  VoiceMemoField(
                    path: audioPath,
                    durationMs: audioMs,
                    onChanged: (path, ms) => setSheet(() {
                      audioPath = path;
                      audioMs = ms;
                    }),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                      onPressed: () {
                        final content = controller.text.trim();
                        if (content.isEmpty && audioPath == null) return;
                        Navigator.pop(
                            context,
                            PrayerNote(
                                id: note?.id ??
                                    '${DateTime.now().microsecondsSinceEpoch}',
                                remoteId: note?.remoteId,
                                content: content,
                                isAnswered: note?.isAnswered ?? false,
                                createdAt: note?.createdAt ?? DateTime.now(),
                                audioPath: audioPath,
                                audioDurationMs: audioMs));
                      },
                      child: Text(note == null ? 'إضافة' : 'حفظ التعديل')),
                ]),
          ),
        ),
      ),
      ),
    );
    controller.dispose();
    if (saved == null) return;
    final stored = await _service.save(saved);
    if (mounted)
      setState(() {
        _notes.removeWhere((item) => item.id == stored.id);
        _notes.insert(0, stored);
      });
  }

  Future<void> _delete(PrayerNote note) async {
    final approved = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('حذف طلبه الصلاة'),
                content: const Text('هل تريد حذف هذه طلبه الصلاة؟'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('إلغاء')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('حذف'))
                ]));
    if (approved != true) return;
    try {
      await _service.delete(note);
    } catch (_) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('تعذر الحذف. تحقق من الاتصال وحاول مجددًا.')));
      return;
    }
    if (mounted)
      setState(() => _notes.removeWhere((item) => item.id == note.id));
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
          icon: const Icon(Icons.add),
          label: const Text('طلبة صلاة جديدة'),
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              AppHeader(
                eyebrow: 'مساحة صلاة',
                title: 'طلبات الصلاة',
                onBack: () => Navigator.maybePop(context),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: ScreenHero(
                  icon: Icons.favorite_outline,
                  badge: 'طلباتك قدام ربنا',
                  eyebrow: 'مساحة صلاة',
                  title: 'اكتب طلبات الصلاة اللي شاغلة قلبك',
                  body: 'سجّل صلواتك وارجع لها بعدين، سواء طلب جديد أو حاجة ربنا استجاب لها.',
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'ابحث في طلبات الصلاة...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : RefreshIndicator(
                        onRefresh: _refresh,
                        child: _visible.isEmpty
                            ? ListView(
                                children: const [
                                  SizedBox(height: 120),
                                  Center(
                                    child: Text(
                                      'لا توجد طلبات صلاة\nاضغط + لإنشاء طلبة صلاة.',
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ],
                              )
                            : ListView.builder(
                                padding:
                                    const EdgeInsets.fromLTRB(16, 4, 16, 96),
                                itemCount: _visible.length,
                                itemBuilder: (context, index) {
                                  final note = _visible[index];
                                  return Card(
                                    child: ListTile(
                                      isThreeLine: true,
                                      onTap: () => _edit(note),
                                      title: Text(
                                          note.content.trim().isEmpty && note.audioPath != null
                                              ? 'تسجيل صوتي'
                                              : note.content,
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis),
                                      subtitle: Text(
                                          '${note.createdAt.toLocal().toString().substring(0, 10)}${note.audioPath != null ? ' • تسجيل صوتي' : ''}${note.isAnswered ? ' • استُجيبت' : ''}'),
                                      leading: IconButton(
                                        icon: Icon(
                                            note.isAnswered
                                                ? Icons.check_circle
                                                : Icons.radio_button_unchecked,
                                            color: note.isAnswered
                                                ? Colors.green
                                                : null),
                                        onPressed: () async {
                                          final stored = await _service.save(
                                              note.copyWith(
                                                  isAnswered:
                                                      !note.isAnswered));
                                          if (mounted) {
                                            setState(() {
                                              final i = _notes.indexWhere(
                                                  (item) =>
                                                      item.id == stored.id);
                                              if (i >= 0) _notes[i] = stored;
                                            });
                                          }
                                        },
                                      ),
                                      trailing: IconButton(
                                          icon:
                                              const Icon(Icons.delete_outline),
                                          onPressed: () => _delete(note)),
                                    ),
                                  );
                                },
                              ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
