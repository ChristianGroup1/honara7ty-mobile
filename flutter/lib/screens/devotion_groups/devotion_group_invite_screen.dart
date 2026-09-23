import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/groups/devotion_groups_service.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';

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
      if (!mounted) {
        return;
      }
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
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: 'دعوة المجموعة',
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'تمت دعوتك للانضمام لمجموعة خلوة',
                    textDirection: TextDirection.rtl,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Text('الكود: ${widget.inviteCode}'),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed:
                        widget.inviteCode.isEmpty || _joining ? null : _join,
                    child:
                        Text(_joining ? 'جارٍ الانضمام...' : 'انضم للمجموعة'),
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
