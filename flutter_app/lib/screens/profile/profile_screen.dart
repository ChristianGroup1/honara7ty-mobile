import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/offline_sync.dart';
import '../../core/strings.dart';
import '../../core/supabase_service.dart';
import '../../core/theme.dart';
import '../../features/journal/devotion_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';

const _badgeDayThresholds = [7, 14, 30, 60, 90, 180, 365, 730];

const _levelTitles = [
  'بداية الطريق',
  'مثابر',
  'ثابت',
  'أمين',
  'مجاهد',
  'راسخ',
  'قدوة',
  'نور للعالم',
];

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
  var _dirty = false;

  String _snapName = '';
  String _snapPhone = '';
  String _snapChurch = '';
  String _snapSect = '';
  String? _snapGender;
  DateTime? _snapBirth;

  @override
  void initState() {
    super.initState();
    for (final c in [_name, _phone, _church, _sect]) {
      c.addListener(_markDirty);
    }
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _church, _sect]) {
      c.removeListener(_markDirty);
      c.dispose();
    }
    super.dispose();
  }

  void _markDirty() {
    final dirty = _name.text != _snapName ||
        _phone.text != _snapPhone ||
        _church.text != _snapChurch ||
        _sect.text != _snapSect ||
        _gender != _snapGender ||
        _birthDate != _snapBirth;
    if (dirty != _dirty && mounted) setState(() => _dirty = dirty);
  }

  void _captureSnapshot() {
    _snapName = _name.text;
    _snapPhone = _phone.text;
    _snapChurch = _church.text;
    _snapSect = _sect.text;
    _snapGender = _gender;
    _snapBirth = _birthDate;
    _dirty = false;
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
    _captureSnapshot();
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _pickBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(2000),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _birthDate = picked);
      _markDirty();
    }
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
        'birth_date':
            _birthDate == null ? null : DevotionService.dateKey(_birthDate!),
        'gender': _gender,
        'updated_at': DateTime.now().toIso8601String(),
      };
      final metadataSynced =
          await OfflineSync.saveAuthMetadata(user.id, metadata);
      final profileSynced = await OfflineSync.saveProfile(user.id, profile);
      if (!mounted) return;
      _captureSnapshot();
      setState(() {});
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

  Future<void> _logout() async {
    await context.read<AuthProvider>().signOut();
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

  String _initials(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'هـ';
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return (parts[0].characters.first + parts[1].characters.first)
        .toUpperCase();
  }

  String _comma(int n) {
    final s = '$n';
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final fromEnd = s.length - i;
      buf.write(s[i]);
      if (fromEnd > 1 && fromEnd % 3 == 1) buf.write(',');
    }
    return buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final email = supabase.auth.currentUser?.email ?? '';
    final level = _days ~/ 7 + 1;
    final title =
        _levelTitles[(level - 1).clamp(0, _levelTitles.length - 1).toInt()];
    final into = _days % 7;
    final daysToNext = into == 0 && _days > 0 ? 7 : (7 - into);
    final progress = into == 0 && _days > 0 ? 1.0 : into / 7.0;
    final nextLevelXpBonus = 100 * (level + 1);
    final badges =
        _badgeDayThresholds.where((d) => _streak >= d).length;
    final name = _name.text.trim().isEmpty ? 'هنا راحتي' : _name.text.trim();
    final night = context.watch<ThemeProvider>().isNightMode;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          _ProfileHeader(
            dark: isDark,
            onBack: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('${Routes.mainTabs}?tab=3');
              }
            },
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    children: [
                      _IdentityCard(
                        name: name,
                        email: email,
                        initials: _initials(name),
                      ),
                      const SizedBox(height: 16),
                      _LevelCard(
                        level: level,
                        title: title,
                        xp: _xp,
                        xpLabel: _comma(_xp),
                        progress: progress,
                        daysToNext: daysToNext,
                        nextXpBonus: nextLevelXpBonus,
                        days: _days,
                        streak: _streak,
                        badges: badges,
                      ),
                      const SizedBox(height: 16),
                      _FormSection(
                        icon: Icons.person_rounded,
                        iconBg: const Color(0xFFF0F9FF),
                        iconColor: const Color(0xFF0284C7),
                        title: 'البيانات الأساسية',
                        subtitle:
                            'يمكنك تعديل الاسم والهاتف والبيانات الشخصية من هنا.',
                        children: [
                          _LabeledField(
                            label: AppStrings.profileName,
                            controller: _name,
                            icon: Icons.person_outline_rounded,
                          ),
                          _LabeledField(
                            label: 'البريد الإلكتروني',
                            value: email,
                            icon: Icons.mail_outline_rounded,
                            readOnly: true,
                            badge: 'ثابت',
                          ),
                          _LabeledField(
                            label: AppStrings.profilePhone,
                            controller: _phone,
                            icon: Icons.phone_outlined,
                            keyboard: TextInputType.phone,
                            ltr: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _FormSection(
                        icon: Icons.church_rounded,
                        iconBg: const Color(0xFFEEF2FF),
                        iconColor: const Color(0xFF4F46E5),
                        title: 'الكنيسة والانتماء',
                        subtitle:
                            'أضف معلوماتك الكنسية لتبقى بياناتك مكتملة.',
                        children: [
                          _LabeledField(
                            label: AppStrings.profileChurch,
                            controller: _church,
                            icon: Icons.church_outlined,
                            optional: true,
                          ),
                          _LabeledField(
                            label: AppStrings.profileSect,
                            controller: _sect,
                            icon: Icons.groups_outlined,
                            optional: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _FormSection(
                        icon: Icons.calendar_month_rounded,
                        iconBg: const Color(0xFFFFFBEB),
                        iconColor: const Color(0xFFD97706),
                        title: 'بيانات شخصية',
                        subtitle: 'اضبط تاريخ الميلاد والجنس من هنا.',
                        children: [
                          const Text(
                            AppStrings.profileBirthDate,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Material(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              onTap: _pickBirthDate,
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFFE2E8F0)
                                        .withValues(alpha: 0.8),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.event_rounded,
                                      size: 18,
                                      color: Color(0xFF94A3B8),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _birthDate == null
                                            ? 'اختر تاريخ الميلاد'
                                            : DevotionService.dateKey(
                                                _birthDate!),
                                        style: TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: _birthDate == null
                                              ? const Color(0xFF64748B)
                                              : const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ),
                                    const Icon(
                                      Icons.expand_more_rounded,
                                      size: 18,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            AppStrings.profileGender,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Expanded(
                                child: _GenderChip(
                                  label: AppStrings.profileMale,
                                  icon: Icons.male_rounded,
                                  selected: _gender == 'male',
                                  onTap: () {
                                    setState(() => _gender = 'male');
                                    _markDirty();
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _GenderChip(
                                  label: AppStrings.profileFemale,
                                  icon: Icons.female_rounded,
                                  selected: _gender == 'female',
                                  onTap: () {
                                    setState(() => _gender = 'female');
                                    _markDirty();
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _dirty
                                ? Icons.edit_note_rounded
                                : Icons.save_as_rounded,
                            size: 16,
                            color: const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _dirty ? 'هناك تغييرات غير محفوظة' : 'لا توجد تغييرات',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      if (_dirty) ...[
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _saving ? null : _save,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF0F172A),
                              foregroundColor: Colors.white,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: Text(
                              _saving
                                  ? 'جارٍ الحفظ...'
                                  : AppStrings.profileSave,
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF43F5E), Color(0xFFE11D48)],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF43F5E)
                                    .withValues(alpha: 0.22),
                                blurRadius: 12,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: _logout,
                              borderRadius: BorderRadius.circular(16),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 14),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.logout_rounded,
                                        color: Colors.white, size: 18),
                                    SizedBox(width: 8),
                                    Text(
                                      'خروج',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _deleteAccount,
                          icon: const Icon(Icons.person_remove_rounded,
                              size: 18),
                          label: const Text(
                            'حذف الحساب نهائياً',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFE11D48),
                            backgroundColor: const Color(0xFFFFF1F2),
                            side: BorderSide(
                              color: const Color(0xFFFECDD3)
                                  .withValues(alpha: 0.8),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
      bottomNavigationBar: YouthAppTabBar(
        isDark: night,
        currentIndex: -1,
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.dark, required this.onBack});
  final bool dark;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final chipBg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: surface.withValues(alpha: 0.95),
        border: Border(bottom: BorderSide(color: border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Material(
            color: chipBg,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: onBack,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: border),
                ),
                child: Icon(Icons.arrow_back_rounded,
                    size: 20, color: titleColor),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'إدارة الحساب',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  AppStrings.profileTitle,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: titleColor,
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

class _IdentityCard extends StatelessWidget {
  const _IdentityCard({
    required this.name,
    required this.email,
    required this.initials,
  });

  final String name;
  final String email;
  final String initials;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
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
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF0EA5E9), Color(0xFF4F46E5)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.25),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  left: 0,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 14,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            name,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
            ),
          ),
          if (email.isNotEmpty)
            Text(
              email,
              textAlign: TextAlign.center,
              textDirection: TextDirection.ltr,
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF94A3B8),
              ),
            ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.7),
              ),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_done_rounded,
                    size: 16, color: Color(0xFF0EA5E9)),
                SizedBox(width: 6),
                Text(
                  'بياناتك محفوظة على الحساب',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF475569),
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

class _LevelCard extends StatelessWidget {
  const _LevelCard({
    required this.level,
    required this.title,
    required this.xp,
    required this.xpLabel,
    required this.progress,
    required this.daysToNext,
    required this.nextXpBonus,
    required this.days,
    required this.streak,
    required this.badges,
  });

  final int level;
  final String title;
  final int xp;
  final String xpLabel;
  final double progress;
  final int daysToNext;
  final int nextXpBonus;
  final int days;
  final int streak;
  final int badges;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF020617), Color(0xFF0F172A), Color(0xFF1E1B4B)],
        ),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF020617).withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: -40,
            left: -40,
            child: Container(
              width: 112,
              height: 112,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.1),
                              ),
                            ),
                            child: const Text(
                              'المستوى الحالي',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFFCD34D),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'المستوى $level • $title',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        color:
                            const Color(0xFFF59E0B).withValues(alpha: 0.2),
                        border: Border.all(
                          color:
                              const Color(0xFFFBBF24).withValues(alpha: 0.3),
                        ),
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Color(0xFFFCD34D),
                        size: 22,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'كل يوم خلوة بيزودك نقط، وكل 7 أيام بيوصل مستوى جديد وتاخد مكافأة نقط.',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFCBD5E1),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(
                            '$xpLabel XP',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFFCD34D),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            'فاضل $daysToNext يوم للمستوى الجاي • ${_comma(nextXpBonus)}+ XP',
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
                      ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: progress.clamp(0.0, 1.0),
                          minHeight: 8,
                          backgroundColor:
                              Colors.white.withValues(alpha: 0.1),
                          valueColor: const AlwaysStoppedAnimation(
                            Color(0xFFFBBF24),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _mini('$days', 'أيام الخلوة'),
                    const SizedBox(width: 8),
                    _mini('$streak', 'سلسلة متواصلة'),
                    const SizedBox(width: 8),
                    _mini('$badges', 'أوسمة'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _comma(int n) {
    final s = '$n';
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final fromEnd = s.length - i;
      buf.write(s[i]);
      if (fromEnd > 1 && fromEnd % 3 == 1) buf.write(',');
    }
    return buf.toString();
  }

  Widget _mini(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            Text(
              label,
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
    );
  }
}

