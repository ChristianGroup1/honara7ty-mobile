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
    AlertType.error => Colors.red,
    AlertType.warning => Colors.orange,
    AlertType.success => Colors.green,
    AlertType.info => AppColors.accent,
  };

  return showDialog(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(iconData, color: iconColor, size: 44),
            const SizedBox(height: 12),
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
                style: const TextStyle(fontSize: 14, color: Colors.grey),
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
                        ? TextButton.styleFrom(foregroundColor: Colors.red)
                        : null,
                    child: Text(
                      a.text,
                      style: TextStyle(
                        fontWeight: a.isCancel
                            ? FontWeight.normal
                            : FontWeight.bold,
                      ),
                    ),
                  ),
                )
                .toList(),
      ),
    ),
  );
}
