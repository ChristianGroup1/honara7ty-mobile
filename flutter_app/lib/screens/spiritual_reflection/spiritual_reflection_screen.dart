import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/journal/reflections_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/voice_memo_field.dart';
import '../../widgets/youth_screen_shell.dart';

class SpiritualReflectionScreen extends StatefulWidget {
  const SpiritualReflectionScreen({super.key, this.initialText});
  final String? initialText;

  @override
  State<SpiritualReflectionScreen> createState() =>
      _SpiritualReflectionScreenState();
}

enum _ReflectionFilter { all, text, voice }

class _SpiritualReflectionScreenState extends State<SpiritualReflectionScreen> {
  final _service = ReflectionsService();
  final _search = TextEditingController();
  List<ReflectionEntry> _items = [];
  bool _loading = true;
  _ReflectionFilter _filter = _ReflectionFilter.all;

  @override
  void initState() {
    super.initState();
    _refresh();
    final initial = widget.initialText;
    if (initial != null && initial.trim().isNotEmpty) {
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _edit(initialText: initial));
    }
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  String _date(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

  String _displayDate(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return value;
    return '${_arabicDigits(date.day.toString())} ${_month(date.month)} ${_arabicDigits(date.year.toString())}';
  }

  String _month(int month) => const [
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
      ][month - 1];

  String _arabicDigits(String value) => value.replaceAllMapped(
        RegExp(r'[0-9]'),
        (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match[0]!)],
      );

  String _arabicCount(int n) => '$n'.replaceAllMapped(
        RegExp(r'[0-9]'),
        (m) => '٠١٢٣٤٥٦٧٨٩'[int.parse(m[0]!)],
      );

  Future<void> _refresh() async {
    if (mounted) setState(() => _loading = true);
    final values = await _service.load();
    if (mounted) {
      setState(() {
        _items = values;
        _loading = false;
      });
    }
  }

  List<ReflectionEntry> get _visible {
    var list = _items;
    switch (_filter) {
      case _ReflectionFilter.text:
        list = list.where((e) => e.audioPath == null).toList();
      case _ReflectionFilter.voice:
        list = list.where((e) => e.audioPath != null).toList();
      case _ReflectionFilter.all:
        break;
    }
    final query = _search.text.trim().toLowerCase();
    if (query.isEmpty) return list;
    return list
        .where((item) =>
            item.content.toLowerCase().contains(query) ||
            (item.title?.toLowerCase().contains(query) ?? false) ||
            (item.passage?.toLowerCase().contains(query) ?? false) ||
            (item.audioPath != null && 'مذكرة صوتية'.contains(query)))
        .toList();
  }

  bool get _isTrulyEmpty => !_loading && _items.isEmpty;

