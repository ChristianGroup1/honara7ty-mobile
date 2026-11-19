// ─── Signup Screen ───────────────────────────────────────────────────────────
// Mirrors components/signup/SignupScreen.tsx

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
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
import '../../widgets/auth_action_button.dart';
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
          ? ''
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
          if (_phoneCtrl.text.trim().isNotEmpty)
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
      eyebrow: 'هنا راحتي',
      subtitle: AppStrings.signupIntroDescription,
      title: AppStrings.signupIntroTitle,
      headerExtras: Row(
        children: [
          Container(
            width: 40,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFFBBF24),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 22,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CustomTextField(
            label: AppStrings.signupFullName,
            placeholder: AppStrings.signupFullNamePlaceholder,
            icon: Icons.person_outline,
            controller: _nameCtrl,
            errorText: _errors['name'],
            onChanged: (_) => setState(() => _errors['name'] = ''),
          ),
          CustomTextField(
            label: AppStrings.authEmail,
            placeholder: AppStrings.authEmailPlaceholder,
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            controller: _emailCtrl,
            errorText: _errors['email'],
            onChanged: (_) => setState(() => _errors['email'] = ''),
          ),
          CustomTextField(
            label: AppStrings.signupPhone,
            placeholder: AppStrings.signupPhonePlaceholder,
            icon: Icons.phone_outlined,
            optional: true,
            keyboardType: TextInputType.phone,
            controller: _phoneCtrl,
            errorText: _errors['phone'],
            onChanged: (_) => setState(() => _errors['phone'] = ''),
          ),
          CustomTextField(
            label: AppStrings.authPassword,
            placeholder: AppStrings.signupPasswordPlaceholder,
            icon: Icons.lock_outline,
            isPassword: true,
            controller: _passwordCtrl,
            errorText: _errors['password'],
            onChanged: (_) => setState(() => _errors['password'] = ''),
          ),
          CustomTextField(
            label: AppStrings.signupConfirmPassword,
            placeholder: AppStrings.signupConfirmPasswordPlaceholder,
            icon: Icons.lock_outline,
            isPassword: true,
            controller: _confirmCtrl,
            errorText: _errors['confirm'],
            onChanged: (_) => setState(() => _errors['confirm'] = ''),
          ),

          // Submit.
          AuthPrimaryButton(
            label: AppStrings.authNext,
            onPressed: _handleRegister,
            loading: _loading,
          ),
          const SizedBox(height: 12),
          AuthOrDivider(label: AppStrings.authOr),
          const SizedBox(height: 12),
          AuthOutlinedButton(
            label: AppStrings.signupGoogleButton,
            onPressed: _handleGoogle,
            loading: _loading,
            icon: SvgPicture.asset(
              'assets/images/google-icon.svg',
              width: 20,
              height: 20,
              semanticsLabel: 'Google',
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
                child: Text(
                  AppStrings.signupFooterAction,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    color: Color(0xFF0284C7),
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                AppStrings.signupFooterPrefix,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
