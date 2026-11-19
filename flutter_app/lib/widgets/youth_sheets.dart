import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../core/theme.dart';

Future<T?> showYouthSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isScrollControlled = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    isDismissible: true,
    enableDrag: true,
    useSafeArea: true,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.45),
    builder: (context) {
      final media = MediaQuery.of(context);
      final bottomInset = media.viewInsets.bottom > media.viewPadding.bottom
          ? media.viewInsets.bottom
          : media.viewPadding.bottom;
      // Size to content. Avoid full-screen Stack — it expands the modal and
      // can trigger InheritedWidget `_dependents.isEmpty` crashes.
      return Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Align(
          alignment: Alignment.bottomCenter,
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 520,
              maxHeight: media.size.height * 0.88,
            ),
            child: Material(
              color: const Color(0xFFF8FAFC),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(28)),
              clipBehavior: Clip.antiAlias,
              child: builder(context),
            ),
          ),
        ),
      );
    },
  );
}

Widget youthSheetHandle() {
  return Center(
    child: Container(
      width: 42,
      height: 5,
      margin: const EdgeInsets.only(top: 10, bottom: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFCBD5E1),
        borderRadius: BorderRadius.circular(99),
      ),
    ),
  );
}

Future<void> showGroupInviteShareSheet({
  required BuildContext context,
  required String groupName,
  required String inviteCode,
}) {
  final link =
      'https://honara7ty.space/devotion-group-invite?code=$inviteCode';
  final message = 'انضم لمجموعة $groupName\n$link';

  return showYouthSheet<void>(
    context: context,
    builder: (context) {
      return Directionality(
        textDirection: TextDirection.rtl,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              youthSheetHandle(),
              const Text(
                'مشاركة الدعوة',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                groupName,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.fromLTRB(18, 20, 18, 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    const Text(
                      'كود الدعوة',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      inviteCode,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        letterSpacing: 3,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      link,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0284C7),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: inviteCode));
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('تم نسخ كود الدعوة')),
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      label: const Text(
                        'نسخ الكود',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF0F172A),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        backgroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => Share.share(message),
                      icon: const Icon(Icons.ios_share_rounded, size: 18),
                      label: const Text(
                        'مشاركة',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
}
