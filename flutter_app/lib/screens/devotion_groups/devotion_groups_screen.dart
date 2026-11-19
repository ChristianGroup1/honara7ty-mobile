import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';
import '../../widgets/youth_sheets.dart';

class DevotionGroupsScreen extends StatefulWidget {
  const DevotionGroupsScreen({super.key});

  @override
  State<DevotionGroupsScreen> createState() => _DevotionGroupsScreenState();
}

class _DevotionGroupsScreenState extends State<DevotionGroupsScreen> {
  final _service = DevotionGroupsService();
  final _name = TextEditingController();
  final _code = TextEditingController();
  var _creating = false;
  var _loading = true;
  var _saving = false;
  List<DevotionGroup> _groups = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final groups = await _service.mine();
      if (mounted) setState(() => _groups = groups);
    } catch (_) {
      _snack('تعذر تحميل المجموعات');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _submit() async {
    final value = (_creating ? _name : _code).text.trim();
    if (value.isEmpty) return;
    setState(() => _saving = true);
    try {
      final group =
          _creating ? await _service.create(value) : await _service.join(value);
      _name.clear();
      _code.clear();
      if (!mounted) return;
      context.push('${Routes.devotionGroupDetails}?groupId=${group.id}');
      await _load();
    } catch (_) {
      _snack(_creating ? 'تعذر إنشاء المجموعة' : 'كود الدعوة غير صحيح');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = youthBg(isDark);
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final soft = isDark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final border = isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          YouthAmbientBlurs(dark: isDark),
          Column(
            children: [
              YouthStickyHeader(
                dark: isDark,
                eyebrow: 'شركة وثبوت',
                title: AppStrings.devotionGroupsTitle,
                onBack: () => Navigator.of(context).maybePop(),
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.groups_rounded,
                  color: const Color(0xFF4F46E5),
                  bg: const Color(0xFFEEF2FF),
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                    children: [
                      YouthHeroBanner(
                        badge: '${_groups.length} مجموعة خلوة',
                        title: 'تابعوا الخلوة مع بعض',
                        body:
                            'اعمل مجموعة، شارك كود الدعوة، وشوف مين أخد خلوته النهاردة وقرأ في إيه.',
                        icon: Icons.groups_rounded,
                      ),
                      const SizedBox(height: 16),
                      YouthSoftCard(
                        dark: isDark,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: soft,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  _ModeTab(
                                    dark: isDark,
                                    selected: !_creating,
                                    label: AppStrings.devotionGroupsJoin,
                                    onTap: () =>
                                        setState(() => _creating = false),
                                  ),
                                  _ModeTab(
                                    dark: isDark,
                                    selected: _creating,
                                    label: AppStrings.devotionGroupsCreate,
                                    onTap: () =>
                                        setState(() => _creating = true),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 14),
                            TextField(
                              controller: _creating ? _name : _code,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontWeight: FontWeight.w700,
                                color: text,
                              ),
                              decoration: InputDecoration(
                                hintText: _creating
                                    ? 'اسم المجموعة'
                                    : 'كود الدعوة',
                                filled: true,
                                fillColor: soft,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(color: border),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(color: border),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            YouthPrimaryButton(
                              label: _creating
                                  ? 'إنشاء المجموعة'
                                  : 'الانضمام للمجموعة',
                              icon: _creating
                                  ? Icons.add_rounded
                                  : Icons.login_rounded,
                              busy: _saving,
                              onTap: _submit,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (_groups.isEmpty)
                        YouthSoftCard(
                          dark: isDark,
                          child: Text(
                            AppStrings.devotionGroupsEmpty,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              color: muted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      else
                        for (final group in _groups) ...[
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(24),
                              onTap: () => context.push(
                                '${Routes.devotionGroupDetails}?groupId=${group.id}',
                              ),
                              child: YouthSoftCard(
                                dark: isDark,
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF4F46E5)
                                            .withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: const Icon(
                                        Icons.groups_rounded,
                                        color: Color(0xFF4F46E5),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            group.name,
                                            style: TextStyle(
                                              fontFamily: AppFonts.ui,
                                              color: text,
                                              fontWeight: FontWeight.w900,
                                              fontSize: 14,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'كود الدعوة: ${group.inviteCode}',
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
                                    IconButton(
                                      onPressed: () => showGroupInviteShareSheet(
                                        context: context,
                                        groupName: group.name,
                                        inviteCode: group.inviteCode,
                                      ),
                                      icon: Icon(
                                        Icons.ios_share_rounded,
                                        color: muted,
                                      ),
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

class _ModeTab extends StatelessWidget {
  const _ModeTab({
    required this.dark,
    required this.selected,
    required this.label,
    required this.onTap,
  });

  final bool dark;
  final bool selected;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: selected
            ? (dark ? AppColors.darkCard : Colors.white)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
                color: selected
                    ? (dark ? AppColors.darkText : const Color(0xFF0F172A))
                    : (dark
                        ? AppColors.darkMutedText
                        : const Color(0xFF64748B)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
