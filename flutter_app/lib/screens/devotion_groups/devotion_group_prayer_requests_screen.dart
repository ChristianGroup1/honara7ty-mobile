import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/youth_screen_shell.dart';

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
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final border = isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9);

    return Scaffold(
      backgroundColor: youthBg(isDark),
      body: Stack(
        children: [
          YouthAmbientBlurs(dark: isDark),
          Column(
            children: [
              YouthStickyHeader(
                dark: isDark,
                eyebrow: 'شركة الصلاة',
                title: widget.groupName ?? 'طلبات الصلاة',
                onBack: () => Navigator.of(context).maybePop(),
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.favorite_rounded,
                  color: const Color(0xFFE11D48),
                  bg: const Color(0xFFFFF1F2),
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                  children: [
                    const YouthHeroBanner(
                      badge: 'صلّوا بعض',
                      title: 'طلبات صلاة المجموعة',
                      body:
                          'شارك طلباتك هنا وشارك احتياجك مع المجموعة في جو من الأمانة والمحبة.',
                      icon: Icons.volunteer_activism_rounded,
                    ),
                    const SizedBox(height: 16),
                    YouthSoftCard(
                      dark: isDark,
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _content,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontWeight: FontWeight.w600,
                                color: text,
                              ),
                              decoration: InputDecoration(
                                hintText: 'طلب صلاة جديد',
                                filled: true,
                                fillColor: soft,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: border),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: border),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 12,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Material(
                            color: const Color(0xFF4F46E5),
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              onTap: _add,
                              borderRadius: BorderRadius.circular(14),
                              child: const SizedBox(
                                width: 48,
                                height: 48,
                                child: Icon(
                                  Icons.send_rounded,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_loading)
                      const Center(child: CircularProgressIndicator())
                    else if (_requests.isEmpty)
                      YouthSoftCard(
                        dark: isDark,
                        child: Text(
                          'لا توجد طلبات بعد',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            color: muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                    else
                      for (final request in _requests) ...[
                        YouthSoftCard(
                          dark: isDark,
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF1F2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.favorite_rounded,
                                  size: 18,
                                  color: Color(0xFFE11D48),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      request.content,
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        color: text,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                        height: 1.45,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      request.authorName,
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
                              if (request.authorId == _service.userId)
                                IconButton(
                                  onPressed: () async {
                                    await _service.deletePrayer(request.id);
                                    await _load();
                                  },
                                  icon: Icon(
                                    Icons.delete_outline_rounded,
                                    color: muted,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                      ],
                  ],
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