  Future<void> _persist(ReflectionEntry entry) async {
    final stored = await _service.save(entry);
    if (!mounted) return;
    setState(() {
      _items.removeWhere(
        (item) => item.id == entry.id || item.id == stored.id,
      );
      _items.insert(0, stored);
    });
    if (stored.pendingSync || stored.remoteId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'اتحفظت على الجهاز، وهتتبعت لـ Supabase تلقائي لما النت يستقر.',
          ),
        ),
      );
    }
  }

  Future<void> _edit({
    ReflectionEntry? entry,
    String? initialText,
    bool startWithVoice = false,
  }) async {
    if (startWithVoice && entry == null) {
      await _recordVoiceOnly();
      return;
    }

    final titleCtrl = TextEditingController(text: entry?.title ?? '');
    final passageCtrl = TextEditingController(text: entry?.passage ?? '');
    final contentCtrl = TextEditingController(
      text: entry?.content ?? initialText ?? '',
    );
    var audioPath = entry?.audioPath;
    var audioMs = entry?.audioDurationMs;
    final isNew = entry == null;

    final result = await showModalBottomSheet<Object>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xA6020617),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheet) {
          void save() {
            final content = contentCtrl.text.trim();
            final title = titleCtrl.text.trim();
            if (content.isEmpty && audioPath == null && title.isEmpty) return;
            FocusManager.instance.primaryFocus?.unfocus();
            Navigator.pop(
              sheetContext,
              ReflectionEntry(
                id: entry?.id ??
                    '${DateTime.now().microsecondsSinceEpoch}',
                remoteId: entry?.remoteId,
                title: title.isEmpty ? null : title,
                passage: passageCtrl.text.trim().isEmpty
                    ? null
                    : passageCtrl.text.trim(),
                content: content,
                date: entry?.date ?? _date(DateTime.now()),
                createdAt: entry?.createdAt ?? DateTime.now(),
                audioPath: audioPath,
                audioDurationMs: audioMs,
              ),
            );
          }

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: Align(
              alignment: Alignment.bottomCenter,
              heightFactor: 1,
              child: Material(
                color: Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(36)),
                clipBehavior: Clip.antiAlias,
                child: SafeArea(
                  top: false,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 10, 24, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Center(
                        child: Container(
                          width: 48,
                          height: 6,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE2E8F0),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0F9FF),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.edit_note_rounded,
                              size: 18,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isNew
                                  ? 'تدوين تأمل روحي جديد'
                                  : 'تعديل التأمل الروحي',
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          Material(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              onTap: () => Navigator.pop(sheetContext),
                              borderRadius: BorderRadius.circular(12),
                              child: const SizedBox(
                                width: 32,
                                height: 32,
                                child: Icon(
                                  Icons.close_rounded,
                                  size: 16,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),
                      const _FieldLabel('عنوان التأمل'),
                      const SizedBox(height: 6),
                      _SkyField(
                        controller: titleCtrl,
                        hint: 'مثال: صوت الله الهادئ...',
                        maxLines: 1,
                      ),
                      const SizedBox(height: 12),
                      const _FieldLabel('الشاهد الكتابي'),
                      const SizedBox(height: 6),
                      _SkyField(
                        controller: passageCtrl,
                        hint: 'مثال: يوحنا ١٥ أو مزمور ٢٣',
                        maxLines: 1,
                      ),
                      const SizedBox(height: 12),
                      const _FieldLabel('نص التأمل والخواطر'),
                      const SizedBox(height: 6),
                      _SkyField(
                        controller: contentCtrl,
                        hint: 'سجل خواطرك في محضر الله...',
                        maxLines: 4,
                        minLines: 3,
                        autofocus: true,
                      ),
                      const SizedBox(height: 12),
                      if (isNew && audioPath == null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F9FF).withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE0F2FE)),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.mic_rounded,
                                size: 18,
                                color: Color(0xFF0284C7),
                              ),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'تسجيل صوتي (اختياري)',
                                  style: TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0C4A6E),
                                  ),
                                ),
                              ),
                              Material(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                child: InkWell(
                                  onTap: () =>
                                      Navigator.pop(sheetContext, 'voice'),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: const Color(0xFFBAE6FD),
                                      ),
                                    ),
                                    child: const Text(
                                      'تسجيل',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0369A1),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      else if (audioPath != null)
                        VoiceMemoField(
                          path: audioPath,
                          durationMs: audioMs,
                          accentColor: AppColors.journalStart,
                          gradientColors: AppColors.journalGradient,
                          onChanged: (path, ms) => setSheet(() {
                            audioPath = path;
                            audioMs = ms;
                          }),
                        ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: AppColors.journalGradient,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.journalStart
                                          .withValues(alpha: 0.25),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: FilledButton(
                                  onPressed: save,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    foregroundColor: Colors.white,
                                    textStyle: const TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: Text(
                                    isNew ? 'حفظ التأمل' : 'حفظ التعديل',
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          if (isNew)
                            SizedBox(
                              height: 48,
                              child: FilledButton(
                                onPressed: () => Navigator.pop(sheetContext),
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFFF1F5F9),
                                  foregroundColor: const Color(0xFF334155),
                                  elevation: 0,
                                  textStyle: const TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: const Text('إلغاء'),
                              ),
                            )
                          else
                            Material(
                              color: const Color(0xFFFFF1F2),
                              borderRadius: BorderRadius.circular(16),
                              child: InkWell(
                                onTap: () =>
                                    Navigator.pop(sheetContext, 'delete'),
                                borderRadius: BorderRadius.circular(16),
                                child: const SizedBox(
                                  width: 48,
                                  height: 48,
                                  child: Icon(
                                    Icons.delete_rounded,
                                    color: Color(0xFFE11D48),
                                    size: 22,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              ),
            ),
          );
        },
      ),
    );

    // Wait for the modal reverse animation so TextFields are fully detached
    // before disposing controllers (avoids `_dependents.isEmpty` crashes).
    await Future<void>.delayed(const Duration(milliseconds: 400));
    titleCtrl.dispose();
    passageCtrl.dispose();
    contentCtrl.dispose();

    if (result == null) return;
    if (result == 'voice') {
      await _recordVoiceOnly();
      return;
    }
    if (result == 'delete' && entry != null) {
      await _delete(entry);
      return;
    }
    if (result is! ReflectionEntry) return;
    await _persist(result);
  }

  Future<void> _recordVoiceOnly() async {
    if (!mounted) return;
    final saved = await showModalBottomSheet<ReflectionEntry>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xBF020617),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(sheetContext).bottom,
        ),
        child: Align(
          alignment: Alignment.bottomCenter,
          heightFactor: 1,
          child: Material(
            color: Colors.white,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(40)),
            clipBehavior: Clip.antiAlias,
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Center(
                      child: Container(
                        width: 48,
                        height: 6,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    VoiceMemoField(
                      studioMode: true,
                      autoStart: true,
                      accentColor: AppColors.journalStart,
                      gradientColors: AppColors.journalGradient,
                      onChanged: (path, ms) {
                        if (!sheetContext.mounted) return;
                        if (path == null) {
                          Navigator.pop(sheetContext);
                          return;
                        }
                        Navigator.pop(
                          sheetContext,
                          ReflectionEntry(
                            id: '${DateTime.now().microsecondsSinceEpoch}',
                            content: '',
                            date: _date(DateTime.now()),
                            createdAt: DateTime.now(),
                            audioPath: path,
                            audioDurationMs: ms,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
    if (saved == null) return;
    await _persist(saved);
  }

  Future<void> _showDetail(ReflectionEntry entry) async {
    final hasVoice = entry.audioPath != null;
    final body = entry.content.trim();

    String durationLabel(int? ms) {
      if (ms == null || ms <= 0) return '';
      final total = (ms / 1000).round();
      final m = (total ~/ 60).toString().padLeft(2, '0');
      final s = (total % 60).toString().padLeft(2, '0');
      return '$m:$s';
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xA6020617),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(sheetContext).bottom,
        ),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(36)),
            border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 10, 24, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 48,
                      height: 6,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0F9FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.edit_note_rounded,
                          size: 18,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'مساحة التأمل',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0284C7),
                              ),
                            ),
                            Text(
                              'تفاصيل التأمل',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Material(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () => Navigator.pop(sheetContext),
                          borderRadius: BorderRadius.circular(12),
                          child: const SizedBox(
                            width: 32,
                            height: 32,
                            child: Icon(
                              Icons.close_rounded,
                              size: 16,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
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
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: hasVoice
                                    ? AppColors.journalStart
                                    : const Color(0xFFCBD5E1),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                entry.displayTitle,
                                style: const TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A),
                                  height: 1.35,
                                ),
                              ),
                            ),
                            Text(
                              _displayDate(entry.date),
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                        if (body.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxHeight:
                                  MediaQuery.sizeOf(context).height * 0.28,
                            ),
                            child: SingleChildScrollView(
                              child: Text(
                                body,
                                textAlign: TextAlign.right,
                                style: const TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF475569),
                                  height: 1.65,
                                ),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            if ((entry.passage ?? '').trim().isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0F9FF),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFE0F2FE),
                                  ),
                                ),
                                child: Text(
                                  entry.passage!,
                                  style: const TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0369A1),
                                  ),
                                ),
                              ),
                            const Spacer(),
                            if (hasVoice)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0F9FF),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFFE0F2FE),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.mic_rounded,
                                      size: 12,
                                      color: Color(0xFF0369A1),
                                    ),
                                    const SizedBox(width: 4),
                                    const Text(
                                      'مذكرة صوتية',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0369A1),
                                      ),
                                    ),
                                    if (durationLabel(entry.audioDurationMs)
                                        .isNotEmpty) ...[
                                      const SizedBox(width: 6),
                                      Text(
                                        durationLabel(entry.audioDurationMs),
                                        style: const TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF38BDF8),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              )
                            else
                              const Text(
                                'نص فقط',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                          ],
                        ),
                        if (hasVoice) ...[
                          const SizedBox(height: 12),
                          VoiceMemoField(
                            path: entry.audioPath,
                            durationMs: entry.audioDurationMs,
                            readOnly: true,
                            accentColor: AppColors.journalStart,
                            gradientColors: AppColors.journalGradient,
                            onChanged: (_, __) {},
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Material(
                        color: const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          onTap: () {
                            Navigator.pop(sheetContext);
                            _delete(entry);
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: const SizedBox(
                            width: 46,
                            height: 46,
                            child: Icon(
                              Icons.delete_outline_rounded,
                              color: Color(0xFFE11D48),
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SizedBox(
                          height: 46,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: AppColors.journalGradient,
                              ),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: FilledButton.icon(
                              onPressed: () {
                                Navigator.pop(sheetContext);
                                _edit(entry: entry);
                              },
                              icon: const Icon(Icons.edit_outlined, size: 18),
                              label: const Text('تعديل التأمل'),
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                foregroundColor: Colors.white,
                                textStyle: const TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _delete(ReflectionEntry entry) async {
    final preview = entry.displayTitle.trim().isEmpty
        ? 'التأمل ده'
        : entry.displayTitle.trim();
    final ok = await showDialog<bool>(
      context: context,
      barrierColor: const Color(0x99020617),
      builder: (context) => _DeleteReflectionDialog(preview: preview),
    );
    if (ok != true) return;
    try {
      await _service.delete(entry);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تعذر الحذف. تحقق من الاتصال وحاول مجددًا.'),
          ),
        );
      }
      return;
    }
    if (mounted) {
      setState(() => _items.removeWhere((item) => item.id == entry.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = context.watch<ThemeProvider>().isNightMode;
    final mist = dark ? AppColors.darkBackground : AppColors.lightBackground;
    final query = _search.text.trim();
    final isSearching = query.isNotEmpty;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: mist,
        bottomNavigationBar: YouthAppTabBar(
          isDark: dark,
          currentIndex: -1,
        ),
        body: Column(
          children: [
            _ReflectionHeader(
              dark: dark,
              searchActive: isSearching,
              searchEnabled: !_isTrulyEmpty,
              searchController: _search,
              onSearchChanged: (_) => setState(() {}),
              onClearSearch: () {
                _search.clear();
                setState(() {});
              },
              onBack: () {
                if (isSearching) {
                  _search.clear();
                  setState(() {});
                  return;
                }
                Navigator.maybePop(context);
              },
              onAdd: _edit,
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refresh,
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    if (_loading)
                      const SliverFillRemaining(
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (_isTrulyEmpty)
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: _EmptyState(
                          onWrite: _edit,
                          onVoice: () => _edit(startWithVoice: true),
                        ),
                      )
                    else ...[
                      if (!isSearching) ...[
                        const SliverToBoxAdapter(child: SizedBox(height: 14)),
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.page,
                          ),
                          sliver: SliverToBoxAdapter(
                            child: _ComposerCard(
                              onWrite: _edit,
                              onVoice: () => _edit(startWithVoice: true),
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 14)),
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.page,
                          ),
                          sliver: SliverToBoxAdapter(
                            child: _FilterRow(
                              filter: _filter,
                              total: _items.length,
                              onChanged: (v) => setState(() => _filter = v),
                              arabicCount: _arabicCount,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                      ] else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.page,
                            16,
                            AppSpacing.page,
                            10,
                          ),
                          sliver: SliverToBoxAdapter(
                            child: _SearchMeta(
                              query: query,
                              count: _visible.length,
                              arabicCount: _arabicCount,
                            ),
                          ),
                        ),
                      if (_visible.isEmpty)
                        const SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Text(
                              'مفيش نتائج',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.page,
                            0,
                            AppSpacing.page,
                            32,
                          ),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final entry = _visible[index];
                                return _ReflectionCard(
                                  entry: entry,
                                  date: _displayDate(entry.date),
                                  onOpen: () => _showDetail(entry),
                                  onEdit: () => _edit(entry: entry),
                                  onDelete: () => _delete(entry),
                                );
                              },
                              childCount: _visible.length,
                            ),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Color(0xFF334155),
      ),
    );
  }
}

class _SkyField extends StatelessWidget {
  const _SkyField({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.minLines,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final int? minLines;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      maxLines: maxLines,
      minLines: minLines,
      textAlign: TextAlign.right,
      style: const TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Color(0xFF0F172A),
        height: 1.55,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Color(0xFF94A3B8),
        ),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.all(14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
        ),
      ),
    );
  }
}

class _ReflectionHeader extends StatelessWidget {
  const _ReflectionHeader({
    required this.dark,
    required this.searchEnabled,
    required this.searchActive,
    required this.searchController,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.onBack,
    required this.onAdd,
  });

  final bool dark;
  final bool searchEnabled;
  final bool searchActive;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClearSearch;
  final VoidCallback onBack;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final back = Material(
      color: const Color(0xFFF8FAFC),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onBack,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: const Icon(
            Icons.arrow_back_rounded,
            size: 20,
            color: Color(0xFF334155),
          ),
        ),
      ),
    );

    final search = Opacity(
      opacity: searchEnabled ? 1 : 0.5,
      child: IgnorePointer(
        ignoring: !searchEnabled,
        child: TextField(
          controller: searchController,
          enabled: searchEnabled,
          onChanged: onSearchChanged,
          textAlign: TextAlign.right,
          style: const TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
          decoration: InputDecoration(
            hintText: 'ابحث في تأملاتك وملاحظاتك الشخصية...',
            hintStyle: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF94A3B8),
            ),
            prefixIcon: Icon(
              Icons.search_rounded,
              color: searchActive
                  ? AppColors.journalStart
                  : const Color(0xFF94A3B8),
              size: 20,
            ),
            suffixIcon: searchActive
                ? IconButton(
                    onPressed: onClearSearch,
                    icon: const Icon(
                      Icons.cancel_rounded,
                      size: 18,
                      color: Color(0xFF94A3B8),
                    ),
                  )
                : null,
            filled: true,
            fillColor: searchActive
                ? const Color(0xFFF0F9FF)
                : const Color(0xFFF1F5F9).withValues(alpha: 0.8),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: searchActive
                    ? const Color(0xFF38BDF8)
                    : const Color(0xFFE2E8F0),
                width: searchActive ? 2 : 1,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: searchActive
                    ? const Color(0xFF38BDF8)
                    : const Color(0xFFE2E8F0),
                width: searchActive ? 2 : 1,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 2),
            ),
          ),
        ),
      ),
    );

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: dark ? AppColors.darkCard : Colors.white,
        border: const Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          AnimatedSize(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: searchActive
                ? const SizedBox.shrink()
                : Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        back,
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'مساحة التأمل',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  color: Color(0xFF0284C7),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                ),
                              ),
                              Text(
                                AppStrings.reflectionTitle,
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  color: Color(0xFF0F172A),
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  height: 1.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(16),
                          child: InkWell(
                            onTap: onAdd,
                            borderRadius: BorderRadius.circular(16),
                            child: Ink(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: const LinearGradient(
                                  begin: Alignment.topRight,
                                  end: Alignment.bottomLeft,
                                  colors: AppColors.journalGradient,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.journalStart
                                        .withValues(alpha: 0.25),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.add_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
          // Stable Row slots keep the TextField mounted so the keyboard stays.
          Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: searchActive ? 50 : 0,
                curve: Curves.easeOut,
                child: searchActive
                    ? Row(
                        children: [
                          back,
                          const SizedBox(width: 10),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
              Expanded(child: search),
            ],
          ),
        ],
      ),
    );
  }
}

