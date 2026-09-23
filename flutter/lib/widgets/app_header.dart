import 'package:flutter/material.dart';

import '../core/theme.dart';

class AppHeader extends StatelessWidget {
  final String title;
  final String? eyebrow;
  final VoidCallback? onBack;
  final Widget? leading;
  final Widget? trailing;
  final List<Widget>? actions;

  const AppHeader({
    super.key,
    required this.title,
    this.eyebrow,
    this.onBack,
    this.leading,
    this.trailing,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? AppColors.headerGradientDark : AppColors.headerGradientLight;
    final side = trailing ??
        (actions == null
            ? null
            : Row(mainAxisSize: MainAxisSize.min, children: actions!));
    final start = leading ??
        (onBack == null
            ? null
            : _HeaderAction(
                icon: Icons.arrow_forward_ios_rounded,
                onPressed: onBack!,
              ));

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(color: colors.first, child: const SafeArea(bottom: false, child: SizedBox.shrink())),
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
              colors: colors,
            ),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -60,
                left: -30,
                child: Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.accent.withValues(alpha: 0.16),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                child: Directionality(
                  textDirection: TextDirection.rtl,
                  child: Row(
                    children: [
                      if (start != null) ...[
                        start,
                        const SizedBox(width: 12),
                      ],
                      Expanded(
                        child: Column(
                          crossAxisAlignment: eyebrow == null
                              ? CrossAxisAlignment.center
                              : CrossAxisAlignment.start,
                          children: [
                            if (eyebrow != null)
                              Text(
                                eyebrow!,
                                style: const TextStyle(
                                  color: AppColors.gold,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            Text(
                              title,
                              textAlign: eyebrow == null ? TextAlign.center : TextAlign.start,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                height: 1.3,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (side != null) ...[
                        const SizedBox(width: 12),
                        side,
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class HeaderAction extends StatelessWidget {
  const HeaderAction({super.key, required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return _HeaderAction(icon: icon, onPressed: onPressed);
  }
}

class _HeaderAction extends StatelessWidget {
  const _HeaderAction({required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.12),
      shape: const CircleBorder(
        side: BorderSide(color: Color(0x24FFFFFF)),
      ),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}
