// ─── Login Screen ────────────────────────────────────────────────────────────
// Mirrors components/login/LoginScreen.tsx

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/auth_errors.dart';
import '../../features/auth/google_auth.dart';
import '../../features/reminders/devotion_schedule.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/auth_screen_shell.dart';
import '../../widgets/auth_action_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';
import '../support/login_problem_sheet.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  String _emailError = '';
  String _passwordError = '';
  bool _loading = false;

  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  );

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text;

    String emailErr = '';
    String passErr = '';

    if (email.isEmpty) {
      emailErr = AppStrings.loginEmailRequired;
    } else if (!_emailRegex.hasMatch(email)) {
      emailErr = AppStrings.loginEmailInvalid;
    }
    if (password.isEmpty) passErr = AppStrings.loginPasswordRequired;

    setState(() {
      _emailError = emailErr;
      _passwordError = passErr;
    });

    if (emailErr.isNotEmpty || passErr.isNotEmpty) return;

    setState(() => _loading = true);
    try {
      final res = await supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      if (res.user != null) {
        if (!mounted) return;
        await DevotionSchedule.ensure();
        if (!mounted) return;
        await context.read<AuthProvider>().refresh();
      }
    } on AuthException catch (e) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.loginSignInErrorTitle,
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

  Future<void> _handleGoogleSignIn() async {
    setState(() => _loading = true);
    try {
      final user = await signInWithGoogle();
      if (user != null && mounted) {
        await context.read<AuthProvider>().refresh();
      }
    } on AuthException catch (e) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: AppStrings.authGenericErrorTitle,
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
      title: AppStrings.loginWelcomeBack,
      subtitle: AppStrings.loginWelcomeBackDescription,
      eyebrow: 'هنا راحتي',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CustomTextField(
            label: AppStrings.authEmail,
            placeholder: AppStrings.authEmailPlaceholder,
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            controller: _emailCtrl,
            errorText: _emailError,
            onChanged: (_) {
              if (_emailError.isNotEmpty) {
                setState(() => _emailError = '');
              }
            },
          ),
          CustomTextField(
            label: AppStrings.authPassword,
            placeholder: AppStrings.authPasswordPlaceholder,
            icon: Icons.lock_outline,
            isPassword: true,
            controller: _passwordCtrl,
            errorText: _passwordError,
            onChanged: (_) {
              if (_passwordError.isNotEmpty) {
                setState(() => _passwordError = '');
              }
            },
          ),

          // Security hint + forgot password row.
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            textDirection: TextDirection.rtl,
            children: [
              Row(
                textDirection: TextDirection.rtl,
                children: [
                  const Icon(Icons.shield_outlined,
                      size: 16, color: Color(0xFF0284C7)),
                  const SizedBox(width: 4),
                  Text(
                    AppStrings.authSecureHint,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () => context.push(Routes.forgotPassword),
                child: Text(
                  AppStrings.authForgotPassword,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    color: Color(0xFF0284C7),
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Submit button.
          AuthPrimaryButton(
            label: AppStrings.authLogin,
            onPressed: _handleLogin,
            loading: _loading,
            icon: Icons.login_rounded,
          ),
          const SizedBox(height: 16),
          AuthOrDivider(label: AppStrings.authOr),
          const SizedBox(height: 12),
          AuthOutlinedButton(
            label: AppStrings.loginGoogleButton,
            onPressed: _handleGoogleSignIn,
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
                onTap: () => context.push(Routes.signup),
                child: Text(
                  AppStrings.loginFooterAction,
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
                AppStrings.loginFooterPrefix,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          GestureDetector(
            onTap: () => showLoginProblemSheet(
              context,
              email: _emailCtrl.text.trim(),
            ),
            child: const Text(
              AppStrings.loginReportProblem,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                color: Color(0xFF0284C7),
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
