import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../core/push_tokens.dart';
import '../../core/supabase_service.dart';
import '../../features/reminders/devotion_reminder.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../features/reminders/notification_permission_flow.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/auth_action_button.dart';

class NotificationPermissionScreen extends StatelessWidget {
  const NotificationPermissionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFF0F172A),
                          Color(0xFF1E1B4B),
                          Color(0xFF0F172A),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: const Color(0xFF1E293B)),
                      boxShadow: [
                        BoxShadow(
                          color:
                              const Color(0xFF0F172A).withValues(alpha: 0.16),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.15),
                            ),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.alarm_rounded,
                                size: 14,
                                color: Color(0xFFFCD34D),
                              ),
                              SizedBox(width: 6),
                              Text(
                                'تذكير يومي',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  color: Color(0xFFFCD34D),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.15),
                            ),
                          ),
                          child: const Icon(
                            Icons.notifications_active_rounded,
                            size: 42,
                            color: Color(0xFFFBBF24),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          AppStrings.notifPermissionTitle,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          AppStrings.notifPermissionSubtitle,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            color: Color(0xFFCBD5E1),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            height: 1.55,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.shield_moon_rounded,
                          color: Color(0xFF4F46E5),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'هنذكّرك بميعاد خلوتك من غير ما نزعجك طول اليوم.',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              color: Color(0xFF64748B),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              height: 1.45,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  AuthPrimaryButton(
                    label: AppStrings.notifPermissionAllow,
                    icon: Icons.notifications_active_rounded,
                    onPressed: () async {
                      await DevotionReminder.instance.requestPermission();
                      final userId = supabase.auth.currentUser?.id;
                      await markNotificationPermissionPromptSeen(userId);
                      await DevotionSchedule.ensure();
                      await PushTokens.register(userId);
                      if (!context.mounted) return;
                      await context.read<AuthProvider>().refresh();
                      if (context.mounted) context.go(Routes.mainTabs);
                    },
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: () async {
                      await markNotificationPermissionPromptSeen(
                        supabase.auth.currentUser?.id,
                      );
                      if (!context.mounted) return;
                      await context.read<AuthProvider>().refresh();
                      if (context.mounted) context.go(Routes.mainTabs);
                    },
                    child: Text(
                      AppStrings.notifPermissionSkip,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        color: Color(0xFF94A3B8),
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
