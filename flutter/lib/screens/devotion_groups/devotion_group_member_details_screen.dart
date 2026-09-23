import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class DevotionGroupMemberDetailsScreen extends StatefulWidget {
  const DevotionGroupMemberDetailsScreen({
    super.key,
    required this.groupId,
    required this.userId,
    this.displayName,
  });

  final String groupId;
  final String userId;
  final String? displayName;

  @override
  State<DevotionGroupMemberDetailsScreen> createState() =>
      _DevotionGroupMemberDetailsScreenState();
}

class _DevotionGroupMemberDetailsScreenState
    extends State<DevotionGroupMemberDetailsScreen> {
  final _service = DevotionGroupsService();
  List<Map<String, dynamic>> _logs = [];
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final logs = await _service.memberHistory(widget.userId);
      if (mounted) setState(() => _logs = logs);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر عرض سجل العضو')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final completed = _logs.where((log) => log['completed'] == true).length;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: widget.displayName ?? 'العضو',
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        '$completed يوم مكتمل في آخر ${_logs.length} سجل',
                        textDirection: TextDirection.rtl,
                      ),
                      const SizedBox(height: 12),
                      for (final log in _logs)
                        Card(
                          color: card,
                          child: ListTile(
                            leading: Icon(
                              log['completed'] == true
                                  ? Icons.check_circle
                                  : Icons.circle_outlined,
                              color: AppColors.accent,
                            ),
                            title: Text('${log['date']}'),
                            subtitle: Text(
                              [
                                if (log['reading_book'] != null) '${log['reading_book']}',
                                if (log['reading_chapter'] != null)
                                  'إصحاح ${log['reading_chapter']}',
                              ].join(' · '),
                              textDirection: TextDirection.rtl,
                            ),
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
