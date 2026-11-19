import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/strings.dart';
import '../core/theme.dart';
import '../routing/app_router.dart';

Color youthBg(bool dark) =>
    dark ? AppColors.darkBackground : const Color(0xFFF8FAFC);

class YouthAmbientBlurs extends StatelessWidget {
  const YouthAmbientBlurs({super.key, required this.dark});

  final bool dark;

  @override
  Widget build(BuildContext context) {
    // Ambient yellow/blue blobs removed across the youth UI.
    return const SizedBox.shrink();
  }
}

class YouthStickyHeader extends StatelessWidget {
  const YouthStickyHeader({
    super.key,
    required this.dark,
    required this.eyebrow,
    required this.title,
    this.onBack,
    this.trailing,
  });

  final bool dark;
  final String eyebrow;
  final String title;
  final VoidCallback? onBack;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final chipBg = dark ? AppColors.darkCardMuted : Colors.white;

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: surface.withValues(alpha: 0.88),
        border: Border(bottom: BorderSide(color: border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          if (onBack != null) ...[
            Material(
              color: chipBg,
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                onTap: onBack,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: border.withValues(alpha: 0.8)),
                  ),
                  child: Icon(
                    Icons.arrow_back_rounded,
                    size: 20,
                    color: titleColor,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: titleColor,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class YouthHeroBanner extends StatelessWidget {
  const YouthHeroBanner({
    super.key,
    required this.badge,
    required this.title,
    required this.body,
    this.icon = Icons.auto_awesome_rounded,
  });

  final String badge;
  final String title;
  final String body;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
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
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
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
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 12, color: const Color(0xFFFCD34D)),
                    const SizedBox(width: 6),
                    Text(
                      badge,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFFCD34D),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
                child: Icon(icon, size: 20, color: const Color(0xFFFCD34D)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: const TextStyle(
              fontFamily: AppFonts.ui,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Color(0xFFCBD5E1),
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

class YouthSoftCard extends StatelessWidget {
  const YouthSoftCard({
    super.key,
    required this.dark,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });

  final bool dark;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: dark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: dark ? AppColors.darkBorder : const Color(0xFFF1F5F9),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}

class YouthPrimaryButton extends StatelessWidget {
  const YouthPrimaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon = Icons.check_rounded,
    this.busy = false,
  });

  final String label;
  final VoidCallback? onTap;
  final IconData icon;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: busy ? null : onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.centerRight,
              end: Alignment.centerLeft,
              colors: [
                Color(0xFF0284C7),
                Color(0xFF0EA5E9),
                Color(0xFF38BDF8),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0EA5E9).withValues(alpha: 0.22),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (busy)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                else
                  Icon(icon, size: 18, color: Colors.white),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class YouthIconBadge extends StatelessWidget {
  const YouthIconBadge({
    super.key,
    required this.dark,
    required this.icon,
    this.color = const Color(0xFFD97706),
    this.bg = const Color(0xFFFFFBEB),
  });

  final bool dark;
  final IconData icon;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: dark ? color.withValues(alpha: 0.18) : bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: dark
              ? color.withValues(alpha: 0.3)
              : color.withValues(alpha: 0.18),
        ),
      ),
      child: Icon(icon, size: 20, color: color),
    );
  }
}

/// Shared bottom tab bar (for main tabs and pushed screens).
class YouthAppTabBar extends StatelessWidget {
  const YouthAppTabBar({
    super.key,
    required this.isDark,
    required this.currentIndex,
    this.onTap,
  });

  final bool isDark;
  final int currentIndex;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final barFill = isDark ? const Color(0xFF0B1220) : Colors.white;
    final tray = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final inactive =
        isDark ? const Color(0xFF94A3B8) : const Color(0xFF94A3B8);
    final border = isDark ? const Color(0xFF243044) : const Color(0xFFE2E8F0);
    final accent = isDark ? AppColors.gold : AppColors.navy;
    final iconOnAccent = isDark ? const Color(0xFF0B1220) : Colors.white;

    Widget item(int index, IconData active, IconData idle, String label) {
      final selected = currentIndex == index;
      final labelColor = selected ? accent : inactive;
      return Expanded(
        child: Semantics(
          button: true,
          selected: selected,
          label: label,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(22),
              onTap: () {
                if (onTap != null) {
                  onTap!(index);
                } else {
                  context.go('${Routes.mainTabs}?tab=$index');
                }
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 240),
                      curve: Curves.easeOutCubic,
                      width: 44,
                      height: 34,
                      decoration: BoxDecoration(
                        color: selected ? accent : Colors.transparent,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                  color: accent.withValues(alpha: 0.28),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : null,
                      ),
                      child: Icon(
                        selected ? active : idle,
                        size: 20,
                        color: selected ? iconOnAccent : inactive,
                      ),
                    ),
                    const SizedBox(height: 5),
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 200),
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        color: labelColor,
                        fontSize: 10,
                        height: 1.1,
                        fontWeight:
                            selected ? FontWeight.w800 : FontWeight.w600,
                      ),
                      child: Text(
                        label,
                        maxLines: 2,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Material(
      color: tray,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: barFill,
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: border),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A)
                      .withValues(alpha: isDark ? 0.45 : 0.08),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                  spreadRadius: -6,
                ),
              ],
            ),
            child: SizedBox(
              height: 72,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
                child: Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    item(0, Icons.home_rounded, Icons.home_outlined,
                        AppStrings.navHome),
                    item(1, Icons.menu_book_rounded, Icons.menu_book_outlined,
                        AppStrings.navBible),
                    item(
                      2,
                      Icons.notifications_active_rounded,
                      Icons.notifications_none_rounded,
                      AppStrings.navSettings,
                    ),
                    item(3, Icons.more_horiz_rounded, Icons.more_horiz_rounded,
                        AppStrings.navMore),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

