// ─── Signup Screen ───────────────────────────────────────────────────────────
// Mirrors components/signup/SignupScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../features/auth/auth_errors.dart';
import '../../features/auth/google_auth.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/auth_screen_shell.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  final Map<String, String> _errors = {
    'name': '',
    'email': '',
    'phone': '',
    'password': '',
    'confirm': '',
  };

  bool _loading = false;

  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  );
  static final _phoneRegex = RegExp(r'^\+?[0-9]{9,15}$');

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    final name = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final password = _passwordCtrl.text;
    final confirm = _confirmCtrl.text;

    final errors = <String, String>{
      'name': name.isEmpty ? AppStrings.signupFullNameRequired : '',
      'email': email.isEmpty
          ? AppStrings.signupEmailRequired
          : !_emailRegex.hasMatch(email)
              ? AppStrings.signupEmailInvalid
              : '',
      'phone': phone.isEmpty
          ? AppStrings.signupPhoneRequired
          : !_phoneRegex.hasMatch(phone)
              ? AppStrings.signupPhoneInvalid
              : '',
      'password': password.isEmpty
          ? AppStrings.signupPasswordRequired
          : password.length < AppStrings.minPasswordLength
              ? AppStrings.signupPasswordTooShort(AppStrings.minPasswordLength)
              : '',
      'confirm': confirm.isEmpty
          ? AppStrings.signupConfirmPasswordRequired
          : confirm != password
              ? AppStrings.signupConfirmPasswordMismatch
              : '',
    };

    setState(() => _errors.addAll(errors));
    return errors.values.every((e) => e.isEmpty);
  }

  Future<void> _handleGoogle() async {
    setState(() => _loading = true);
    try {
      final user = await signInWithGoogle();
      if (user == null || !mounted) return;
      await context.read<AuthProvider>().refresh();
    } on AuthException catch (error) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.signupSignUpErrorTitle,
        message: localizeAuthError(error.message),
        type: AlertType.error,
      );
    } catch (error) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.authGenericErrorTitle,
        message: localizeAuthError(error.toString()),
        type: AlertType.error,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleRegister() async {
    if (!_validate()) return;

    setState(() => _loading = true);
    try {
      final res = await supabase.auth.signUp(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
        data: {
          'full_name': _nameCtrl.text.trim(),
          'phone': _phoneCtrl.text.trim(),
          'profile_completed': false,
          'onboarding_completed': false,
        },
      );

      if (!mounted) return;

      if (res.user != null) {
        await DevotionSchedule.ensure();
        if (!mounted) return;
        await context.read<AuthProvider>().refresh();
        if (mounted) {
          context.push(Routes.profileCompletion, extra: {
            'userId': res.user?.id,
            'email': _emailCtrl.text.trim(),
            'requires_login_before_submit': res.session == null,
          });
        }
      }
    } on AuthException catch (e) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.signupSignUpErrorTitle,
        message: localizeAuthError(e.message),
        type: AlertType.error,
      );
    } catch (e) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.authGenericErrorTitle,
        message: localizeAuthError(e.toString()),
        type: AlertType.error,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScreenShell(
      title: AppStrings.signupTitle,
      onBack: () => context.pop(),
      headerExtras: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 5,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: AppColors.gold,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          Container(
            width: 18,
            height: 5,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ],
      ),
      child: Column(
        children: [
                    CustomTextField(
                      label: AppStrings.signupFullName,
                      placeholder: AppStrings.signupFullNamePlaceholder,
                      icon: Icons.person_outline,
                      controller: _nameCtrl,
                      errorText: _errors['name'],
                      onChanged: (_) =>
                          setState(() => _errors['name'] = ''),
                    ),
                    CustomTextField(
                      label: AppStrings.authEmail,
                      placeholder: AppStrings.authEmailPlaceholder,
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                      controller: _emailCtrl,
                      errorText: _errors['email'],
                      onChanged: (_) =>
                          setState(() => _errors['email'] = ''),
                    ),
                    CustomTextField(
                      label: AppStrings.signupPhone,
                      placeholder: AppStrings.signupPhonePlaceholder,
                      icon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                      controller: _phoneCtrl,
                      errorText: _errors['phone'],
                      onChanged: (_) =>
                          setState(() => _errors['phone'] = ''),
                    ),
                    CustomTextField(
                      label: AppStrings.authPassword,
                      placeholder: AppStrings.signupPasswordPlaceholder,
                      icon: Icons.lock_outline,
                      isPassword: true,
                      controller: _passwordCtrl,
                      errorText: _errors['password'],
                      onChanged: (_) =>
                          setState(() => _errors['password'] = ''),
                    ),
                    CustomTextField(
                      label: AppStrings.signupConfirmPassword,
                      placeholder: AppStrings.signupConfirmPasswordPlaceholder,
                      icon: Icons.lock_outline,
                      isPassword: true,
                      controller: _confirmCtrl,
                      errorText: _errors['confirm'],
                      onChanged: (_) =>
                          setState(() => _errors['confirm'] = ''),
                    ),

                    // Submit.
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _handleRegister,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 4,
                        ),
                        child: _loading
                            ? const CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2)
                            : const Text(
                                AppStrings.authNext,
                                style: TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: OutlinedButton(
                        onPressed: _loading ? null : _handleGoogle,
                        child: const Text(AppStrings.signupGoogleButton),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Footer.
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      textDirection: TextDirection.rtl,
                      children: [
                        GestureDetector(
                          onTap: () => context.pop(),
                          child: const Text(
                            AppStrings.signupFooterAction,
                            style: TextStyle(
                                color: AppColors.navy,
                                fontWeight: FontWeight.bold,
                                fontSize: 14),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          AppStrings.signupFooterPrefix,
                          style:
                              TextStyle(color: Colors.grey, fontSize: 14),
                        ),
                      ],
                    ),
        ],
      ),
    );
  }
}
