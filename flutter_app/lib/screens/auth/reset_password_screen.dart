// ─── Reset Password Screen ───────────────────────────────────────────────────
// Mirrors components/reset-password/ResetPasswordScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/auth_errors.dart';
import '../../core/deep_links.dart';
import '../../providers/auth_provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../routing/app_router.dart';
import '../../widgets/auth_screen_shell.dart';
import '../../widgets/auth_action_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';

class ResetPasswordScreen extends StatefulWidget {
  final bool linkValid;
  const ResetPasswordScreen({super.key, this.linkValid = true});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _requestEmailCtrl = TextEditingController();
  String _passwordError = '';
  String _confirmError = '';
  bool _loading = false;
  bool _success = false;
  bool _requestLoading = false;
  bool _requestSent = false;
  String _requestEmailError = '';

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    _requestEmailCtrl.dispose();
    super.dispose();
  }

  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  );

  Future<void> _requestNewLink() async {
    final email = _requestEmailCtrl.text.trim();
    if (email.isEmpty) {
      setState(
          () => _requestEmailError = AppStrings.forgotPasswordEmailRequired);
      return;
    }
    if (!_emailRegex.hasMatch(email)) {
      setState(
          () => _requestEmailError = AppStrings.forgotPasswordEmailInvalid);
      return;
    }
    setState(() {
      _requestEmailError = '';
      _requestLoading = true;
    });
    try {
      await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo: 'honara7ty://reset-password',
      );
      if (mounted) setState(() => _requestSent = true);
    } on AuthException catch (error) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.authGenericErrorTitle,
        message: localizeAuthError(error.message),
        type: AlertType.error,
      );
    } finally {
      if (mounted) setState(() => _requestLoading = false);
    }
  }

  Future<void> _handleReset() async {
    final password = _passwordCtrl.text;
    final confirm = _confirmCtrl.text;

    String passErr = '';
    String confErr = '';

    if (password.isEmpty) {
      passErr = AppStrings.resetPasswordNewPasswordRequired;
    } else if (password.length < AppStrings.minPasswordLength) {
      passErr = AppStrings.resetPasswordTooShort(AppStrings.minPasswordLength);
    }
    if (confirm.isEmpty) {
      confErr = AppStrings.resetPasswordConfirmRequired;
    } else if (confirm != password) {
      confErr = AppStrings.resetPasswordConfirmMismatch;
    }

    setState(() {
      _passwordError = passErr;
      _confirmError = confErr;
    });

    if (passErr.isNotEmpty || confErr.isNotEmpty) return;

    setState(() => _loading = true);
    try {
      await supabase.auth.updateUser(UserAttributes(password: password));
      if (mounted) setState(() => _success = true);
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

  void _goLogin() {
    DeepLinks.finishRecovery();
    context.read<AuthProvider>().refresh();
    context.go(Routes.login);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final linkValid = auth.status == AuthStatus.recoveryMode
        ? auth.recoveryLinkValid
        : widget.linkValid;
    return AuthScreenShell(
      title: linkValid
          ? AppStrings.resetPasswordNewPasswordTitle
          : _requestSent
              ? 'تم إرسال رابط جديد'
              : AppStrings.resetPasswordInvalidLinkTitle,
      eyebrow: 'أمان الحساب',
      subtitle: linkValid
          ? AppStrings.resetPasswordMinHint(AppStrings.minPasswordLength)
          : null,
      child: _success
          ? _SuccessView(onGoToLogin: _goLogin)
          : linkValid
              ? _ResetForm(
                  passwordCtrl: _passwordCtrl,
                  confirmCtrl: _confirmCtrl,
                  passwordError: _passwordError,
                  confirmError: _confirmError,
                  loading: _loading,
                  onPasswordChanged: (_) => setState(() => _passwordError = ''),
                  onConfirmChanged: (_) => setState(() => _confirmError = ''),
                  onSubmit: _handleReset,
                  onGoToLogin: _goLogin,
                )
              : _InvalidLinkView(
                  onGoToLogin: _goLogin,
                  emailCtrl: _requestEmailCtrl,
                  emailError: _requestEmailError,
                  loading: _requestLoading,
                  sent: _requestSent,
                  onEmailChanged: (_) =>
                      setState(() => _requestEmailError = ''),
                  onRequestLink: _requestNewLink,
                ),
    );
  }
}

class _ResetForm extends StatelessWidget {
  final TextEditingController passwordCtrl;
  final TextEditingController confirmCtrl;
  final String passwordError;
  final String confirmError;
  final bool loading;
  final void Function(String) onPasswordChanged;
  final void Function(String) onConfirmChanged;
  final VoidCallback onSubmit;
  final VoidCallback onGoToLogin;

  const _ResetForm({
    required this.passwordCtrl,
    required this.confirmCtrl,
    required this.passwordError,
    required this.confirmError,
    required this.loading,
    required this.onPasswordChanged,
    required this.onConfirmChanged,
    required this.onSubmit,
    required this.onGoToLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CustomTextField(
          label: AppStrings.resetPasswordNewPassword,
          placeholder: AppStrings.authPasswordPlaceholder,
          icon: Icons.lock_outline,
          isPassword: true,
          controller: passwordCtrl,
          errorText: passwordError,
          onChanged: onPasswordChanged,
        ),
        CustomTextField(
          label: AppStrings.resetPasswordConfirmPassword,
          placeholder: AppStrings.authPasswordPlaceholder,
          icon: Icons.lock_outline,
          isPassword: true,
          controller: confirmCtrl,
          errorText: confirmError,
          onChanged: onConfirmChanged,
        ),
        AuthPrimaryButton(
          label: AppStrings.resetPasswordSubmit,
          onPressed: onSubmit,
          loading: loading,
          icon: Icons.lock_reset_rounded,
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: onGoToLogin,
          child: Text(
            AppStrings.resetPasswordFooterAction,
            textAlign: TextAlign.center,
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

class _SuccessView extends StatelessWidget {
  final VoidCallback onGoToLogin;
  const _SuccessView({required this.onGoToLogin});

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
          child: const Icon(Icons.check_circle_rounded,
              size: 46, color: Color(0xFF059669)),
        ),
        const SizedBox(height: 16),
        Text(
          AppStrings.resetPasswordSuccessTitle,
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
          AppStrings.resetPasswordSuccessMessage,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppFonts.ui,
            color: Color(0xFF64748B),
            fontSize: 12,
            height: 1.55,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 20),
        AuthPrimaryButton(
          label: AppStrings.authLogin,
          onPressed: onGoToLogin,
          icon: Icons.login_rounded,
        ),
      ],
    );
  }
}

class _InvalidLinkView extends StatelessWidget {
  final VoidCallback onGoToLogin;
  final TextEditingController emailCtrl;
  final String emailError;
  final bool loading;
  final bool sent;
  final ValueChanged<String> onEmailChanged;
  final VoidCallback onRequestLink;
  const _InvalidLinkView(
      {required this.onGoToLogin,
      required this.emailCtrl,
      required this.emailError,
      required this.loading,
      required this.sent,
      required this.onEmailChanged,
      required this.onRequestLink});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: sent ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: sent ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A),
            ),
          ),
          child: Icon(
            sent ? Icons.mark_email_read_outlined : Icons.link_off_rounded,
            size: 40,
            color: sent ? const Color(0xFF059669) : const Color(0xFFD97706),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          sent
              ? AppStrings.resetPasswordLinkSentTitle
              : AppStrings.resetPasswordInvalidLinkTitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          sent
              ? AppStrings.resetPasswordLinkSentMessage
              : AppStrings.resetPasswordLinkOffMessage,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppFonts.ui,
            color: Color(0xFF64748B),
            fontSize: 12,
            height: 1.55,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 20),
        if (!sent) ...[
          CustomTextField(
            label: AppStrings.authEmail,
            placeholder: AppStrings.authEmailPlaceholder,
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            controller: emailCtrl,
            errorText: emailError,
            onChanged: onEmailChanged,
          ),
          const SizedBox(height: 12),
          AuthPrimaryButton(
            label: AppStrings.resetPasswordSendNewLink,
            onPressed: onRequestLink,
            loading: loading,
            icon: Icons.forward_to_inbox_outlined,
          ),
        ],
        const SizedBox(height: 12),
        GestureDetector(
          onTap: onGoToLogin,
          child: Text(
            AppStrings.resetPasswordFooterAction,
            textAlign: TextAlign.center,
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
