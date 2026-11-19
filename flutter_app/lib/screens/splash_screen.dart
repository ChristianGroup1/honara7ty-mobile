import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../routing/app_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<double> _rise;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _rise = Tween<double>(begin: 12, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _controller.forward();
    _navigate();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 1700));
    if (!mounted) return;

    final status = context.read<AuthProvider>().status;
    final destination = switch (status) {
      AuthStatus.recoveryMode => Routes.resetPassword,
      AuthStatus.needsProfileCompletion => Routes.profileCompletion,
      AuthStatus.needsOnboarding => Routes.onboarding,
      AuthStatus.authenticated => Routes.mainTabs,
      _ => Routes.login,
    };
    if (mounted) context.go(destination);
  }

  @override
  Widget build(BuildContext context) {
    final shortest = MediaQuery.sizeOf(context).shortestSide;
    final logoSize = (shortest * 0.28).clamp(96.0, 128.0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Opacity(
            opacity: _fade.value,
            child: Transform.translate(
              offset: Offset(0, _rise.value),
              child: child,
            ),
          );
        },
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipOval(
                child: Image.asset(
                  'assets/images/logo_hires.png',
                  width: logoSize,
                  height: logoSize,
                  fit: BoxFit.cover,
                  filterQuality: FilterQuality.high,
                  cacheWidth: (logoSize * MediaQuery.devicePixelRatioOf(context))
                      .round()
                      .clamp(256, 1024),
                  errorBuilder: (_, __, ___) => Image.asset(
                    'assets/images/logo.png',
                    width: logoSize,
                    height: logoSize,
                    fit: BoxFit.cover,
                    filterQuality: FilterQuality.high,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'هنا راحتي',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Color(0xFF0F172A),
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'وقتك مع الله… كل يوم',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Color(0xFFD97706),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
