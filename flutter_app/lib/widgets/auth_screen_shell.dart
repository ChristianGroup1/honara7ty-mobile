import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Light youth auth: big brand hero + soft floating form (onboarding vibe).
class AuthScreenShell extends StatelessWidget {
  const AuthScreenShell({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.eyebrow = 'هنا راحتي',
    this.onBack,
    this.headerExtras,
  });

  final String title;
  final String? subtitle;
  final String eyebrow;
  final VoidCallback? onBack;
  final Widget? headerExtras;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final insets = MediaQuery.paddingOf(context);
    final compactWidth = size.width < 360;
    final compactHeight = size.height < 780;
    final horizontalPadding = compactWidth ? 18.0 : 22.0;
    final logoSize = compactHeight ? 72.0 : 88.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding - 2,
                    6,
                    horizontalPadding - 2,
                    0,
                  ),
                  child: SizedBox(
                    height: 42,
                    child: Row(
                      children: [
                        if (onBack != null)
                          Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: onBack,
                              child: Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.arrow_back_rounded,
                                  size: 20,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                            ),
                          ),
                        const Spacer(),
                      ],
                    ),
                  ),
                ),

                // Big light brand hero
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    compactHeight ? 0 : 4,
                    horizontalPadding,
                    4,
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: logoSize,
                        height: logoSize,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.06),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/logo_hires.png',
                            fit: BoxFit.cover,
                            filterQuality: FilterQuality.high,
                            errorBuilder: (_, __, ___) => Image.asset(
                              'assets/images/logo.png',
                              fit: BoxFit.cover,
                              filterQuality: FilterQuality.high,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        eyebrow,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          color: const Color(0xFF0F172A),
                          fontSize: compactWidth ? 24 : 26,
                          fontWeight: FontWeight.w900,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'وقتك مع الله… كل يوم',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          color: const Color(0xFFD97706).withValues(alpha: 0.95),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),

                // Soft floating form
                Expanded(
                  child: Container(
                    width: double.infinity,
                    margin: EdgeInsets.fromLTRB(
                      horizontalPadding - 4,
                      8,
                      horizontalPadding - 4,
                      0,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(28),
                      ),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.05),
                          blurRadius: 24,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(28),
                      ),
                      child: SingleChildScrollView(
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          20,
                          horizontalPadding,
                          20 +
                              insets.bottom +
                              MediaQuery.viewInsetsOf(context).bottom,
                        ),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 440),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  title,
                                  textAlign: TextAlign.right,
                                  style: TextStyle(
                                    fontFamily: AppFonts.ui,
                                    color: const Color(0xFF0F172A),
                                    fontSize: compactWidth ? 20 : 22,
                                    fontWeight: FontWeight.w900,
                                    height: 1.3,
                                  ),
                                ),
                                if (subtitle != null) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    subtitle!,
                                    textAlign: TextAlign.right,
                                    style: const TextStyle(
                                      fontFamily: AppFonts.ui,
                                      color: Color(0xFF64748B),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      height: 1.45,
                                    ),
                                  ),
                                ],
                                if (headerExtras != null) ...[
                                  const SizedBox(height: 12),
                                  headerExtras!,
                                ],
                                const SizedBox(height: 16),
                                child,
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
