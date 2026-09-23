import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';

import '../../core/offline_sync.dart';
import '../../core/strings.dart';
import '../../core/supabase_service.dart';
import '../../core/theme.dart';
import '../../features/journal/devotion_service.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _church = TextEditingController();
  final _sect = TextEditingController();
  String? _gender;
  DateTime? _birthDate;
  var _loading = true;
  var _saving = false;
  var _xp = 0;
  var _streak = 0;
  var _days = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _church.dispose();
    _sect.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = supabase.auth.currentUser;
    final meta = user?.userMetadata ?? {};
    _name.text = (meta['full_name'] as String?) ?? '';
    _phone.text = (meta['phone'] as String?) ?? '';
    try {
      if (user != null) {
        final profile = await supabase
            .from('profiles')
            .select('church, sect, birth_date, gender')
            .eq('id', user.id)
            .maybeSingle();
        _church.text = (profile?['church'] as String?) ?? '';
        _sect.text = (profile?['sect'] as String?) ?? '';
        _gender = profile?['gender'] as String?;
        final birth = profile?['birth_date'] as String?;
        if (birth != null && birth.isNotEmpty) {
          _birthDate = DateTime.tryParse(birth);
        }
        final logs = await DevotionService().completedLogs();
        final dates = logs.map((log) => log['date'] as String);
        _days = dates.length;
        _streak = computeStreak(dates);
        _xp = computeTotalXp(_days);
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _pickBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(2000),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _birthDate = picked);
  }

  Future<void> _save() async {
    final user = supabase.auth.currentUser;
    final name = _name.text.trim();
    if (user == null || name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى إدخال الاسم')),
      );
      return;
    }
    final phone = _phone.text.trim();
    if (phone.isNotEmpty && !RegExp(r'^\+?[0-9]{9,15}$').hasMatch(phone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى إدخال رقم هاتف صحيح')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final metadata = {
        'full_name': name,
        'phone': phone.isEmpty ? null : phone,
      };
      final profile = {
        'church': _church.text.trim().isEmpty ? null : _church.text.trim(),
        'sect': _sect.text.trim().isEmpty ? null : _sect.text.trim(),
        'birth_date': _birthDate == null
            ? null
            : DevotionService.dateKey(_birthDate!),
        'gender': _gender,
        'updated_at': DateTime.now().toIso8601String(),
      };
      final metadataSynced = await OfflineSync.saveAuthMetadata(user.id, metadata);
      final profileSynced = await OfflineSync.saveProfile(user.id, profile);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            metadataSynced && profileSynced
                ? AppStrings.profileSaved
                : offlineSavedMessage,
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر حفظ البيانات')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('حذف الحساب؟'),
        content: const Text(
          'سيتم حذف حسابك وبياناتك نهائيًا، ولا يمكن التراجع عن هذه الخطوة.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('حذف نهائي'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await supabase.functions.invoke('delete-account', body: {});
      if (!mounted) return;
      await context.read<AuthProvider>().signOut();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر حذف الحساب')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final level = _days ~/ 7 + 1;
    const titles = [
      'بداية الطريق',
      'مثابر',
      'ثابت',
      'أمين',
      'مجاهد',
      'راسخ',
      'قدوة',
      'نور للعالم',
    ];
    final title = titles[(level - 1).clamp(0, titles.length - 1).toInt()];
    final into = _days % 7;
    final progress = into / 7;
    final name = _name.text.trim().isEmpty ? 'هنا راحتي' : _name.text.trim();
    final initials = name.characters.first;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(title: AppStrings.profileTitle),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(30),
                          gradient: LinearGradient(
                            begin: Alignment.topRight,
                            end: Alignment.bottomLeft,
                            colors: isDark
                                ? AppColors.headerGradientDark
                                : AppColors.headerGradientLight,
                          ),
                        ),
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 46,
                              backgroundColor: AppColors.accent,
                              child: Text(
                                initials,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 30,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              supabase.auth.currentUser?.email ?? '',
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.72)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: card,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'مستواك الروحي',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'كل يوم خلوة بيزوّدك نقط، وكل ٧ أيام بتوصل مستوى جديد وتاخد مكافأة نقط.',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(color: muted, fontSize: 13, height: 1.4),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'المستوى $level · $title',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                color: text,
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text('$_xp XP', textDirection: TextDirection.rtl),
                            const SizedBox(height: 12),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(99),
                              child: LinearProgressIndicator(
                                value: progress == 0 && _days > 0 ? 1 : progress,
                                minHeight: 8,
                                backgroundColor: const Color(0xFFE3E8F1),
                                color: AppColors.accent,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                _stat('$_days', 'أيام الخلوة'),
                                _stat('$_streak', 'سلسلة متواصلة'),
                                _stat('$level', 'مستوى'),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Align(
                        alignment: Alignment.centerRight,
                        child: Text('بياناتك محفوظة على الحساب', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(height: 12),
                      _section(
                        card,
                        'البيانات الأساسية',
                        'يمكنك تعديل الاسم والهاتف والبيانات الشخصية من هنا.',
                        [
                          _field(AppStrings.profileName, _name),
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('البريد الإلكتروني', textDirection: TextDirection.rtl),
                            subtitle: Text(supabase.auth.currentUser?.email ?? ''),
                          ),
                          _field(AppStrings.profilePhone, _phone, keyboard: TextInputType.phone),
                        ],
                      ),
                      _section(
                        card,
                        'الكنيسة والانتماء',
                        'أضف معلوماتك الكنسية لتبقى بياناتك مكتملة.',
                        [
                          _field(AppStrings.profileChurch, _church),
                          _field(AppStrings.profileSect, _sect),
                        ],
                      ),
                      _section(
                        card,
                        'بيانات شخصية ',
                        'اضبط تاريخ الميلاد والجنس من هنا.',
                        [
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text(AppStrings.profileBirthDate, textDirection: TextDirection.rtl),
                            subtitle: Text(
                              _birthDate == null
                                  ? AppStrings.profileBirthDatePlaceholder
                                  : DevotionService.dateKey(_birthDate!),
                              textDirection: TextDirection.rtl,
                            ),
                            onTap: _pickBirthDate,
                          ),
                          SegmentedButton<String?>(
                            segments: const [
                              ButtonSegment(value: 'male', label: Text(AppStrings.profileMale)),
                              ButtonSegment(value: 'female', label: Text(AppStrings.profileFemale)),
                            ],
                            selected: {_gender},
                            emptySelectionAllowed: true,
                            onSelectionChanged: (value) =>
                                setState(() => _gender = value.isEmpty ? null : value.first),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(_saving ? 'جارٍ الحفظ...' : AppStrings.profileSave),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: () => context.push(Routes.devotionGroups),
                        icon: const Icon(Icons.group_outlined),
                        label: const Text(AppStrings.profileDevotionGroups),
                      ),
                      TextButton(
                        onPressed: _deleteAccount,
                        child: const Text(
                          'حذف الحساب نهائياً',
                          style: TextStyle(color: Colors.red, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _section(Color card, String title, String subtitle, List<Widget> children) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 4),
          Text(subtitle, textAlign: TextAlign.right, style: TextStyle(color: mutedColor(context), fontSize: 13)),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }

  Color mutedColor(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return dark ? AppColors.darkMutedText : AppColors.lightMutedText;
  }

  Widget _stat(String value, String label) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    TextInputType? keyboard,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        keyboardType: keyboard,
        textDirection: TextDirection.rtl,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}
