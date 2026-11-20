import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/push_tokens.dart';
import '../../core/strings.dart';
import '../../core/supabase_service.dart';
import '../../core/theme.dart';
import '../../features/reminders/devotion_reminder.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../features/reminders/notification_permission_flow.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';

class NotificationPermissionScreen extends StatefulWidget {
  const NotificationPermissionScreen({super.key, this.inApp = false});

  /// Opened from More: back/pop instead of forcing main tabs.
  final bool inApp;

  @override
  State<NotificationPermissionScreen> createState() =>
      _NotificationPermissionScreenState();
}

class _NotificationPermissionScreenState
    extends State<NotificationPermissionScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _finish({required bool allow}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      if (allow) {
        await DevotionReminder.instance.requestPermission();
        final userId = supabase.auth.currentUser?.id;
        await markNotificationPermissionPromptSeen(userId);
        await DevotionSchedule.ensure();
        await PushTokens.register(userId);
      } else {
        await markNotificationPermissionPromptSeen(
          supabase.auth.currentUser?.id,
        );
      }
      if (!mounted) return;
      if (widget.inApp) {
        Navigator.of(context).maybePop();
        return;
      }
      await context.read<AuthProvider>().refresh();
      if (mounted) context.go(Routes.mainTabs);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [
                  Color(0xFF0B1220),
                  Color(0xFF1E3A8A),
                  Color(0xFF0EA5E9),
                ],
              ),
            ),
          ),
          Positioned.fill(
            child: Opacity(
              opacity: 0.18,
              child: Image.asset(
                'assets/images/bibleBackground.png',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 320,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    const Color(0xFF020617).withValues(alpha: 0.72),
                    const Color(0xFF020617),
                  ],
                ),
              ),
            ),
          ),
          Column(
            children: [
              SizedBox(height: top + 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    if (widget.inApp)
                      _CircleIconButton(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => Navigator.of(context).maybePop(),
                      )
                    else
                      const SizedBox(width: 42),
                    const Spacer(),
                    if (!widget.inApp)
                      TextButton(
                        onPressed: _busy ? null : () => _finish(allow: false),
                        child: Text(
                          AppStrings.notifPermissionSkip,
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            color: Colors.white.withValues(alpha: 0.72),
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 8),
                  child: Column(
                    children: [
                      const Spacer(flex: 1),
                      AnimatedBuilder(
                        animation: _pulse,
                        builder: (context, child) {
                          final lift =
                              math.sin(_pulse.value * math.pi) * 8;
                          final scale =
                              1 + math.sin(_pulse.value * math.pi) * 0.035;
                          return Transform.translate(
                            offset: Offset(0, -lift),
                            child: Transform.scale(scale: scale, child: child),
                          );
                        },
                        child: const _BellHero(),
                      ),
                      const SizedBox(height: 28),
                      Text(
                        'تذكير يومي',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                          color: const Color(0xFFFBBF24).withValues(alpha: 0.95),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        AppStrings.notifPermissionTitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: AppFonts.verse,
                          fontSize: 32,
                          fontWeight: FontWeight.w700,
                          height: 1.3,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        AppStrings.notifPermissionSubtitle,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          height: 1.65,
                          color: Colors.white.withValues(alpha: 0.78),
                        ),
                      ),
                      const SizedBox(height: 22),
                      const _BenefitCard(
                        icon: Icons.menu_book_rounded,
                        title: 'تذكير بالخلوة',
                        body: 'في معادك اليومي من غير إزعاج طول اليوم.',
                      ),
                      const SizedBox(height: 10),
                      const _BenefitCard(
                        icon: Icons.favorite_rounded,
                        title: 'ثبات ألطف',
                        body: 'إشعار هادي يساعدك تفضل قريب من كلمة الله.',
                      ),
                      const Spacer(flex: 2),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + bottom),
                child: Column(
                  children: [
                    _GoldButton(
                      label: AppStrings.notifPermissionAllow,
                      loading: _busy,
                      onTap: () => _finish(allow: true),
                    ),
                    if (widget.inApp) ...[
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: _busy ? null : () => _finish(allow: false),
                        child: Text(
                          'مش دلوقتي',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            color: Colors.white.withValues(alpha: 0.7),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BellHero extends StatelessWidget {
  const _BellHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 148,
      height: 148,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFBBF24).withValues(alpha: 0.25),
            blurRadius: 36,
          ),
        ],
      ),
      child: Container(
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
        ),
        child: const Icon(
          Icons.notifications_active_rounded,
          size: 54,
          color: Color(0xFFFBBF24),
        ),
      ),
    );
  }
}

class _BenefitCard extends StatelessWidget {
  const _BenefitCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFFBBF24).withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: const Color(0xFFFBBF24), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      body,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GoldButton extends StatelessWidget {
  const _GoldButton({
    required this.label,
    required this.onTap,
    this.loading = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: loading ? null : onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          height: 56,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.centerRight,
              end: Alignment.centerLeft,
              colors: [Color(0xFFFBBF24), Color(0xFFF59E0B), Color(0xFFD97706)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Color(0xFF0F172A),
                    ),
                  )
                : Text(
                    label,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      color: Color(0xFF0F172A),
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.12),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}
