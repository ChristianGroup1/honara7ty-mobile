import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/journal/prayer_notes_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/voice_memo_field.dart';
import '../../widgets/youth_screen_shell.dart';

class PrayerNotesScreen extends StatefulWidget {
  const PrayerNotesScreen({super.key});

  @override
  State<PrayerNotesScreen> createState() => _PrayerNotesScreenState();
}

enum _PrayerFilter { all, active, answered }

class _PrayerNotesScreenState extends State<PrayerNotesScreen> {
  final _service = PrayerNotesService();
  final _search = TextEditingController();
  List<PrayerNote> _notes = [];
  bool _loading = true;
  _PrayerFilter _filter = _PrayerFilter.all;

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
    if (mounted) {
      setState(() {
        _notes = notes;
        _loading = false;
      });
    }
  }

  List<PrayerNote> get _visible {
    var list = _notes;
    switch (_filter) {
      case _PrayerFilter.active:
        list = list.where((n) => !n.isAnswered).toList();
      case _PrayerFilter.answered:
        list = list.where((n) => n.isAnswered).toList();
      case _PrayerFilter.all:
        break;
    }
    final query = _search.text.trim().toLowerCase();
    if (query.isEmpty) return list;
    return list
        .where((note) =>
            note.content.toLowerCase().contains(query) ||
            (note.audioPath != null && 'تسجيل صوتي'.contains(query)))
        .toList();
  }

  bool get _isTrulyEmpty => !_loading && _notes.isEmpty;

  String _arabicCount(int n) => '$n'
      .replaceAllMapped(RegExp(r'[0-9]'), (m) => '٠١٢٣٤٥٦٧٨٩'[int.parse(m[0]!)]);

  Future<void> _edit({PrayerNote? note, bool startWithVoice = false}) async {
    if (startWithVoice && note == null) {
      await _recordVoiceOnly();
      return;
    }

    final result = await showModalBottomSheet<Object>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xB3020617),
      builder: (sheetContext) => _PrayerComposerSheet(note: note),
    );
    if (!mounted) return;
    if (result == null) return;
    if (result == 'voice') {
      await _recordVoiceOnly();
      return;
    }
    if (result == 'delete' && note != null) {
      await _delete(note);
      return;
    }
    if (result is! PrayerNote) return;
    await _persistNote(result);
  }

  Future<void> _recordVoiceOnly() async {
    if (!mounted) return;
    final saved = await showModalBottomSheet<PrayerNote>(
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
            elevation: 12,
            shadowColor: const Color(0x26000000),
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(40)),
            clipBehavior: Clip.antiAlias,
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
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
                    VoiceMemoField(
                      studioMode: true,
                      autoStart: true,
                      onChanged: (path, ms) {
                        if (!sheetContext.mounted) return;
                        if (path == null) {
                          Navigator.pop(sheetContext);
                          return;
                        }
                        Navigator.pop(
                          sheetContext,
                          PrayerNote(
                            id: '${DateTime.now().microsecondsSinceEpoch}',
                            content: '',
                            isAnswered: false,
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
    await _persistNote(saved);
  }

  Future<void> _persistNote(PrayerNote note) async {
    final stored = await _service.save(note);
    if (!mounted) return;
    setState(() {
      _notes.removeWhere(
        (item) => item.id == note.id || item.id == stored.id,
      );
      _notes.insert(0, stored);
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

  Future<void> _showDetail(PrayerNote note) async {
    final answered = note.isAnswered;
    final isAudio = note.audioPath != null && note.content.trim().isEmpty;
    final title = isAudio
        ? 'تسجيل صوتي'
        : (note.content.trim().isEmpty ? 'طلبة صلاة' : note.content.trim());
    final status = answered ? 'استجيبت' : 'قيد الصلاة';

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0xB3020617),
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
                          color: answered
                              ? AppColors.success.withValues(alpha: 0.12)
                              : const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          answered
                              ? Icons.check_circle_rounded
                              : Icons.favorite_rounded,
                          size: 18,
                          color: answered
                              ? AppColors.success
                              : AppColors.prayerStart,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'مساحة صلاة',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: AppColors.prayerStart,
                              ),
                            ),
                            Text(
                              'تفاصيل طلبة الصلاة',
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
                      border: Border.all(
                        color: answered
                            ? AppColors.success.withValues(alpha: 0.28)
                            : const Color(0xFFF1F5F9),
                      ),
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
                            GestureDetector(
                              onTap: () async {
                                Navigator.pop(sheetContext);
                                await _toggleAnswered(note);
                              },
                              child: Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    width: 2,
                                    color: answered
                                        ? AppColors.success
                                        : const Color(0xFFCBD5E1),
                                  ),
                                  color: answered
                                      ? AppColors.success
                                          .withValues(alpha: 0.12)
                                      : Colors.transparent,
                                ),
                                child: answered
                                    ? const Icon(
                                        Icons.check_rounded,
                                        size: 16,
                                        color: AppColors.success,
                                      )
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title,
                                    style: const TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0F172A),
                                      height: 1.45,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    status,
                                    style: TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontSize: 10,
                                      fontWeight: answered
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: answered
                                          ? AppColors.success
                                          : const Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (!isAudio && note.content.trim().isNotEmpty) ...[
                          const SizedBox(height: 14),
                          const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          const SizedBox(height: 12),
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxHeight:
                                  MediaQuery.sizeOf(context).height * 0.28,
                            ),
                            child: SingleChildScrollView(
                              child: Text(
                                note.content.trim(),
                                textAlign: TextAlign.right,
                                style: const TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF334155),
                                  height: 1.7,
                                ),
                              ),
                            ),
                          ),
                        ],
                        if (note.audioPath != null) ...[
                          const SizedBox(height: 12),
                          VoiceMemoField(
                            path: note.audioPath,
                            durationMs: note.audioDurationMs,
                            readOnly: true,
                            onChanged: (_, __) {},
                          ),
                        ],
                        const SizedBox(height: 12),
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Text(
                              _date(note.createdAt),
                              style: const TextStyle(
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
                              onTap: () {
                                Navigator.pop(sheetContext);
                                _edit(note: note);
                              },
                            ),
                            const SizedBox(width: 6),
                            _IconAction(
                              icon: Icons.delete_outline_rounded,
                              color: AppColors.prayerStart,
                              background: const Color(0xFFFFF1F2),
                              onTap: () {
                                Navigator.pop(sheetContext);
                                _delete(note);
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 46,
                    child: FilledButton(
                      onPressed: () async {
                        Navigator.pop(sheetContext);
                        await _toggleAnswered(note);
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: answered
                            ? const Color(0xFFF1F5F9)
                            : AppColors.success,
                        foregroundColor: answered
                            ? const Color(0xFF334155)
                            : Colors.white,
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
                      child: Text(
                        answered ? 'إعادة فتح الصلاة' : 'نعم، استجيبت',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _toggleAnswered(PrayerNote note) async {
    final stored =
        await _service.save(note.copyWith(isAnswered: !note.isAnswered));
    if (mounted) {
      setState(() {
        final i = _notes.indexWhere((item) => item.id == stored.id);
        if (i >= 0) _notes[i] = stored;
      });
    }
  }

  Future<void> _delete(PrayerNote note) async {
    final preview = note.content.trim().isEmpty && note.audioPath != null
        ? 'تسجيل صوتي'
        : (note.content.trim().isEmpty
            ? 'طلبة الصلاة دي'
            : note.content.trim());
    final approved = await showDialog<bool>(
      context: context,
      barrierColor: const Color(0x99020617),
      builder: (context) => _DeletePrayerDialog(preview: preview),
    );
    if (approved != true) return;
    await _service.delete(note);
    if (mounted) {
      setState(() => _notes.removeWhere((item) => item.id == note.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = context.watch<ThemeProvider>().isNightMode;
    final mist = dark ? AppColors.darkBackground : AppColors.lightBackground;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final text = dark ? AppColors.darkText : AppColors.lightText;

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
            _PrayerNotesHeader(
              dark: dark,
              searchEnabled: !_isTrulyEmpty,
              searchActive: isSearching,
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
                          searching: false,
                          text: text,
                          muted: muted,
                          onWrite: _edit,
                          onVoice: () => _edit(startWithVoice: true),
                        ),
                      )
                    else ...[
                      if (!isSearching) ...[
                        const SliverToBoxAdapter(
                          child: SizedBox(height: 14),
                        ),
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
                              total: _notes.length,
                              onChanged: (value) =>
                                  setState(() => _filter = value),
                              arabicCount: _arabicCount,
                            ),
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 10)),
                      ] else ...[
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.page,
                            16,
                            AppSpacing.page,
                            10,
                          ),
                          sliver: SliverToBoxAdapter(
                            child: _SearchResultsMeta(
                              query: query,
                              count: _visible.length,
                              arabicCount: _arabicCount,
                            ),
                          ),
                        ),
                      ],
                      if (_visible.isEmpty)
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.all(28),
                              child: Text(
                                isSearching
                                    ? 'مفيش نتائج للبحث'
                                    : 'مفيش طلبات في الفلتر ده',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  color: muted,
                                  fontWeight: FontWeight.w700,
                                ),
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
                              (context, index) => _PrayerCard(
                                note: _visible[index],
                                highlightQuery: isSearching ? query : null,
                                onOpen: () => _showDetail(_visible[index]),
                                onEdit: () => _edit(note: _visible[index]),
                                onDelete: () => _delete(_visible[index]),
                                onToggle: () =>
                                    _toggleAnswered(_visible[index]),
                              ),
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

/// White sticky header matching Stitch Prayer Notes empty-state design.
class _PrayerNotesHeader extends StatelessWidget {
  const _PrayerNotesHeader({
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
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : AppColors.lightText;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final backBg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final backBorder = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);

    final backButton = Material(
      color: backBg,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onBack,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: backBorder),
          ),
          child: Icon(
            Icons.arrow_back_rounded,
            color: titleColor,
            size: 20,
          ),
        ),
      ),
    );

    final searchField = _SearchField(
      controller: searchController,
      enabled: searchEnabled,
      active: searchActive,
      onChanged: onSearchChanged,
      onClear: onClearSearch,
      dark: dark,
      muted: muted,
    );

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: surface,
        border: Border(bottom: BorderSide(color: border)),
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
                        backButton,
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'مساحة صلاة',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  color: AppColors.prayerStart,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                ),
                              ),
                              Text(
                                'طلبات الصلاة',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  color: titleColor,
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
                                  colors: AppColors.prayerGradient,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.prayerStart
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
          // Keep TextField in a stable Expanded so focus/keyboard survive.
          Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: searchActive ? 50 : 0,
                curve: Curves.easeOut,
                child: searchActive
                    ? Row(
                        children: [
                          backButton,
                          const SizedBox(width: 10),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
              Expanded(child: searchField),
            ],
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.enabled,
    required this.active,
    required this.onChanged,
    required this.onClear,
    required this.dark,
    required this.muted,
  });

  final TextEditingController controller;
  final bool enabled;
  final bool active;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final bool dark;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    final fill = active
        ? const Color(0xFFFFF1F2).withValues(alpha: 0.5)
        : (dark ? AppColors.darkCardMuted : AppColors.lightCardMuted);
    final idleBorder =
        dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final activeBorder = const BorderSide(
      color: Color(0xFFFB7185),
      width: 2,
    );

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: IgnorePointer(
        ignoring: !enabled,
        child: TextField(
          controller: controller,
          enabled: enabled,
          onChanged: onChanged,
          textAlign: TextAlign.right,
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: dark ? AppColors.darkText : AppColors.lightText,
          ),
          decoration: InputDecoration(
            hintText: 'ابحث في طلبات الصلاة...',
            hintStyle: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: muted,
            ),
            prefixIcon: Icon(
              Icons.search_rounded,
              color: active ? AppColors.prayerStart : muted,
              size: 20,
            ),
            suffixIcon: active
                ? IconButton(
                    onPressed: onClear,
                    icon: Icon(
                      Icons.cancel_rounded,
                      color: muted,
                      size: 18,
                    ),
                    tooltip: 'مسح البحث',
                  )
                : null,
            filled: true,
            fillColor: fill,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: active
                  ? activeBorder
                  : BorderSide(color: idleBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: active
                  ? activeBorder
                  : BorderSide(color: idleBorder),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: idleBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(
                color: Color(0xFFFB7185),
                width: 2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SearchResultsMeta extends StatelessWidget {
  const _SearchResultsMeta({
    required this.query,
    required this.count,
    required this.arabicCount,
  });

  final String query;
  final int count;
  final String Function(int) arabicCount;

  String get _countLabel {
    final n = arabicCount(count);
    if (count == 0) return 'لا نتائج ($n)';
    if (count == 1) return 'نتيجة ($n)';
    if (count == 2) return 'نتيجتان ($n)';
    return 'نتائج ($n)';
  }

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
                  style: const TextStyle(color: Color(0xFFE11D48)),
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
            _countLabel,
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

class _DeletePrayerDialog extends StatelessWidget {
  const _DeletePrayerDialog({required this.preview});
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
                color: const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFFE4E6)),
              ),
              child: const Icon(
                Icons.delete_forever_rounded,
                size: 30,
                color: Color(0xFFE11D48),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'هل أنت متأكد من حذف هذه الصلاة؟',
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
              '"$short" لن تظهر في قائمتك مرة أخرى.',
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
                        backgroundColor: AppColors.prayerStart,
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
            Color(0xFFFFF1F2),
            Color(0xFFFDF2F8),
            Colors.white,
          ],
        ),
        border: Border.all(color: const Color(0xFFFFE4E6)),
        boxShadow: [
          BoxShadow(
            color: AppColors.prayerStart.withValues(alpha: 0.06),
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
                  color: AppColors.prayerStart.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  size: 15,
                  color: Color(0xFFE11D48),
                ),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'سجل قلبك مع الله',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF881337),
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE4E6).withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'خاصة بك',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.prayerStart.withValues(alpha: 0.85),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'اكتب طلبات الصلاة اللي شاغلة قلبك وارجع شوف استجابات ربنا ونعمته كل يوم.',
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
                child: _ComposerActionButton(
                  label: 'كتابة صلاة',
                  icon: Icons.edit_note_rounded,
                  onTap: onWrite,
                  filled: false,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ComposerActionButton(
                  label: 'تسجيل صوتي',
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

class _ComposerActionButton extends StatelessWidget {
  const _ComposerActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
    required this.filled,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  static const double _height = 36;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(14);
    return SizedBox(
      height: _height,
      width: double.infinity,
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Ink(
            height: _height,
            decoration: BoxDecoration(
              borderRadius: radius,
              color: filled ? null : Colors.white,
              gradient: filled
                  ? const LinearGradient(colors: AppColors.prayerGradient)
                  : null,
              border: filled
                  ? null
                  : Border.all(
                      color: AppColors.prayerStart.withValues(alpha: 0.35),
                    ),
              boxShadow: filled
                  ? [
                      BoxShadow(
                        color: AppColors.prayerStart.withValues(alpha: 0.18),
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
                  size: 14,
                  color: filled ? Colors.white : const Color(0xFFBE123C),
                ),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: filled ? Colors.white : const Color(0xFFBE123C),
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

  final _PrayerFilter filter;
  final int total;
  final ValueChanged<_PrayerFilter> onChanged;
  final String Function(int) arabicCount;

  @override
  Widget build(BuildContext context) {
    Widget chip(_PrayerFilter value, String label, {bool showCount = false}) {
      final selected = filter == value;
      return GestureDetector(
        onTap: () => onChanged(value),
        child: AnimatedContainer(
          duration: AppMotion.stateChange,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.navy : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: selected
                ? null
                : Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
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
        Expanded(
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              chip(_PrayerFilter.all, 'الكل', showCount: true),
              chip(_PrayerFilter.active, 'قيد الصلاة'),
              chip(_PrayerFilter.answered, 'استجيبت'),
            ],
          ),
        ),
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

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.searching,
    required this.text,
    required this.muted,
    required this.onWrite,
    required this.onVoice,
  });

  final bool searching;
  final Color text;
  final Color muted;
  final VoidCallback onWrite;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                  gradient: const LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [
                      Color(0xFFFFE4E6),
                      Color(0xFFFDF2F8),
                    ],
                  ),
                  border: Border.all(
                    color: AppColors.prayerStart.withValues(alpha: 0.28),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.prayerStart.withValues(alpha: 0.12),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.volunteer_activism_rounded,
                  size: 44,
                  color: AppColors.prayerStart,
                ),
              ),
              Positioned(
                top: -8,
                left: -8,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: AppColors.lightCard,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.prayerEnd.withValues(alpha: 0.55),
                    ),
                    boxShadow: AppShadows.soft,
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    size: 14,
                    color: AppColors.prayerStart,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            searching
                ? 'مفيش نتائج للبحث'
                : 'لا توجد طلبات صلاة مسجلة',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: text,
            ),
          ),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 280),
            child: Text(
              searching
                  ? 'جرّب كلمة تانية.'
                  : 'اكتب طلبات الصلاة اللي شاغلة قلبك وشاركها مع ربنا بصوتك أو بكتابة بسيطة.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 13,
                fontWeight: FontWeight.w500,
                height: 1.55,
                color: muted,
              ),
            ),
          ),
          if (!searching) ...[
            const SizedBox(height: 28),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: AppColors.prayerGradient,
                        ),
                        borderRadius: BorderRadius.circular(AppRadius.xl),
                        boxShadow: [
                          BoxShadow(
                            color:
                                AppColors.prayerStart.withValues(alpha: 0.28),
                            blurRadius: 14,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: FilledButton.icon(
                        onPressed: onWrite,
                        icon: const Icon(Icons.edit_note_rounded, size: 20),
                        label: const Text('اكتب أول طلب صلاة'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          textStyle: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.xl),
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
                      icon: const Icon(
                        Icons.mic_rounded,
                        size: 18,
                        color: AppColors.prayerStart,
                      ),
                      label: const Text('تسجيل صوتي فوري'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: text,
                        side: BorderSide(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? AppColors.darkBorder
                              : AppColors.lightBorder,
                        ),
                        textStyle: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.xl),
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
    );
  }
}

String _date(DateTime date) =>
    '${_arabicDigits(date.day.toString())} ${_arabicMonth(date.month)} ${_arabicDigits(date.year.toString())}';

String _arabicMonth(int month) => const [
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

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.icon, required this.label, this.color});
  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) => Chip(
        avatar: Icon(icon, size: 15, color: color ?? AppColors.steel),
        label: Text(label),
        visualDensity: VisualDensity.compact,
        side: BorderSide.none,
        backgroundColor: (color ?? AppColors.steel).withValues(alpha: .11),
      );
}

