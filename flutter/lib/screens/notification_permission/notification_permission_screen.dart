// ─── Notification Permission Screen ──────────────────────────────────────────
// Mirrors components/notification-permission/NotificationPermissionScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../routing/app_router.dart';

class NotificationPermissionScreen extends StatelessWidget {
  const NotificationPermissionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              // Icon.
              Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.accent.withOpacity(0.12),
                    border: Border.all(
                        color: AppColors.accent.withOpacity(0.4), width: 2),
                  ),
                  child: const Icon(
                    Icons.notifications_active_rounded,
                    size: 60,
                    color: AppColors.accent,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              const Text(
                AppStrings.notifPermissionTitle,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                AppStrings.notifPermissionSubtitle,
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                  height: 1.5,
                ),
              ),
              const Spacer(),

              // Allow button.
              SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    // TODO: Request permission via flutter_local_notifications.
                    context.go(Routes.mainTabs);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: AppColors.navy,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                  ),
                  child: const Text(
                    AppStrings.notifPermissionAllow,
                    style: TextStyle(
                        fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Skip button.
              TextButton(
                onPressed: () => context.go(Routes.mainTabs),
                child: Text(
                  AppStrings.notifPermissionSkip,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
