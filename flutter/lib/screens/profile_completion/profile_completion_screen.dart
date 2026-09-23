// ─── Profile Completion Screen ───────────────────────────────────────────────
// Mirrors components/profile-completion/ProfileCompletionScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';

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
      final data = <String, dynamic>{
        'profile_completed': true,
        if (_churchCtrl.text.trim().isNotEmpty)
          'church': _churchCtrl.text.trim(),
        if (_sectCtrl.text.trim().isNotEmpty) 'sect': _sectCtrl.text.trim(),
        if (_birthDate != null)
          'birth_date': _birthDate!.toIso8601String().split('T').first,
        if (_gender != null) 'gender': _gender,
      };

      await supabase.auth.updateUser(UserAttributes(data: data));
      if (!mounted) return;
      await context.read<AuthProvider>().refresh();
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
    return Scaffold(
      backgroundColor: AppColors.authNavy,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              const Text(
                AppStrings.profileCompletionTitle,
                textDirection: TextDirection.rtl,
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Church section.
                    _SectionHeader(title: AppStrings.profileChurchSection),
                    CustomTextField(
                      label: AppStrings.profileChurch,
                      placeholder: AppStrings.profileChurchPlaceholder,
                      icon: Icons.church_outlined,
                      controller: _churchCtrl,
                    ),
                    CustomTextField(
                      label: AppStrings.profileSect,
                      placeholder: AppStrings.profileSectPlaceholder,
                      icon: Icons.account_balance_outlined,
                      controller: _sectCtrl,
                    ),

                    // Personal section.
                    _SectionHeader(title: AppStrings.profilePersonalSection),

                    // Birth date picker.
                    GestureDetector(
                      onTap: _pickDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: Row(
                          textDirection: TextDirection.rtl,
                          children: [
                            const Icon(Icons.calendar_today_outlined,
                                color: AppColors.accent, size: 20),
                            const SizedBox(width: 12),
                            Text(
                              _birthDate != null
                                  ? '${_birthDate!.day}/${_birthDate!.month}/${_birthDate!.year}'
                                  : AppStrings.profileBirthDatePlaceholder,
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                color: _birthDate != null
                                    ? AppColors.navy
                                    : Colors.grey.shade400,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Gender selector.
                    Text(
                      AppStrings.profileGender,
                      textDirection: TextDirection.rtl,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.navy),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      textDirection: TextDirection.rtl,
                      children: [
                        _GenderChip(
                          label: AppStrings.profileMale,
                          selected: _gender == 'male',
                          onTap: () => setState(() => _gender = 'male'),
                        ),
                        const SizedBox(width: 12),
                        _GenderChip(
                          label: AppStrings.profileFemale,
                          selected: _gender == 'female',
                          onTap: () => setState(() => _gender = 'female'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Submit.
                    SizedBox(
                      height: 54,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                          elevation: 4,
                        ),
                        child: _loading
                            ? const CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2)
                            : const Text(AppStrings.profileSubmit,
                                style: TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
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
      padding: const EdgeInsets.only(bottom: 12, top: 4),
      child: Text(
        title,
        textDirection: TextDirection.rtl,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: AppColors.navy,
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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.navy : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: selected ? AppColors.navy : const Color(0xFFE0E0E0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.navy,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
