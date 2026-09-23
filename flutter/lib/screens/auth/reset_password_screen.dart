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
  String _passwordError = '';
  String _confirmError = '';
  bool _loading = false;
  bool _success = false;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
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
          : AppStrings.resetPasswordInvalidLinkTitle,
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
                  onGoToForgot: () => context.go(Routes.forgotPassword),
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
        const Text(
          AppStrings.resetPasswordNewPasswordTitle,
          textDirection: TextDirection.rtl,
          style: TextStyle(
              fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.navy),
        ),
        const SizedBox(height: 4),
        Text(
          AppStrings.resetPasswordMinHint(AppStrings.minPasswordLength),
          textDirection: TextDirection.rtl,
          style: const TextStyle(color: Colors.grey, fontSize: 13),
        ),
        const SizedBox(height: 16),
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
        SizedBox(
          height: 54,
          child: ElevatedButton(
            onPressed: loading ? null : onSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: loading
                ? const CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2)
                : const Text(AppStrings.resetPasswordSubmit,
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: onGoToLogin,
          child: const Text(
            AppStrings.resetPasswordFooterAction,
            textAlign: TextAlign.center,
            style: TextStyle(
                color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 14),
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
        const Icon(Icons.check_circle_outline,
            size: 56, color: Colors.green),
        const SizedBox(height: 16),
        const Text(
          AppStrings.resetPasswordSuccessTitle,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.navy),
        ),
        const SizedBox(height: 8),
        const Text(
          AppStrings.resetPasswordSuccessMessage,
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: onGoToLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text(AppStrings.authLogin,
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}

class _InvalidLinkView extends StatelessWidget {
  final VoidCallback onGoToLogin;
  final VoidCallback onGoToForgot;
  const _InvalidLinkView(
      {required this.onGoToLogin, required this.onGoToForgot});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Icon(Icons.link_off, size: 56, color: Colors.orange),
        const SizedBox(height: 16),
        const Text(
          AppStrings.resetPasswordInvalidLinkTitle,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.navy),
        ),
        const SizedBox(height: 8),
        const Text(
          AppStrings.resetPasswordLinkOffMessage,
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: onGoToForgot,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text(AppStrings.resetPasswordSendNewLink,
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: onGoToLogin,
          child: const Text(
            AppStrings.resetPasswordFooterAction,
            textAlign: TextAlign.center,
            style: TextStyle(
                color: AppColors.navy,
                fontWeight: FontWeight.bold,
                fontSize: 14),
          ),
        ),
      ],
    );
  }
}
