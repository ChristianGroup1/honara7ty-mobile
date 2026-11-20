import 'package:flutter/material.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import 'app_update_service.dart';

/// Shows a dismissible optional-update sheet. Never blocks the app.
Future<void> maybeShowSoftUpdatePrompt(BuildContext context) async {
  final offer = await AppUpdateService.checkOptionalUpdate();
  if (offer == null || !context.mounted) return;

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    enableDrag: true,
    backgroundColor: Colors.transparent,
    barrierColor: const Color(0x99020617),
    builder: (sheetContext) {
      final isDark = Theme.of(sheetContext).brightness == Brightness.dark;
      final surface = isDark ? AppColors.darkCard : Colors.white;
      final titleColor = isDark ? Colors.white : AppColors.navy;
      final bodyColor = isDark
          ? Colors.white.withValues(alpha: 0.72)
          : AppColors.lightMutedText;

      return Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.paddingOf(sheetContext).bottom + 12,
            left: 14,
            right: 14,
          ),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: surface,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18),
                  blurRadius: 28,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 18, 22, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: bodyColor.withValues(alpha: 0.28),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          AppColors.steel.withValues(alpha: 0.22),
                          AppColors.champagne.withValues(alpha: 0.35),
                        ],
                      ),
                    ),
                    child: const Icon(
                      Icons.system_update_alt_rounded,
                      color: AppColors.navy,
                      size: 30,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    AppStrings.updateAvailableTitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'نسخة ${offer.latestVersion}',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.champagne.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    offer.message,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.55,
                      color: bodyColor,
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: () async {
                        Navigator.of(sheetContext).pop();
                        await AppUpdateService.openStore(offer.storeUrl);
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.navy,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        AppStrings.updateNow,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () async {
                            await AppUpdateService.snooze();
                            if (sheetContext.mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                          },
                          child: Text(
                            AppStrings.updateLater,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w800,
                              color: bodyColor,
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: TextButton(
                          onPressed: () async {
                            await AppUpdateService.skipVersion(
                              offer.latestVersion,
                            );
                            if (sheetContext.mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                          },
                          child: Text(
                            AppStrings.updateSkipVersion,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w800,
                              color: bodyColor.withValues(alpha: 0.85),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}
