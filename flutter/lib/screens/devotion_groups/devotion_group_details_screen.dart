import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../features/journal/devotion_service.dart';
import '../../features/reading/bible_catalog.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

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

  Future<void> _load() async {
    setState(() => _loading = true);
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
    var book = books.firstWhere(
      (item) => item.name == group.sharedBook,
      orElse: () => books.first,
    );
    final chapters = group.sharedChapters.toSet();
    final days =
        TextEditingController(text: group.targetDays?.toString() ?? '30');
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheet) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<BibleBookInfo>(
                  isExpanded: true,
                  value: book,
                  items: [
                    for (final item in books)
                      DropdownMenuItem(value: item, child: Text(item.name)),
                  ],
                  onChanged: (value) => setSheet(() => book = value ?? book),
                ),
                SizedBox(
                  height: 160,
                  child: SingleChildScrollView(
                    child: Wrap(
                      spacing: 6,
                      children: [
                        for (var chapter = 1;
                            chapter <= book.chapters;
                            chapter++)
                          FilterChip(
                            label: Text('$chapter'),
                            selected: chapters.contains(chapter),
                            onSelected: (selected) => setSheet(() {
                              if (selected) {
                                chapters.add(chapter);
                              } else {
                                chapters.remove(chapter);
                              }
                            }),
                          ),
                      ],
                    ),
                  ),
                ),
                TextField(
                  controller: days,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'عدد الأيام'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('حفظ الخطة'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (saved != true) {
      days.dispose();
      return;
    }
    try {
      await _service.setSharedReading(
        groupId: group.id,
        book: book.name,
        chapters: chapters.toList()..sort(),
        days: int.tryParse(days.text),
      );
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر حفظ خطة القراءة')),
        );
      }
    }
    days.dispose();
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
      await showModalBottomSheet<void>(
        context: context,
        builder: (context) => Directionality(
          textDirection: TextDirection.rtl,
          child: SafeArea(
            child: ListView(
              shrinkWrap: true,
              children: [
                const ListTile(title: Text('آخر التذكيرات')),
                if (reminders.isEmpty)
                  const ListTile(title: Text('لا توجد تذكيرات بعد')),
                for (final reminder in reminders)
                  ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text((reminder['message'] ?? '').toString()),
                    subtitle: Text((reminder['created_at'] ?? '').toString()),
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
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final group = _group;
    final done = _members.where((member) => member.completedToday).length;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: group?.name ?? 'المجموعة',
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (group != null)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: card,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  '$done من ${_members.length} أتموا الخلوة اليوم',
                                  textDirection: TextDirection.rtl,
                                  style: TextStyle(
                                      color: text, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text('كود الدعوة: ${group.inviteCode}',
                                    textDirection: TextDirection.rtl),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => Share.share(
                                        'انضم لمجموعة ${group.name}\nhttps://honara7ty.space/devotion-group-invite?code=${group.inviteCode}',
                                      ),
                                      icon: const Icon(Icons.share_outlined),
                                      label: const Text('مشاركة الدعوة'),
                                    ),
                                    TextButton.icon(
                                      onPressed: () => context.push(
                                        '${Routes.devotionGroupPrayerRequests}?groupId=${group.id}&groupName=${Uri.encodeComponent(group.name)}',
                                      ),
                                      icon: const Icon(Icons.favorite_outline),
                                      label: const Text('طلبات الصلاة'),
                                    ),
                                    TextButton(
                                      onPressed: _leaveOrDelete,
                                      child: Text(
                                        group.ownerId == _service.userId
                                            ? 'حذف المجموعة'
                                            : 'مغادرة',
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  group.sharedBook == null
                                      ? 'لا توجد خطة قراءة مشتركة'
                                      : '${group.sharedBook} · ${group.sharedChapters.join(', ')}'
                                          '${group.targetDays == null ? '' : ' · ${group.targetDays} يوم'}',
                                  textDirection: TextDirection.rtl,
                                ),
                                if (_canLead)
                                  Wrap(
                                    children: [
                                      TextButton(
                                        onPressed: _editSharedReading,
                                        child:
                                            const Text('خطة القراءة المشتركة'),
                                      ),
                                      TextButton(
                                        onPressed: _remind,
                                        child: const Text('تذكير المتأخرين'),
                                      ),
                                      TextButton(
                                        onPressed: _showReminderHistory,
                                        child: const Text('سجل التذكيرات'),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 12),
                        for (final member in _members)
                          Card(
                            color: card,
                            child: ListTile(
                              leading: Icon(
                                member.completedToday
                                    ? Icons.check_circle
                                    : Icons.radio_button_unchecked,
                                color: member.completedToday
                                    ? const Color(0xFF2E8B57)
                                    : AppColors.accent,
                              ),
                              title: Text(member.displayName,
                                  textDirection: TextDirection.rtl),
                              subtitle: Text(groupRoleLabel(member.role)),
                              trailing: group?.ownerId == _service.userId &&
                                      member.userId != _service.userId &&
                                      member.role != 'owner'
                                  ? Wrap(
                                      spacing: 2,
                                      children: [
                                        TextButton(
                                          onPressed: () => _toggleRole(member),
                                          child: Text(member.role == 'leader'
                                              ? 'عضو'
                                              : 'مشرف'),
                                        ),
                                        IconButton(
                                          tooltip: 'إزالة العضو',
                                          onPressed: () =>
                                              _removeMember(member),
                                          icon: const Icon(
                                              Icons.person_remove_outlined),
                                        ),
                                      ],
                                    )
                                  : null,
                              onTap: () => context.push(
                                '${Routes.devotionGroupMemberDetails}?groupId=${widget.groupId}&userId=${member.userId}&displayName=${Uri.encodeComponent(member.displayName)}',
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
