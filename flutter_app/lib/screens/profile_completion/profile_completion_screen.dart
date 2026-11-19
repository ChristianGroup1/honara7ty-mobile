import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../core/offline_sync.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';
import '../../widgets/auth_screen_shell.dart';
import '../../widgets/auth_action_button.dart';
class ProfileCompletionScreen extends StatefulWidget {
  final String? userId;
  final String? email;
  final bool requiresLoginBeforeSubmit;

  const ProfileCompletionScreen({
    super.key,
    this.userId,
    this.email,
    this.requiresLoginBeforeSubmit = false,
  });

  @override
  State<ProfileCompletionScreen> createState() =>
      _ProfileCompletionScreenState();
}

class _ProfileCompletionScreenState extends State<ProfileCompletionScreen> {
  final _churchCtrl = TextEditingController();
  final _sectCtrl = TextEditingController();
  DateTime? _birthDate;
  String? _gender;
  bool _loading = false;

  @override
  void dispose() {
    _churchCtrl.dispose();
    _sectCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      helpText: AppStrings.profileBirthDate,
      locale: const Locale('ar'),
    );
    if (date != null) setState(() => _birthDate = date);
  }

  Future<void> _handleSubmit() async {
    setState(() => _loading = true);
    try {
      final user = supabase.auth.currentUser;
      if (user == null) {
        if (!mounted) return;
        await showCustomAlert(
          context: context,
          title: 'سجّل الدخول أولاً',
          message: widget.email == null
              ? 'سجّل الدخول بالحساب الذي أنشأته لإكمال بياناتك.'
              : 'تم إنشاء الحساب. أكّد بريدك الإلكتروني ثم سجّل الدخول باستخدام ${widget.email} لإكمال بياناتك.',
          type: AlertType.warning,
        );
        if (mounted) context.go(Routes.login);
        return;
      }

      final profile = <String, dynamic>{
        'church':
            _churchCtrl.text.trim().isEmpty ? null : _churchCtrl.text.trim(),
        'sect': _sectCtrl.text.trim().isEmpty ? null : _sectCtrl.text.trim(),
        'birth_date': _birthDate?.toIso8601String().split('T').first,
        'gender': _gender,
        'devotion_time': '07:00',
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      };
      final synced = await OfflineSync.saveProfile(user.id, profile);
      await OfflineSync.saveAuthMetadata(
        user.id,
        {'profile_completed': true},
      );
      if (!mounted) return;
      await context.read<AuthProvider>().refresh();
      if (!mounted) return;
      if (!synced) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'تم حفظ البيانات على الجهاز، وستتم مزامنتها عند عودة الاتصال.'),
          ),
        );
      }
      if (mounted) context.go(Routes.onboarding);
    } catch (e) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.generalError,
        message: e.toString(),
        type: AlertType.error,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScreenShell(
      title: 'خطوة أخيرة',
      subtitle: 'بيانات اختيارية تساعدنا نفهمك أكتر — تقدر تعدّلها بعدين.',
      eyebrow: 'هنا راحتي',
      onBack: () => context.pop(),
      headerExtras: Row(
        children: [
          Container(
            width: 22,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 40,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFFBBF24),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.requiresLoginBeforeSubmit) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFFFDE68A).withValues(alpha: 0.8),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded,
                      color: Color(0xFFD97706)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.email == null
                          ? 'تأكيد البريد مطلوب قبل تسجيل الدخول لإكمال الملف الشخصي.'
                          : 'أُنشئ الحساب لـ ${widget.email}. أكّد بريدك الإلكتروني ثم سجّل الدخول لحفظ بيانات الملف.',
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        color: Color(0xFF92400E),
                        height: 1.55,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const _SectionHeader(title: AppStrings.profileChurchSection),
          CustomTextField(
            label: AppStrings.profileChurch,
            placeholder: AppStrings.profileChurchPlaceholder,
            icon: Icons.church_outlined,
            optional: true,
            controller: _churchCtrl,
          ),
          CustomTextField(
            label: AppStrings.profileSect,
            placeholder: AppStrings.profileSectPlaceholder,
            icon: Icons.account_balance_outlined,
            optional: true,
            controller: _sectCtrl,
          ),
          const SizedBox(height: 8),
          const _SectionHeader(title: AppStrings.profilePersonalSection),
          Semantics(
            button: true,
            label: AppStrings.profileBirthDate,
            child: InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(14),
              child: Container(
                constraints: const BoxConstraints(minHeight: 52),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined,
                        color: Color(0xFF0284C7), size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _birthDate != null
                            ? '${_birthDate!.day}/${_birthDate!.month}/${_birthDate!.year}'
                            : AppStrings.profileBirthDatePlaceholder,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontWeight: FontWeight.w700,
                          color: _birthDate != null
                              ? const Color(0xFF0F172A)
                              : const Color(0xFF94A3B8),
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            AppStrings.profileGender,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _GenderChip(
                label: AppStrings.profileMale,
                selected: _gender == 'male',
                onTap: () => setState(() => _gender = 'male'),
              ),
              const SizedBox(width: 10),
              _GenderChip(
                label: AppStrings.profileFemale,
                selected: _gender == 'female',
                onTap: () => setState(() => _gender = 'female'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          AuthPrimaryButton(
            label: AppStrings.profileSubmit,
            onPressed: _handleSubmit,
            loading: _loading,
            icon: Icons.check_rounded,
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontFamily: AppFonts.ui,
          fontSize: 14,
          fontWeight: FontWeight.w900,
          color: Color(0xFF0F172A),
        ),
      ),
    );
  }
}

class _GenderChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _GenderChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: selected ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected
                    ? const Color(0xFF0F172A)
                    : const Color(0xFFE2E8F0),
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                color: selected ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
