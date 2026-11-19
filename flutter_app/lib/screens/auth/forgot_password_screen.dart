// ─── Forgot Password Screen ──────────────────────────────────────────────────
// Mirrors components/forgot-password/ForgotPasswordScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/auth_errors.dart';
import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../widgets/auth_screen_shell.dart';
import '../../widgets/auth_action_button.dart';
import '../../widgets/auth_form_intro.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  String _emailError = '';
  bool _loading = false;
  bool _sent = false;

  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  );

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => _emailError = AppStrings.forgotPasswordEmailRequired);
      return;
    }
    if (!_emailRegex.hasMatch(email)) {
      setState(() => _emailError = AppStrings.forgotPasswordEmailInvalid);
      return;
    }

    setState(() {
      _emailError = '';
      _loading = true;
    });

    try {
      await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo: 'honara7ty://reset-password',
      );
      if (mounted) setState(() => _sent = true);
    } on AuthException catch (e) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.authGenericErrorTitle,
        message: localizeAuthError(e.message),
        type: AlertType.error,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScreenShell(
      title: AppStrings.forgotPasswordTitle,
      eyebrow: 'استعادة الحساب',
      subtitle: 'هنبعتلك لينك تعيد بيه كلمة المرور',
      onBack: () => context.pop(),
      child: _sent
          ? _SentView(email: _emailCtrl.text.trim())
          : _FormView(
              emailCtrl: _emailCtrl,
              emailError: _emailError,
              loading: _loading,
              onEmailChanged: (_) {
                if (_emailError.isNotEmpty) setState(() => _emailError = '');
              },
              onSend: _handleSend,
              onGoToLogin: () => context.pop(),
            ),
    );
  }
}

class _FormView extends StatelessWidget {
  final TextEditingController emailCtrl;
  final String emailError;
  final bool loading;
  final void Function(String) onEmailChanged;
  final VoidCallback onSend;
  final VoidCallback onGoToLogin;

  const _FormView({
    required this.emailCtrl,
    required this.emailError,
    required this.loading,
    required this.onEmailChanged,
    required this.onSend,
    required this.onGoToLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const AuthFormIntro(
          title: AppStrings.forgotPasswordInfoTitle,
          description: AppStrings.forgotPasswordInfoDescription,
          icon: Icons.forward_to_inbox,
        ),
        CustomTextField(
          label: AppStrings.authEmail,
          placeholder: AppStrings.authEmailPlaceholder,
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
          controller: emailCtrl,
          errorText: emailError,
          onChanged: onEmailChanged,
        ),
        const SizedBox(height: 8),
        AuthPrimaryButton(
          label: AppStrings.forgotPasswordSendRecoveryLink,
          onPressed: onSend,
          loading: loading,
          icon: Icons.mark_email_read_outlined,
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          textDirection: TextDirection.rtl,
          children: [
            GestureDetector(
              onTap: onGoToLogin,
              child: Text(
                AppStrings.forgotPasswordFooterAction,
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
              AppStrings.forgotPasswordFooterPrefix,
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
    );
  }
}

class _SentView extends StatelessWidget {
  final String email;

  const _SentView({required this.email});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xFFA7F3D0)),
          ),
          child: const Icon(Icons.mark_email_read_outlined,
              size: 42, color: Color(0xFF059669)),
        ),
        const SizedBox(height: 20),
        const Text(
          AppStrings.forgotPasswordResetSentTitle,
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${AppStrings.forgotPasswordResetSentMessage}\n$email',
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppFonts.ui,
            color: Color(0xFF64748B),
            fontSize: 13,
            height: 1.55,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          AppStrings.forgotPasswordResetHint,
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppFonts.ui,
            color: Color(0xFF94A3B8),
            fontSize: 12,
            height: 1.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 22),
        GestureDetector(
          onTap: () => context.pop(),
          child: const Text(
            AppStrings.forgotPasswordFooterAction,
            style: TextStyle(
              fontFamily: AppFonts.ui,
              color: Color(0xFF0284C7),
              fontWeight: FontWeight.w900,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }
}
