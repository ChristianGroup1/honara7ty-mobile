// ─── Login Screen ────────────────────────────────────────────────────────────
// Mirrors components/login/LoginScreen.tsx

import 'package:flutter/material.dart';
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
import '../../widgets/custom_text_field.dart';
import '../../widgets/custom_alert_dialog.dart';

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
      title: AppStrings.loginTitle,
      onBack: () => context.pop(),
      child: Column(
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
                                size: 16, color: Color(0xFF6D7890)),
                            const SizedBox(width: 4),
                            Text(
                              AppStrings.authSecureHint,
                              style: const TextStyle(
                                color: Color(0xFF0A1124),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: () => context.push(Routes.forgotPassword),
                          child: const Text(
                            AppStrings.authForgotPassword,
                            style: TextStyle(
                              color: AppColors.navy,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Submit button.
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                          elevation: 4,
                        ),
                        child: _loading
                            ? const CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2)
                            : const Text(
                                AppStrings.authLogin,
                                style: TextStyle(
                                    fontSize: 17, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Divider.
                    _Divider(),
                    const SizedBox(height: 12),

                    // Google button.
                    _SocialButton(
                      label: AppStrings.loginGoogleButton,
                      icon: Icons.g_mobiledata_rounded,
                      iconColor: const Color(0xFFDB4437),
                      onTap: _loading ? null : _handleGoogleSignIn,
                    ),
                    const SizedBox(height: 20),

                    // Footer.
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      textDirection: TextDirection.rtl,
                      children: [
                        GestureDetector(
                          onTap: () => context.push(Routes.signup),
                          child: const Text(
                            AppStrings.loginFooterAction,
                            style: TextStyle(
                              color: AppColors.navy,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          AppStrings.loginFooterPrefix,
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 14),
                        ),
                      ],
                    ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            AppStrings.authOr,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
        ),
        const Expanded(child: Divider()),
      ],
    );
  }
}

class _SocialButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color iconColor;
  final VoidCallback? onTap;

  const _SocialButton({
    required this.label,
    required this.icon,
    required this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 54,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFA5A39F)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: iconColor, size: 22),
            const SizedBox(width: 10),
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF22304A),
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