class _FormSection extends StatelessWidget {
  const _FormSection({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
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
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      subtitle,
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
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.icon,
    this.controller,
    this.value,
    this.keyboard,
    this.readOnly = false,
    this.optional = false,
    this.badge,
    this.ltr = false,
  });

  final String label;
  final IconData icon;
  final TextEditingController? controller;
  final String? value;
  final TextInputType? keyboard;
  final bool readOnly;
  final bool optional;
  final String? badge;
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF64748B),
                ),
              ),
              const Spacer(),
              if (optional || badge != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    badge ?? AppStrings.profileOptional,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            controller: controller,
            readOnly: readOnly,
            enabled: !readOnly || controller != null,
            keyboardType: keyboard,
            textDirection: ltr ? TextDirection.ltr : TextDirection.rtl,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: readOnly
                  ? const Color(0xFF475569)
                  : const Color(0xFF0F172A),
            ),
            decoration: InputDecoration(
              hintText: readOnly ? value : null,
              filled: true,
              fillColor: readOnly
                  ? const Color(0xFFF1F5F9).withValues(alpha: 0.7)
                  : const Color(0xFFF8FAFC),
              suffixIcon: Icon(icon, size: 18, color: const Color(0xFF94A3B8)),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(
                  color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(
                  color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xFFF59E0B)),
              ),
              disabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(
                  color: const Color(0xFFE2E8F0).withValues(alpha: 0.6),
                ),
              ),
            ),
          ),
          if (readOnly && controller == null && value != null)
            // Ensure email shows when no controller
            const SizedBox.shrink(),
        ],
      ),
    );
  }
}

// Fix: for read-only email we need to show the value in the field.
// Override build path when value is set without controller.
class _GenderChip extends StatelessWidget {
  const _GenderChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFF59E0B) : const Color(0xFFF8FAFC),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? const Color(0xFFF59E0B).withValues(alpha: 0.2)
                  : const Color(0xFFE2E8F0).withValues(alpha: 0.7),
              width: selected ? 2 : 1,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
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
                color: selected ? Colors.white : const Color(0xFF475569),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                  color: selected ? Colors.white : const Color(0xFF475569),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
