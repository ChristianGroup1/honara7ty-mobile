import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../features/groups/devotion_groups_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';

class DevotionGroupInviteScreen extends StatefulWidget {
  const DevotionGroupInviteScreen({super.key, required this.inviteCode});
  final String inviteCode;

  @override
  State<DevotionGroupInviteScreen> createState() =>
      _DevotionGroupInviteScreenState();
}

class _DevotionGroupInviteScreenState extends State<DevotionGroupInviteScreen> {
  var _joining = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<AuthProvider>().clearPendingDevotionGroupInvite();
      }
    });
  }

  Future<void> _join() async {
    setState(() => _joining = true);
    try {
      final group = await DevotionGroupsService().join(widget.inviteCode);
      if (!mounted) return;
      context.go('${Routes.devotionGroupDetails}?groupId=${group.id}');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر الانضمام بهذه الدعوة')),
        );
      }
    } finally {
      if (mounted) setState(() => _joining = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: youthBg(isDark),
      body: Stack(
        children: [
          YouthAmbientBlurs(dark: isDark),
          Column(
            children: [
              YouthStickyHeader(
                dark: isDark,
                eyebrow: 'دعوة مجموعة',
                title: 'انضم للخلوة',
                onBack: () => Navigator.of(context).maybePop(),
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.mail_rounded,
                  color: const Color(0xFF0369A1),
                  bg: const Color(0xFFF0F9FF),
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                  children: [
                    const YouthHeroBanner(
                      badge: 'دعوة خاصة',
                      title: 'تمت دعوتك للانضمام لمجموعة خلوة',
                      body:
                          'اضغط انضم عشان تتابع الخلوة مع أصحابك وتشوف التزام اليوم سوا.',
                      icon: Icons.group_add_rounded,
                    ),
                    const SizedBox(height: 16),
                    YouthSoftCard(
                      dark: isDark,
                      child: Column(
                        children: [
                          Text(
                            'كود الدعوة',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: muted,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            widget.inviteCode.isEmpty
                                ? '—'
                                : widget.inviteCode,
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: text,
                              letterSpacing: 2,
                            ),
                          ),
                          const SizedBox(height: 18),
                          YouthPrimaryButton(
                            label: _joining
                                ? 'جارٍ الانضمام...'
                                : 'انضم للمجموعة',
                            icon: Icons.login_rounded,
                            busy: _joining,
                            onTap: widget.inviteCode.isEmpty ? null : _join,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: YouthAppTabBar(
        isDark: isDark,
        currentIndex: -1,
      ),
    );
  }
}
