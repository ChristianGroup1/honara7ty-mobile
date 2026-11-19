// ─── Shared: Custom Alert Dialog ─────────────────────────────────────────────
// Mirrors components/shared/CustomAlert.tsx

import 'package:flutter/material.dart';
import '../core/theme.dart';

enum AlertType { error, warning, success, info }

class AlertAction {
  final String text;
  final VoidCallback? onPressed;
  final bool isDestructive;
  final bool isCancel;

  const AlertAction({
    required this.text,
    this.onPressed,
    this.isDestructive = false,
    this.isCancel = false,
  });
}

Future<void> showCustomAlert({
  required BuildContext context,
  required String title,
  String? message,
  AlertType type = AlertType.info,
  List<AlertAction>? actions,
}) {
  final iconData = switch (type) {
    AlertType.error => Icons.error_outline,
    AlertType.warning => Icons.warning_amber_outlined,
    AlertType.success => Icons.check_circle_outline,
    AlertType.info => Icons.info_outline,
  };

  final iconColor = switch (type) {
    AlertType.error => AppColors.danger,
    AlertType.warning => AppColors.warning,
    AlertType.success => AppColors.success,
    AlertType.info => AppColors.accent,
  };

  return showDialog(
    context: context,
    barrierDismissible: true,
    builder: (ctx) {
      final isDark = Theme.of(ctx).brightness == Brightness.dark;
      return Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          insetPadding:
              const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: .1),
                  shape: BoxShape.circle,
                ),
                child: Icon(iconData, color: iconColor, size: 34),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (message != null && message.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark
                        ? AppColors.darkMutedText
                        : AppColors.lightMutedText,
                    height: 1.55,
                  ),
                ),
              ],
            ],
          ),
          actions: actions == null || actions.isEmpty
              ? [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('حسنًا'),
                  ),
                ]
              : actions
                  .map(
                    (a) => TextButton(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        a.onPressed?.call();
                      },
                      style: a.isDestructive
                          ? TextButton.styleFrom(
                              foregroundColor: AppColors.danger)
                          : null,
                      child: Text(
                        a.text,
                        style: TextStyle(
                          fontWeight:
                              a.isCancel ? FontWeight.normal : FontWeight.bold,
                        ),
                      ),
                    ),
                  )
                  .toList(),
        ),
      );
    },
  );
}
