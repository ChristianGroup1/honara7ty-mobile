import 'package:flutter/material.dart';

import '../core/theme.dart';

class AuthScreenShell extends StatelessWidget {
  const AuthScreenShell({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.onBack,
    this.headerExtras,
  });

  final String title;
  final String? subtitle;
  final VoidCallback? onBack;
  final Widget? headerExtras;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 360;
    return Scaffold(
      backgroundColor: AppColors.authNavy,
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(18, compact ? 2 : 6, 18, compact ? 10 : 14),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: onBack == null
                        ? const SizedBox(width: 40, height: 40)
                        : Material(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: const CircleBorder(),
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: onBack,
                              child: const SizedBox(
                                width: 40,
                                height: 40,
                                child: Icon(Icons.chevron_right, color: Colors.white),
                              ),
                            ),
                          ),
                  ),
                  Image.asset(
                    'assets/images/logo.png',
                    width: compact ? 58 : 100,
                    height: compact ? 58 : 100,
                    errorBuilder: (_, __, ___) => const SizedBox(height: 24),
                  ),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: compact ? 20 : 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      subtitle!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFFD7DEEA), fontSize: 14, height: 1.5),
                    ),
                  ],
                  if (headerExtras != null) ...[
                    const SizedBox(height: 10),
                    headerExtras!,
                  ],
                ],
              ),
            ),
          ),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                border: Border(
                  top: BorderSide(color: Color(0xFFECE3D6)),
                  left: BorderSide(color: Color(0xFFECE3D6)),
                  right: BorderSide(color: Color(0xFFECE3D6)),
                ),
              ),
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(compact ? 20 : 24, 32, compact ? 20 : 24, 40),
                child: child,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
