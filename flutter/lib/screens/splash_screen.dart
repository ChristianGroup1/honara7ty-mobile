// ─── Splash Screen ───────────────────────────────────────────────────────────
// Mirrors components/splash/SplashScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    // Brief splash delay.
    await Future.delayed(const Duration(milliseconds: 1800));

    if (!mounted) return;

    final authProvider = context.read<AuthProvider>();
    final status = authProvider.status;

    final destination = switch (status) {
      AuthStatus.recoveryMode => Routes.resetPassword,
      AuthStatus.needsProfileCompletion => Routes.profileCompletion,
      AuthStatus.needsOnboarding => Routes.onboarding,
      AuthStatus.authenticated => Routes.mainTabs,
      _ => Routes.welcome,
    };

    if (mounted) context.go(destination);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App logo placeholder – replace with actual asset.
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.15),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.accent.withOpacity(0.4),
                  width: 2,
                ),
              ),
              child: const Icon(
                Icons.menu_book_rounded,
                size: 52,
                color: AppColors.accent,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'هنا راحتي',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'رفيقك الروحي اليومي',
              style: TextStyle(
                color: Colors.white.withOpacity(0.65),
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 40),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
              strokeWidth: 2,
            ),
          ],
        ),
      ),
    );
  }
}
