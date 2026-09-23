import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class DevotionGroupPrayerRequestsScreen extends StatefulWidget {
  const DevotionGroupPrayerRequestsScreen({
    super.key,
    required this.groupId,
    this.groupName,
  });

  final String groupId;
  final String? groupName;

  @override
  State<DevotionGroupPrayerRequestsScreen> createState() =>
      _DevotionGroupPrayerRequestsScreenState();
}

class _DevotionGroupPrayerRequestsScreenState
    extends State<DevotionGroupPrayerRequestsScreen> {
  final _service = DevotionGroupsService();
  final _content = TextEditingController();
  List<GroupPrayerRequest> _requests = [];
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final requests = await _service.prayers(widget.groupId);
      if (mounted) setState(() => _requests = requests);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر تحميل طلبات الصلاة')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _add() async {
    final text = _content.text.trim();
    if (text.isEmpty) return;
    try {
      await _service.addPrayer(widget.groupId, text);
      _content.clear();
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر حفظ الطلب')),
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

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: widget.groupName ?? 'طلبات الصلاة',
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _content,
                    textDirection: TextDirection.rtl,
                    decoration: const InputDecoration(hintText: 'طلب صلاة جديد'),
                  ),
                ),
                IconButton(onPressed: _add, icon: const Icon(Icons.send)),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      if (_requests.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('لا توجد طلبات بعد')),
                        )
                      else
                        for (final request in _requests)
                          Card(
                            color: card,
                            child: ListTile(
                              title: Text(
                                request.content,
                                textDirection: TextDirection.rtl,
                                style: TextStyle(color: text),
                              ),
                              subtitle: Text(request.authorName),
                              trailing: request.authorId == _service.userId
                                  ? IconButton(
                                      icon: const Icon(Icons.delete_outline),
                                      onPressed: () async {
                                        await _service.deletePrayer(request.id);
                                        await _load();
                                      },
                                    )
                                  : null,
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