class _DeleteReflectionDialog extends StatelessWidget {
  const _DeleteReflectionDialog({required this.preview});
  final String preview;

  @override
  Widget build(BuildContext context) {
    final short = preview.length > 42 ? '${preview.substring(0, 42)}…' : preview;
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Container(
        padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFF1F5F9)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 30,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE0F2FE)),
              ),
              child: const Icon(
                Icons.delete_forever_rounded,
                size: 30,
                color: Color(0xFF0284C7),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'هل أنت متأكد من حذف هذا التأمل؟',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '"$short" لن يظهر في قائمتك مرة أخرى.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                height: 1.5,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.journalStart,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        textStyle: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text('نعم، احذف'),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context, false),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF1F5F9),
                        foregroundColor: const Color(0xFF334155),
                        elevation: 0,
                        textStyle: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text('تراجع'),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ComposerCard extends StatelessWidget {
  const _ComposerCard({required this.onWrite, required this.onVoice});
  final VoidCallback onWrite;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            Color(0xFFF0F9FF),
            Color(0xFFECFEFF),
            Colors.white,
          ],
        ),
        border: Border.all(color: const Color(0xFFE0F2FE)),
        boxShadow: [
          BoxShadow(
            color: AppColors.journalStart.withValues(alpha: 0.06),
            blurRadius: 30,
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
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.journalStart.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.edit_note_rounded,
                  size: 15,
                  color: Color(0xFF0284C7),
                ),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'تأملاتك وملاحظاتك الشخصية',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0C4A6E),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE).withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'محفوظة بأمان',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0284C7),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'سجل خواطرك وتأملاتك في محضر الله لترجع إليها وتبني إيمانك كل يوم.',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              height: 1.55,
              color: Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ActionBtn(
                  label: 'كتابة تأمل',
                  icon: Icons.edit_note_rounded,
                  onTap: onWrite,
                  filled: false,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ActionBtn(
                  label: 'مذكرة صوتية',
                  icon: Icons.mic_rounded,
                  onTap: onVoice,
                  filled: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  const _ActionBtn({
    required this.label,
    required this.icon,
    required this.onTap,
    required this.filled,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(14);
    return SizedBox(
      height: 36,
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: radius,
              color: filled ? null : Colors.white,
              gradient: filled
                  ? const LinearGradient(colors: AppColors.journalGradient)
                  : null,
              border: filled
                  ? null
                  : Border.all(color: const Color(0xFFBAE6FD)),
              boxShadow: filled
                  ? [
                      BoxShadow(
                        color: AppColors.journalStart.withValues(alpha: 0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: filled ? Colors.white : const Color(0xFF0369A1),
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: filled ? Colors.white : const Color(0xFF0369A1),
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

class _FilterRow extends StatelessWidget {
  const _FilterRow({
    required this.filter,
    required this.total,
    required this.onChanged,
    required this.arabicCount,
  });

  final _ReflectionFilter filter;
  final int total;
  final ValueChanged<_ReflectionFilter> onChanged;
  final String Function(int) arabicCount;

  @override
  Widget build(BuildContext context) {
    Widget chip(_ReflectionFilter value, String label, {bool showCount = false}) {
      final selected = filter == value;
      return GestureDetector(
        onTap: () => onChanged(value),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: selected
                ? null
                : Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: Text(
            showCount ? '$label (${arabicCount(total)})' : label,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : const Color(0xFF64748B),
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        chip(_ReflectionFilter.all, 'الكل', showCount: true),
        const SizedBox(width: 6),
        chip(_ReflectionFilter.text, 'مكتوبة'),
        const SizedBox(width: 6),
        chip(_ReflectionFilter.voice, 'صوتية'),
        const Spacer(),
        const Text(
          'الأحدث أولاً',
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 10,
            fontWeight: FontWeight.w500,
            color: Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }
}

class _SearchMeta extends StatelessWidget {
  const _SearchMeta({
    required this.query,
    required this.count,
    required this.arabicCount,
  });

  final String query;
  final int count;
  final String Function(int) arabicCount;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text.rich(
            TextSpan(
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: Color(0xFF334155),
              ),
              children: [
                const TextSpan(text: 'نتائج البحث عن: '),
                TextSpan(
                  text: '"$query"',
                  style: const TextStyle(color: Color(0xFF0284C7)),
                ),
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            'نتائج (${arabicCount(count)})',
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Color(0xFF94A3B8),
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onWrite, required this.onVoice});
  final VoidCallback onWrite;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 74,
            height: 74,
            decoration: BoxDecoration(
              color: AppColors.journalStart.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.edit_note_rounded,
              size: 36,
              color: Color(0xFF0284C7),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'لسه مفيش تأملات',
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'سجّل أول تأمل أو مذكرة صوتية وارجع لها في أي وقت.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
              height: 1.55,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: AppColors.journalGradient),
                borderRadius: BorderRadius.circular(16),
              ),
              child: FilledButton.icon(
                onPressed: onWrite,
                icon: const Icon(Icons.edit_note_rounded, size: 20),
                label: const Text('اكتب أول تأمل'),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  textStyle: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              onPressed: onVoice,
              icon: const Icon(Icons.mic_rounded, size: 18),
              label: const Text('مذكرة صوتية فورية'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF0369A1),
                side: const BorderSide(color: Color(0xFFBAE6FD)),
                textStyle: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontWeight: FontWeight.w700,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReflectionCard extends StatelessWidget {
  const _ReflectionCard({
    required this.entry,
    required this.date,
    required this.onOpen,
    required this.onEdit,
    required this.onDelete,
  });

  final ReflectionEntry entry;
  final String date;
  final VoidCallback onOpen;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  String _durationLabel(int? ms) {
    if (ms == null || ms <= 0) return '';
    final total = (ms / 1000).round();
    final m = (total ~/ 60).toString().padLeft(2, '0');
    final s = (total % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final hasVoice = entry.audioPath != null;
    final body = entry.content.trim().isEmpty
        ? (hasVoice ? 'مذكرة صوتية مسجلة' : '')
        : entry.content.trim();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
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
          InkWell(
            onTap: onOpen,
            borderRadius: BorderRadius.circular(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: hasVoice
                            ? AppColors.journalStart
                            : const Color(0xFFCBD5E1),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        entry.displayTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    Text(
                      date,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
                if (body.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF475569),
                      height: 1.55,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),
          Row(
            children: [
              if ((entry.passage ?? '').trim().isNotEmpty)
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F9FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE0F2FE)),
                    ),
                    child: Text(
                      entry.passage!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0369A1),
                      ),
                    ),
                  ),
                )
              else if (hasVoice)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F9FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE0F2FE)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.mic_rounded,
                        size: 12,
                        color: Color(0xFF0369A1),
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'مذكرة صوتية',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0369A1),
                        ),
                      ),
                      if (_durationLabel(entry.audioDurationMs).isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Text(
                          _durationLabel(entry.audioDurationMs),
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF38BDF8),
                          ),
                        ),
                      ],
                    ],
                  ),
                )
              else
                const Text(
                  'نص فقط',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              const Spacer(),
              _IconAction(
                icon: Icons.edit_outlined,
                color: const Color(0xFF64748B),
                background: const Color(0xFFF8FAFC),
                onTap: onEdit,
              ),
              const SizedBox(width: 6),
              _IconAction(
                icon: Icons.delete_outline_rounded,
                color: const Color(0xFF0284C7),
                background: const Color(0xFFF0F9FF),
                onTap: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _IconAction extends StatelessWidget {
  const _IconAction({
    required this.icon,
    required this.color,
    required this.background,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final Color background;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(icon, size: 16, color: color),
        ),
      ),
    );
  }
}