class _PrayerCard extends StatelessWidget {
  const _PrayerCard({
    required this.note,
    required this.onOpen,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
    this.highlightQuery,
  });

  final PrayerNote note;
  final VoidCallback onOpen, onEdit, onDelete, onToggle;
  final String? highlightQuery;

  String _durationLabel(int? ms) {
    if (ms == null || ms <= 0) return '';
    final total = (ms / 1000).round();
    final m = (total ~/ 60).toString().padLeft(2, '0');
    final s = (total % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  List<InlineSpan> _titleSpans(String title, String? query) {
    const base = TextStyle(
      fontFamily: AppFonts.ui,
      fontSize: 12,
      fontWeight: FontWeight.w900,
      color: Color(0xFF0F172A),
      height: 1.35,
    );
    if (query == null || query.trim().isEmpty) {
      return [TextSpan(text: title, style: base)];
    }
    final q = query.trim();
    final lower = title.toLowerCase();
    final needle = q.toLowerCase();
    final spans = <InlineSpan>[];
    var start = 0;
    while (true) {
      final index = lower.indexOf(needle, start);
      if (index < 0) {
        spans.add(TextSpan(text: title.substring(start), style: base));
        break;
      }
      if (index > start) {
        spans.add(TextSpan(text: title.substring(start, index), style: base));
      }
      spans.add(
        TextSpan(
          text: title.substring(index, index + q.length),
          style: base.copyWith(
            color: const Color(0xFFBE123C),
            backgroundColor: const Color(0xFFFFE4E6),
          ),
        ),
      );
      start = index + q.length;
    }
    return spans;
  }

  @override
  Widget build(BuildContext context) {
    final answered = note.isAnswered;
    final searching = highlightQuery != null && highlightQuery!.trim().isNotEmpty;
    final isAudio =
        note.audioPath != null && note.content.trim().isEmpty;
    final title = isAudio
        ? 'تسجيل صوتي'
        : (note.content.trim().isEmpty ? 'طلبة صلاة' : note.content.trim());
    final status = answered ? 'استجيبت' : 'قيد الصلاة';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: searching
              ? const Color(0xFFFECDD3)
              : answered
                  ? AppColors.success.withValues(alpha: 0.28)
                  : const Color(0xFFF1F5F9),
        ),
        boxShadow: [
          BoxShadow(
            color: searching
                ? AppColors.prayerStart.withValues(alpha: 0.04)
                : Colors.black.withValues(alpha: 0.02),
            blurRadius: searching ? 20 : 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  width: 2,
                  color: answered
                      ? AppColors.success
                      : const Color(0xFFCBD5E1),
                ),
                color: answered
                    ? AppColors.success.withValues(alpha: 0.12)
                    : Colors.transparent,
              ),
              child: answered
                  ? const Icon(
                      Icons.check_rounded,
                      size: 16,
                      color: AppColors.success,
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: InkWell(
              onTap: onOpen,
              borderRadius: BorderRadius.circular(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(children: _titleSpans(title, highlightQuery)),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (note.audioPath != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFC7D2FE).withValues(alpha: 0.7),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.mic_rounded,
                            size: 12,
                            color: Color(0xFF4338CA),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'تسجيل صوتي',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF4338CA),
                            ),
                          ),
                          if (_durationLabel(note.audioDurationMs).isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Text(
                              _durationLabel(note.audioDurationMs),
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 9,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF818CF8),
                              ),
                            ),
                          ],
                        ],
                      ),
                    )
                  else
                    Text(
                      status,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight:
                            answered ? FontWeight.w700 : FontWeight.w500,
                        color: answered
                            ? AppColors.success
                            : const Color(0xFF94A3B8),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          _IconAction(
            icon: Icons.edit_outlined,
            color: const Color(0xFF64748B),
            background: const Color(0xFFF8FAFC),
            onTap: onEdit,
          ),
          const SizedBox(width: 6),
          _IconAction(
            icon: Icons.delete_outline_rounded,
            color: AppColors.prayerStart,
            background: const Color(0xFFFFF1F2),
            onTap: onDelete,
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

class _PrayerComposerSheet extends StatefulWidget {
  const _PrayerComposerSheet({this.note});

  final PrayerNote? note;

  @override
  State<_PrayerComposerSheet> createState() => _PrayerComposerSheetState();
}

class _PrayerComposerSheetState extends State<_PrayerComposerSheet> {
  late final TextEditingController _controller;
  String? _audioPath;
  int? _audioMs;
  late bool _isAnswered;
  late int _charCount;

  bool get _isNew => widget.note == null;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.note?.content ?? '');
    _audioPath = widget.note?.audioPath;
    _audioMs = widget.note?.audioDurationMs;
    _isAnswered = widget.note?.isAnswered ?? false;
    _charCount = _controller.text.characters.length;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  PrayerNote _buildNote() => PrayerNote(
        id: widget.note?.id ?? '${DateTime.now().microsecondsSinceEpoch}',
        remoteId: widget.note?.remoteId,
        content: _controller.text.trim(),
        isAnswered: _isAnswered,
        createdAt: widget.note?.createdAt ?? DateTime.now(),
        audioPath: _audioPath,
        audioDurationMs: _audioMs,
      );

  void _save() {
    final content = _controller.text.trim();
    if (content.isEmpty && _audioPath == null) return;
    FocusManager.instance.primaryFocus?.unfocus();
    Navigator.pop(context, _buildNote());
  }

  String _arabicCount(int n) => '$n'
      .replaceAllMapped(RegExp(r'[0-9]'), (m) => '٠١٢٣٤٥٦٧٨٩'[int.parse(m[0]!)]);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Align(
        alignment: Alignment.bottomCenter,
        heightFactor: 1,
        child: Material(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
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
                          color: _isNew
                              ? const Color(0xFFFFF1F2)
                              : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _isNew
                              ? Icons.add_circle_rounded
                              : Icons.edit_note_rounded,
                          size: 18,
                          color: _isNew
                              ? const Color(0xFFE11D48)
                              : const Color(0xFF334155),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isNew
                                  ? 'طلب صلاة جديد'
                                  : 'تفاصيل طلبه الصلاة',
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                height: 1.2,
                              ),
                            ),
                            Text(
                              _isNew
                                  ? 'اكتب طلبات الصلاة اللي شاغلة قلبك'
                                  : 'تعديل النص أو تحديث الحالة',
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Material(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () => Navigator.pop(context),
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
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'نص الطلبة',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF334155),
                          ),
                        ),
                      ),
                      if (!_isNew)
                        Text(
                          '${_arabicCount(_charCount)} حرفاً',
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _controller,
                    autofocus: true,
                    maxLines: _isNew ? 4 : 3,
                    minLines: _isNew ? 4 : 3,
                    textAlign: TextAlign.right,
                    textAlignVertical: TextAlignVertical.top,
                    onChanged: (_) => setState(
                      () => _charCount = _controller.text.characters.length,
                    ),
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                      height: 1.55,
                    ),
                    decoration: InputDecoration(
                      hintText: _isNew
                          ? 'اكتب صلاتك هنا... (مثال: اصلي لخدمة كردوس والأولاد)'
                          : null,
                      hintStyle: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF94A3B8),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.all(16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(
                          color: _isNew
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFFFDA4AF),
                          width: 2,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(
                          color: _isNew
                              ? const Color(0xFFE2E8F0)
                              : const Color(0xFFFDA4AF),
                          width: 2,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: AppColors.prayerStart,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_isNew)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.mic_rounded,
                            size: 18,
                            color: AppColors.prayerStart,
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'تفضل التسجيل الصوتي؟',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ),
                          Material(
                            color: const Color(0xFFFFE4E6),
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              onTap: () => Navigator.pop(context, 'voice'),
                              borderRadius: BorderRadius.circular(12),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                child: Text(
                                  'سجّل صوتك',
                                  style: TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFFE11D48),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else ...[
                    if (_audioPath != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: VoiceMemoField(
                          path: _audioPath,
                          durationMs: _audioMs,
                          onChanged: (path, ms) => setState(() {
                            _audioPath = path;
                            _audioMs = ms;
                          }),
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.check_circle_rounded,
                            size: 18,
                            color: _isAnswered
                                ? AppColors.success
                                : const Color(0xFF059669),
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'هل استجاب الرب لهذه الصلاة؟',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ),
                          Material(
                            color: const Color(0xFFD1FAE5),
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              onTap: () =>
                                  setState(() => _isAnswered = !_isAnswered),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                child: Text(
                                  _isAnswered ? 'استُجيبت ✓' : 'نعم، استجيبت',
                                  style: const TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF059669),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 48,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: AppColors.prayerGradient,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.prayerStart
                                      .withValues(alpha: 0.25),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: FilledButton.icon(
                              onPressed: _save,
                              icon: const Icon(Icons.check_rounded, size: 18),
                              label: Text(
                                _isNew ? 'إضافة الصلاة' : 'حفظ التعديل',
                              ),
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
                            ),
                          ),
                        ),
                      ),
                      if (_isNew) ...[
                        const SizedBox(width: 12),
                        SizedBox(
                          height: 48,
                          child: FilledButton(
                            onPressed: () => Navigator.pop(context),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFFF1F5F9),
                              foregroundColor: const Color(0xFF334155),
                              elevation: 0,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 20),
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
                        ),
                      ] else ...[
                        const SizedBox(width: 10),
                        Material(
                          color: const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(16),
                          child: InkWell(
                            onTap: () => Navigator.pop(context, 'delete'),
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
}
