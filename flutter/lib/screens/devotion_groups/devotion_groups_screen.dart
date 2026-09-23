import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';
import '../../widgets/screen_hero.dart';

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
      final group = _creating ? await _service.create(value) : await _service.join(value);
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
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: AppStrings.devotionGroupsTitle,
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  ScreenHero(
                    icon: Icons.groups_outlined,
                    badge: '${_groups.length} مجموعة خلوة',
                    eyebrow: 'مجموعات الخلوة',
                    title: 'تابعوا الخلوة مع بعض',
                    body: 'اعمل مجموعة خلوة، شارك كود الدعوة، وشوف مين أخد خلوته النهارده وقرأ في إيه.',
                  ),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: card,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: false, label: Text(AppStrings.devotionGroupsJoin)),
                            ButtonSegment(value: true, label: Text(AppStrings.devotionGroupsCreate)),
                          ],
                          selected: {_creating},
                          onSelectionChanged: (value) =>
                              setState(() => _creating = value.first),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _creating ? _name : _code,
                          textDirection: TextDirection.rtl,
                          decoration: InputDecoration(
                            hintText: _creating ? 'اسم المجموعة' : 'كود الدعوة',
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _saving ? null : _submit,
                          child: Text(_saving ? '...' : 'تأكيد'),
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
                    Text(
                      AppStrings.devotionGroupsEmpty,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: muted),
                    )
                  else
                    for (final group in _groups)
                      Card(
                        color: card,
                        child: ListTile(
                          title: Text(
                            group.name,
                            textDirection: TextDirection.rtl,
                            style: TextStyle(color: text),
                          ),
                          subtitle: Text(group.inviteCode),
                          trailing: IconButton(
                            icon: const Icon(Icons.share_outlined),
                            onPressed: () => Share.share(
                              'انضم لمجموعة ${group.name}\nhttps://honara7ty.space/devotion-group-invite?code=${group.inviteCode}',
                            ),
                          ),
                          onTap: () => context.push(
                            '${Routes.devotionGroupDetails}?groupId=${group.id}',
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
