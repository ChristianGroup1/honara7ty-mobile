// ─── Forgot Password Screen ──────────────────────────────────────────────────
// Mirrors components/forgot-password/ForgotPasswordScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../routing/app_router.dart';
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
        message: e.message,
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
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new,
                      color: Colors.white, size: 20),
                  onPressed: () => context.pop(),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                AppStrings.forgotPasswordTitle,
                textDirection: TextDirection.rtl,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: _sent ? _SentView(email: _emailCtrl.text.trim()) : _FormView(
                  emailCtrl: _emailCtrl,
                  emailError: _emailError,
                  loading: _loading,
                  onEmailChanged: (_) {
                    if (_emailError.isNotEmpty) {
                      setState(() => _emailError = '');
                    }
                  },
                  onSend: _handleSend,
                  onGoToLogin: () => context.pop(),
                ),
              ),
            ],
          ),
        ),
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
        const Text(
          AppStrings.forgotPasswordInfoDescription,
          textDirection: TextDirection.rtl,
          style: TextStyle(color: Colors.grey, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 20),
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
        SizedBox(
          height: 54,
          child: ElevatedButton(
            onPressed: loading ? null : onSend,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: loading
                ? const CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2)
                : const Text(AppStrings.forgotPasswordSendRecoveryLink,
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          textDirection: TextDirection.rtl,
          children: [
            GestureDetector(
              onTap: onGoToLogin,
              child: const Text(
                AppStrings.forgotPasswordFooterAction,
                style: TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.bold,
                    fontSize: 14),
              ),
            ),
            const SizedBox(width: 4),
            const Text(
              AppStrings.forgotPasswordFooterPrefix,
              style: TextStyle(color: Colors.grey, fontSize: 14),
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
        const Icon(Icons.mark_email_read_outlined,
            size: 56, color: AppColors.accent),
        const SizedBox(height: 16),
        const Text(
          AppStrings.forgotPasswordResetSentTitle,
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.navy),
        ),
        const SizedBox(height: 8),
        Text(
          '${AppStrings.forgotPasswordResetSentMessage}\n$email',
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.grey, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 8),
        const Text(
          AppStrings.forgotPasswordResetHint,
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
        const SizedBox(height: 20),
        GestureDetector(
          onTap: () => context.pop(),
          child: const Text(
            AppStrings.forgotPasswordFooterAction,
            style: TextStyle(
                color: AppColors.navy,
                fontWeight: FontWeight.bold,
                fontSize: 15),
          ),
        ),
      ],
    );
  }
}
