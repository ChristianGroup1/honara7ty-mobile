import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/reading/bible_catalog.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/bible_reading_picker_sheet.dart';
import '../../widgets/youth_screen_shell.dart';
import '../../widgets/youth_sheets.dart';

class DevotionGroupDetailsScreen extends StatefulWidget {
  const DevotionGroupDetailsScreen({super.key, required this.groupId});
  final String groupId;

  @override
  State<DevotionGroupDetailsScreen> createState() =>
      _DevotionGroupDetailsScreenState();
}

class _DevotionGroupDetailsScreenState
    extends State<DevotionGroupDetailsScreen> {
  final _service = DevotionGroupsService();
  DevotionGroup? _group;
  List<GroupMemberStatus> _members = [];
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final group = await _service.byId(widget.groupId);
      final members = await _service.membersToday(
        widget.groupId,
        DevotionService.dateKey(DateTime.now()),
      );
      if (!mounted) return;
      setState(() {
        _group = group;
        _members = members;
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر فتح المجموعة')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _canLead {
    final group = _group;
    if (group == null) return false;
    if (group.ownerId == _service.userId) return true;
    return _members.any(
      (member) => member.userId == _service.userId && member.role == 'leader',
    );
  }

  Future<void> _editSharedReading() async {
    final group = _group;
    if (group == null) return;
    final books = await loadBibleCatalog();
    if (!mounted || books.isEmpty) return;
    final initialBook = books.firstWhere(
      (item) => item.name == group.sharedBook,
      orElse: () => books.firstWhere(
        (item) => (int.tryParse(item.id) ?? 0) >= 40,
        orElse: () => books.first,
      ),
    );
    final result = await showBibleReadingPlanSheet(
      context: context,
      books: books,
      initialBook: initialBook,
      initialChapters: group.sharedChapters.toSet(),
      initialDays: group.targetDays,
    );
    if (result == null) return;
    try {
      await _service.setSharedReading(
        groupId: group.id,
        book: result.book.name,
        chapters: result.chapters,
        days: result.days,
      );
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر حفظ خطة القراءة')),
        );
      }
    }
  }

  Future<void> _remind() async {
    try {
      await _service.remindPending(widget.groupId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اتبعث التذكير للي لسه ما خلّصوش')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر إرسال التذكير')),
      );
    }
  }

  Future<void> _toggleRole(GroupMemberStatus member) async {
    final next = member.role == 'leader' ? 'member' : 'leader';
    try {
      await _service.setRole(
        groupId: widget.groupId,
        userId: member.userId,
        role: next,
      );
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر تغيير الدور')),
      );
    }
  }

  Future<void> _removeMember(GroupMemberStatus member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إزالة العضو؟'),
        content: Text('سيتم إزالة ${member.displayName} من المجموعة.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('إلغاء')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('إزالة')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _service.removeMember(
          groupId: widget.groupId, memberId: member.userId);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر إزالة العضو')),
        );
      }
    }
  }

  Future<void> _showReminderHistory() async {
    try {
      final reminders = await _service.reminderHistory(widget.groupId);
      if (!mounted) return;
      final names = {
        for (final member in _members) member.userId: member.displayName,
      };
      final batches = _groupReminderBatches(reminders, names);
      await showYouthSheet<void>(
        context: context,
        builder: (context) => Directionality(
          textDirection: TextDirection.rtl,
          child: SizedBox(
            height: MediaQuery.sizeOf(context).height * 0.62,
            child: Column(
              children: [
                youthSheetHandle(),
                const Padding(
                  padding: EdgeInsets.fromLTRB(20, 4, 20, 4),
                  child: Text(
                    'سجل التذكيرات',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.fromLTRB(24, 0, 24, 14),
                  child: Text(
                    'كل دفعة اتبعتت للأعضاء اللي لسه ما خلّصوش الخلوة',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                      height: 1.4,
                    ),
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    children: [
                      if (batches.isEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 28,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(
                              color: const Color(0xFFF1F5F9),
                            ),
                          ),
                          child: const Text(
                            'لا توجد تذكيرات بعد',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ),
                      for (final batch in batches) ...[
                        _ReminderBatchCard(batch: batch),
                        const SizedBox(height: 10),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر تحميل التذكيرات')),
        );
      }
    }
  }

  Future<void> _leaveOrDelete() async {
    final group = _group;
    if (group == null) return;
    final owner = group.ownerId == _service.userId;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(owner ? 'حذف المجموعة؟' : 'مغادرة المجموعة؟'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('إلغاء')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('تأكيد')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      if (owner) {
        await _service.deleteGroup(group.id);
      } else {
        await _service.leave(group.id);
      }
      if (mounted) Navigator.of(context).maybePop();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر تنفيذ الطلب')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final border = isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final group = _group;
    final done = _members.where((member) => member.completedToday).length;

    return Scaffold(
      backgroundColor: youthBg(isDark),
      body: Stack(
        children: [
          YouthAmbientBlurs(dark: isDark),
          Column(
            children: [
              YouthStickyHeader(
                dark: isDark,
                eyebrow: 'مجموعة الخلوة',
                title: group?.name ?? 'المجموعة',
                onBack: () => Navigator.of(context).maybePop(),
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.groups_rounded,
                  color: const Color(0xFF4F46E5),
                  bg: const Color(0xFFEEF2FF),
                ),
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                          children: [
                            if (group != null) ...[
                              YouthHeroBanner(
                                badge: 'اليوم مع ربنا',
                                title:
                                    '$done من ${_members.length} أتموا الخلوة',
                                body:
                                    'كود الدعوة: ${group.inviteCode} — شارك الدعوة وخلّي المجموعة ثابتة سوا.',
                                icon: Icons.verified_rounded,
                              ),
                              const SizedBox(height: 16),
                              YouthSoftCard(
                                dark: isDark,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      group.sharedBook == null
                                          ? 'لا توجد خطة قراءة مشتركة'
                                          : '${group.sharedBook} · ${group.sharedChapters.join(', ')}'
                                              '${group.targetDays == null ? '' : ' · ${group.targetDays} يوم'}',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontWeight: FontWeight.w800,
                                        color: text,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        _ActionChip(
                                          icon: Icons.ios_share_rounded,
                                          label: 'مشاركة الدعوة',
                                          onTap: () =>
                                              showGroupInviteShareSheet(
                                            context: context,
                                            groupName: group.name,
                                            inviteCode: group.inviteCode,
                                          ),
                                        ),
                                        _ActionChip(
                                          icon: Icons.favorite_rounded,
                                          label: 'طلبات الصلاة',
                                          onTap: () => context.push(
                                            '${Routes.devotionGroupPrayerRequests}?groupId=${group.id}&groupName=${Uri.encodeComponent(group.name)}',
                                          ),
                                        ),
                                        if (_canLead)
                                          _ActionChip(
                                            icon: Icons.menu_book_rounded,
                                            label: 'خطة القراءة',
                                            onTap: _editSharedReading,
                                          ),
                                        _ActionChip(
                                          icon: Icons.logout_rounded,
                                          label:
                                              group.ownerId == _service.userId
                                                  ? 'حذف المجموعة'
                                                  : 'مغادرة',
                                          danger: true,
                                          onTap: _leaveOrDelete,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              if (_canLead) ...[
                                const SizedBox(height: 12),
                                YouthPrimaryButton(
                                  label: 'تذكير الأعضاء المتأخرين',
                                  icon: Icons.notifications_active_rounded,
                                  onTap: _remind,
                                ),
                                const SizedBox(height: 10),
                                _ReminderHistoryButton(
                                  dark: isDark,
                                  onTap: _showReminderHistory,
                                ),
                              ],
                              const SizedBox(height: 16),
                              Text(
                                'الأعضاء',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontWeight: FontWeight.w900,
                                  color: text,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                            for (final member in _members) ...[
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(24),
                                  onTap: () async {
                                    await context.push(
                                      '${Routes.devotionGroupMemberDetails}?groupId=${widget.groupId}&userId=${member.userId}&displayName=${Uri.encodeComponent(member.displayName)}',
                                    );
                                    if (mounted) _load(silent: true);
                                  },
                                  child: YouthSoftCard(
                                    dark: isDark,
                                    padding: const EdgeInsets.all(14),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 42,
                                          height: 42,
                                          decoration: BoxDecoration(
                                            color: member.completedToday
                                                ? const Color(0xFFECFDF5)
                                                : soft,
                                            borderRadius:
                                                BorderRadius.circular(14),
                                            border: Border.all(color: border),
                                          ),
                                          child: Icon(
                                            member.completedToday
                                                ? Icons.check_circle_rounded
                                                : Icons.radio_button_unchecked,
                                            color: member.completedToday
                                                ? const Color(0xFF059669)
                                                : muted,
                                            size: 20,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                member.displayName,
                                                style: TextStyle(
                                                  fontFamily: AppFonts.ui,
                                                  fontWeight: FontWeight.w900,
                                                  color: text,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              Text(
                                                groupRoleLabel(member.role),
                                                style: TextStyle(
                                                  fontFamily: AppFonts.ui,
                                                  color: muted,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (group?.ownerId == _service.userId &&
                                            member.userId != _service.userId &&
                                            member.role != 'owner')
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              TextButton(
                                                onPressed: () =>
                                                    _toggleRole(member),
                                                child: Text(
                                                  member.role == 'leader'
                                                      ? 'عضو'
                                                      : 'مشرف',
                                                  style: const TextStyle(
                                                    fontFamily: AppFonts.ui,
                                                    fontWeight: FontWeight.w800,
                                                    fontSize: 11,
                                                  ),
                                                ),
                                              ),
                                              IconButton(
                                                tooltip: 'إزالة العضو',
                                                onPressed: () =>
                                                    _removeMember(member),
                                                icon: Icon(
                                                  Icons.person_remove_outlined,
                                                  color: muted,
                                                ),
                                              ),
                                            ],
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                          ],
                        ),
                      ),
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
}

class _ReminderBatch {
  const _ReminderBatch({
    required this.message,
    required this.when,
    required this.names,
  });

  final String message;
  final DateTime? when;
  final List<String> names;
}

const _arabicMonths = [
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
];

String _formatReminderWhen(DateTime? when) {
  if (when == null) return '';
  final local = when.toLocal();
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour < 12 ? 'ص' : 'م';
  return '${local.day} ${_arabicMonths[local.month - 1]} · $hour12:$minute $period';
}

String _recipientLine(List<String> names) {
  if (names.isEmpty) return 'اتبعِت للأعضاء المتأخرين';
  if (names.length <= 3) return 'لـ ${names.join('، ')}';
  final shown = names.take(3).join('، ');
  final rest = names.length - 3;
  return 'لـ $shown و$rest غيرهم';
}

List<_ReminderBatch> _groupReminderBatches(
  List<Map<String, dynamic>> reminders,
  Map<String, String> names,
) {
  final batches = <_ReminderBatch>[];
  for (final reminder in reminders) {
    final message = (reminder['message'] ?? '').toString().trim();
    final created =
        DateTime.tryParse((reminder['created_at'] ?? '').toString());
    final recipientId = (reminder['recipient_id'] ?? '').toString();
    final name = names[recipientId] ?? 'عضو';
    final sameBatch = batches.isNotEmpty &&
        batches.last.message == message &&
        _sameReminderMinute(batches.last.when, created);
    if (sameBatch) {
      final current = batches.removeLast();
      batches.add(
        _ReminderBatch(
          message: current.message,
          when: current.when,
          names: [...current.names, name],
        ),
      );
    } else {
      batches.add(
        _ReminderBatch(
          message: message.isEmpty ? 'تذكير الخلوة' : message,
          when: created,
          names: [name],
        ),
      );
    }
  }
  return batches;
}

bool _sameReminderMinute(DateTime? a, DateTime? b) {
  if (a == null || b == null) return a == b;
  final left = a.toLocal();
  final right = b.toLocal();
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day &&
      left.hour == right.hour &&
      left.minute == right.minute;
}

class _ReminderHistoryButton extends StatelessWidget {
  const _ReminderHistoryButton({required this.dark, required this.onTap});

  final bool dark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fill = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final color = dark ? AppColors.darkText : const Color(0xFF0F172A);
    return Material(
      color: fill,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 15),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history_rounded, size: 18, color: color),
                const SizedBox(width: 8),
                Text(
                  'سجل التذكيرات',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: color,
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

class _ReminderBatchCard extends StatelessWidget {
  const _ReminderBatchCard({required this.batch});

  final _ReminderBatch batch;

  @override
  Widget build(BuildContext context) {
    final when = _formatReminderWhen(batch.when);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F9FF),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.notifications_active_rounded,
              color: Color(0xFF0369A1),
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  batch.message,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    fontSize: 13,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _recipientLine(batch.names),
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0369A1),
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
                if (when.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    when,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? const Color(0xFFE11D48) : const Color(0xFF0369A1);
    final bg = danger ? const Color(0xFFFFF1F2) : const Color(0xFFF0F9FF);
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
