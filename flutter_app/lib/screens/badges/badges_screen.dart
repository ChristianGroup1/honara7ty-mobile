import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/badges/growth_tree.dart';
import '../../features/journal/devotion_service.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';

class _Badge {
  const _Badge({
    required this.key,
    required this.title,
    required this.fullTitle,
    required this.days,
    required this.tier,
    required this.tierLabel,
    required this.xp,
    required this.color,
    required this.soft,
    required this.gradient,
    required this.iconColor,
    required this.icon,
    required this.shareText,
    required this.celebrateTitle,
    required this.celebrateBody,
    required this.detailBody,
    required this.verse,
  });

  final String key;
  final String title;
  final String fullTitle;
  final int days;
  final String tier;
  final String tierLabel;
  final int xp;
  final Color color;
  final Color soft;
  final List<Color> gradient;
  final Color iconColor;
  final IconData icon;
  final String shareText;
  final String celebrateTitle;
  final String celebrateBody;
  final String detailBody;
  final String verse;

  String get xpLabel {
    final raw = '$xp'.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return raw;
  }
}

const _badges = [
  _Badge(
    key: 'weekly',
    title: 'أسبوع',
    fullTitle: 'أسبوع الأمانة',
    days: 7,
    tier: 'برونزي',
    tierLabel: 'برونزي ناصع',
    xp: 100,
    color: Color(0xFF0284C7),
    soft: Color(0xFFF0F9FF),
    gradient: [Color(0xFFFBBF24), Color(0xFFFDE047)],
    iconColor: Color(0xFF0F172A),
    icon: Icons.star_rounded,
    shareText: 'لقد أكملت ٧ أيام متواصلة من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت أسبوعاً كاملاً',
    celebrateBody: 'ثبات ٧ أيام متتالية في قراءة الكلمة والخلوة اليومية.',
    detailBody: 'الوصول لثبات ٧ أيام متتالية في الخلوة وقراءة الكلمة',
    verse: '«كُنْ أَمِينًا إِلَى الْمَوْتِ فَسَأُعْطِيكَ إِكْلِيلَ الْحَيَاةِ»',
  ),
  _Badge(
    key: 'biweekly',
    title: 'أسبوعان',
    fullTitle: 'أسبوعان من الثبات',
    days: 14,
    tier: 'فضي',
    tierLabel: 'فضي لامع',
    xp: 175,
    color: Color(0xFF0D9488),
    soft: Color(0xFFF0FDFA),
    gradient: [Color(0xFF2DD4BF), Color(0xFF34D399)],
    iconColor: Colors.white,
    icon: Icons.calendar_today_rounded,
    shareText: 'لقد أكملت ١٤ يوماً متواصلاً من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت أسبوعين',
    celebrateBody: 'ثبات ١٤ يوماً متتالية — عادة روحية تتجذّر.',
    detailBody: 'الوصول لثبات ١٤ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«اِثْبُتُوا فِيَّ وَأَنَا فِيكُمْ»',
  ),
  _Badge(
    key: 'monthly',
    title: 'شهر',
    fullTitle: 'شهر الأمانة',
    days: 30,
    tier: 'ذهبي',
    tierLabel: 'ذهبي مشرق',
    xp: 350,
    color: Color(0xFF4F46E5),
    soft: Color(0xFFEEF2FF),
    gradient: [Color(0xFF4F46E5), Color(0xFF8B5CF6)],
    iconColor: Colors.white,
    icon: Icons.military_tech_rounded,
    shareText: 'لقد أكملت ٣٠ يوماً متواصلاً من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت شهراً كاملاً',
    celebrateBody: 'ثلاثون يوماً من الثبات — جذر عميق في الكلمة.',
    detailBody: 'الوصول لثبات ٣٠ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«طُوبَى لِلَّذِينَ يَسْمَعُونَ كَلَامَ اللهِ وَيَحْفَظُونَهُ»',
  ),
  _Badge(
    key: 'twomonths',
    title: '٦٠ يوم',
    fullTitle: 'ستون يوماً',
    days: 60,
    tier: 'ياقوتي',
    tierLabel: 'ياقوتي متقد',
    xp: 650,
    color: Color(0xFFE11D48),
    soft: Color(0xFFFFF1F2),
    gradient: [Color(0xFFF43F5E), Color(0xFFEC4899)],
    iconColor: Colors.white,
    icon: Icons.bolt_rounded,
    shareText: 'لقد أكملت ٦٠ يوماً متواصلاً من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت ٦٠ يوماً',
    celebrateBody: 'ستون يوماً من الثبات — شعلة لا تنطفئ.',
    detailBody: 'الوصول لثبات ٦٠ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«نَارٌ مُتَّقِدَةٌ فِي عِظَامِي»',
  ),
  _Badge(
    key: 'quarterly',
    title: '٣ أشهر',
    fullTitle: 'ثلاثة أشهر',
    days: 90,
    tier: 'ذهبي',
    tierLabel: 'ذهبي ملكي',
    xp: 1000,
    color: Color(0xFFD97706),
    soft: Color(0xFFFFFBEB),
    gradient: [Color(0xFFFBBF24), Color(0xFFFDE047)],
    iconColor: Color(0xFF0F172A),
    icon: Icons.workspace_premium_rounded,
    shareText: 'لقد أكملت ٩٠ يوماً متواصلاً من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت ثلاثة أشهر',
    celebrateBody: 'تسعون يوماً من القرب — تاج أمانة.',
    detailBody: 'الوصول لثبات ٩٠ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«مَنْ يَغْلِبْ فَسَأُعْطِيهِ أَنْ يَجْلِسَ مَعِي»',
  ),
  _Badge(
    key: 'halfyear',
    title: '٦ أشهر',
    fullTitle: 'ستة أشهر',
    days: 180,
    tier: 'بلاتيني',
    tierLabel: 'بلاتيني نقي',
    xp: 2200,
    color: Color(0xFFDB2777),
    soft: Color(0xFFFDF2F8),
    gradient: [Color(0xFFEC4899), Color(0xFFF472B6)],
    iconColor: Colors.white,
    icon: Icons.favorite_rounded,
    shareText: 'لقد أكملت ١٨٠ يوماً متواصلاً من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت ستة أشهر',
    celebrateBody: 'نصف سنة من المحبة والثبات مع الله.',
    detailBody: 'الوصول لثبات ١٨٠ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«أَحْبِبِ الرَّبَّ إِلَهَكَ مِنْ كُلِّ قَلْبِكَ»',
  ),
  _Badge(
    key: 'yearly',
    title: 'سنة',
    fullTitle: 'سنة كاملة',
    days: 365,
    tier: 'ماسي',
    tierLabel: 'ماسي لامع',
    xp: 5000,
    color: Color(0xFF7C3AED),
    soft: Color(0xFFF5F3FF),
    gradient: [Color(0xFF7C3AED), Color(0xFFA855F7)],
    iconColor: Colors.white,
    icon: Icons.emoji_events_rounded,
    shareText: 'لقد أكملت سنة كاملة من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت سنة كاملة',
    celebrateBody: 'ثلاثمئة وخمسة وستون يوماً — إكليل حياة.',
    detailBody: 'الوصول لثبات ٣٦٥ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«قَدْ جَاهَدْتُ الْجِهَادَ الْحَسَنَ، أَكْمَلْتُ السَّعْيَ»',
  ),
  _Badge(
    key: 'dedication',
    title: 'سنتان',
    fullTitle: 'سنتان من الأمانة',
    days: 730,
    tier: 'أسطوري',
    tierLabel: 'أسطوري نادر',
    xp: 10000,
    color: Color(0xFF059669),
    soft: Color(0xFFECFDF5),
    gradient: [Color(0xFF059669), Color(0xFF14B8A6)],
    iconColor: Colors.white,
    icon: Icons.workspace_premium_rounded,
    shareText: 'لقد أكملت سنتين من وقتي مع الله.',
    celebrateTitle: 'مبارك! أتممت سنتين',
    celebrateBody: 'سنتان من الثبات — شجرة حياة وارفة.',
    detailBody: 'الوصول لثبات ٧٣٠ يوماً متتالية في الخلوة وقراءة الكلمة',
    verse: '«يَكُونُ كَشَجَرَةٍ مَغْرُوسَةٍ عِنْدَ مَجَارِي الْمِيَاهِ»',
  ),
];

class BadgesScreen extends StatefulWidget {
  const BadgesScreen({super.key});

  @override
  State<BadgesScreen> createState() => _BadgesScreenState();
}

class _BadgesScreenState extends State<BadgesScreen> {
  final _devotion = DevotionService();
  var _loading = true;
  var _streak = 0;
  var _days = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final logs = await _devotion.completedLogs();
      final dates = logs.map((log) => log['date'] as String);
      if (!mounted) return;
      setState(() {
        _days = dates.length;
        _streak = computeStreak(dates);
        _loading = false;
      });
      await _maybeCelebrate();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'تعذر تحميل الإنجازات';
        _loading = false;
      });
    }
  }

  Future<void> _maybeCelebrate() async {
    final earned = _badges.where((b) => _streak >= b.days).toList();
    if (earned.isEmpty || !mounted) return;
    final latest = earned.last;
    final prefs = await SharedPreferences.getInstance();
    final key = 'badges_celebrated_${latest.key}';
    if (prefs.getBool(key) == true) return;
    await prefs.setBool(key, true);
    if (!mounted) return;
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted) return;
    await _showBadgeCelebration(context, latest);
  }

  Future<void> _shareProgress() async {
    final xp = computeTotalXp(_days);
    await Share.share(
      'رحلتي في الثبات: ${arabicDigits(_streak)} يوم متواصل · ${arabicDigits(xp)} XP\nhttps://hanaraahti.app/badges',
    );
  }

  void _onBadgeTap(_Badge badge, {required bool earned}) {
    if (earned) {
      _showBadgeCelebration(context, badge);
    } else {
      _showLockedBadgeDetail(context, badge, streak: _streak);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final earned = _badges.where((b) => _streak >= b.days).toList();
    final locked = _badges.where((b) => _streak < b.days).toList();
    final next = locked.isEmpty ? _badges.last : locked.first;
    final xp = computeTotalXp(_days);

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          _BadgesHeader(
            dark: isDark,
            onBack: () => Navigator.of(context).maybePop(),
            onShare: _shareProgress,
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    color: AppColors.champagne,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                      children: [
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Text(
                              _error!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                color: AppColors.danger,
                              ),
                            ),
                          ),
                        _HeroStatsCard(
                          streak: _streak,
                          xp: xp,
                          earned: earned.length,
                          total: _badges.length,
                          next: next,
                          allUnlocked: locked.isEmpty,
                        ),
                        const SizedBox(height: 16),
                        GrowthTreeCard(
                          completedDays: _days,
                          streak: _streak,
                        ),
                        const SizedBox(height: 16),
                        _NextBadgeCard(
                          badge: next,
                          streak: _streak,
                          unlocked: locked.isEmpty,
                          onTap: () => _onBadgeTap(
                            next,
                            earned: locked.isEmpty,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            const Text(
                              'أوسمة في الطريق',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${arabicDigits(_badges.length)} محطات',
                              style: const TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _badges.length,
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.92,
                          ),
                          itemBuilder: (context, index) {
                            final badge = _badges[index];
                            final isEarned = _streak >= badge.days;
                            return _BadgeGridCard(
                              badge: badge,
                              streak: _streak,
                              earned: isEarned,
                              onTap: () =>
                                  _onBadgeTap(badge, earned: isEarned),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                        const _EncourageCard(),
                      ],
                    ),
                  ),
          ),
        ],
      ),
      // Same 5-tab bar as the rest of the app (don't change its style).
      bottomNavigationBar: _AppTabBar(
        isDark: isDark,
        currentIndex: -1,
        onTap: (index) => context.go('${Routes.mainTabs}?tab=$index'),
      ),
    );
  }
}

/// Mirrors main tabs bar — keep visual identical.
class _AppTabBar extends StatelessWidget {
  const _AppTabBar({
    required this.isDark,
    required this.currentIndex,
    required this.onTap,
  });

  final bool isDark;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final color = isDark ? AppColors.darkCard : AppColors.lightCard;
    final inactive =
        isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    Widget item(int index, IconData active, IconData idle, String label) {
      final selected = currentIndex == index;
      final tint =
          selected ? (isDark ? AppColors.gold : AppColors.navy) : inactive;
      return Expanded(
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => onTap(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: selected
                    ? (isDark
                        ? AppColors.darkCardMuted
                        : AppColors.lightCardMuted)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(selected ? active : idle, color: tint, size: 21),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      color: tint,
                      fontSize: 10,
                      height: 1.25,
                      fontWeight:
                          selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(color: border),
            boxShadow: AppShadows.card,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
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
    );
  }
}

class _BadgesHeader extends StatelessWidget {
  const _BadgesHeader({
    required this.dark,
    required this.onBack,
    required this.onShare,
  });

  final bool dark;
  final VoidCallback onBack;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final chipBg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);

    Widget action(IconData icon, VoidCallback onTap) {
      return Material(
        color: chipBg,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Icon(icon, size: 20, color: titleColor),
          ),
        ),
      );
    }

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: surface.withValues(alpha: 0.95),
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
          action(Icons.arrow_back_rounded, onBack),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'رحلة الثبات',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                    letterSpacing: 0.6,
                  ),
                ),
                Text(
                  AppStrings.badgesTitle,
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
          action(Icons.share_rounded, onShare),
        ],
      ),
    );
  }
}

class _HeroStatsCard extends StatelessWidget {
  const _HeroStatsCard({
    required this.streak,
    required this.xp,
    required this.earned,
    required this.total,
    required this.next,
    required this.allUnlocked,
  });

  final int streak;
  final int xp;
  final int earned;
  final int total;
  final _Badge next;
  final bool allUnlocked;

  /// Stitch uses Western digits with commas in the hero (e.g. 7,230).
  String _xp(int n) {
    final s = '$n';
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final fromEnd = s.length - i;
      buf.write(s[i]);
      if (fromEnd > 1 && fromEnd % 3 == 1) buf.write(',');
    }
    return buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    final nearLabel = allUnlocked
        ? 'فتحت كل الأوسمة'
        : 'أنت قريب من الوسام رقم ${earned + 1}';

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF020617), // slate-950
            Color(0xFF0F172A), // slate-900
            Color(0xFF1E1B4B), // indigo-950
          ],
        ),
        border: Border.all(color: const Color(0xCC1E293B)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF020617).withValues(alpha: 0.28),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top: tags .............. fire
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(99),
                              gradient: LinearGradient(
                                colors: [
                                  const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                  const Color(0xFFEAB308).withValues(alpha: 0.2),
                                ],
                              ),
                              border: Border.all(
                                color: const Color(0xFFFBBF24)
                                    .withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFFBBF24),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'رحلة الثبات',
                                  style: TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFFFCD34D),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.05),
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.1),
                              ),
                            ),
                            child: Text(
                              nearLabel,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFFCD34D)
                                    .withValues(alpha: 0.9),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            const Color(0xFFF59E0B).withValues(alpha: 0.3),
                            const Color(0xFFFACC15).withValues(alpha: 0.2),
                          ],
                        ),
                        border: Border.all(
                          color:
                              const Color(0xFFFBBF24).withValues(alpha: 0.4),
                        ),
                      ),
                      child: const Icon(
                        Icons.local_fire_department_rounded,
                        color: Color(0xFFFCD34D),
                        size: 20,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // Title + sparkle
                const Row(
                  children: [
                    Text(
                      'الثبات يصنع الأثر',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 6),
                    Text('✨', style: TextStyle(fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'كل يوم تلتزم فيه يقربك من وسام جديد ويقوي عادتك الروحية.',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFCBD5E1),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 14),
                // Twin pods: XP (glass) + streak (white)
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Colors.white.withValues(alpha: 0.12),
                                Colors.white.withValues(alpha: 0.05),
                              ],
                            ),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.15),
                            ),
                          ),
                          child: Stack(
                            children: [
                              Positioned(
                                top: -24,
                                right: -24,
                                child: Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFFFBBF24)
                                        .withValues(alpha: 0.15),
                                  ),
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'نقاط XP',
                                    style: TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        _xp(xp),
                                        style: const TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 24,
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Text(
                                        'XP',
                                        style: TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFFFBBF24),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    streak > 0
                                        ? '● نشاط مستمر'
                                        : '● ابدأ اليوم',
                                    style: TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: streak > 0
                                          ? const Color(0xFF34D399)
                                          : const Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border:
                                Border.all(color: const Color(0xFFF1F5F9)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text(
                                      'يوم متواصل',
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      streak > 0
                                          ? 'سلسلة حية'
                                          : 'ابدأ خلوتك اليوم',
                                      style: const TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFFD97706),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFFF1F5F9),
                                  ),
                                ),
                                child: Text(
                                  '$streak',
                                  style: const TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                    height: 1.1,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                // 3 summary blocks
                Row(
                  children: [
                    _miniStat('$earned', 'تم فتحه'),
                    const SizedBox(width: 8),
                    _miniStat('$total', 'إجمالي الأوسمة'),
                    const SizedBox(width: 8),
                    _miniStat('$streak', 'أيام الثبات'),
                  ],
                ),
              ],
            ),
      ),
    );
  }

  Widget _miniStat(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NextBadgeCard extends StatelessWidget {
  const _NextBadgeCard({
    required this.badge,
    required this.streak,
    required this.unlocked,
    required this.onTap,
  });

  final _Badge badge;
  final int streak;
  final bool unlocked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final remaining = (badge.days - streak).clamp(0, badge.days);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFFFFBEB), Color(0xFFFFFDE7), Colors.white],
            ),
            border: Border.all(color: const Color(0xFFFDE68A).withValues(alpha: 0.7)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        unlocked ? 'آخر وسام' : 'الوسام القادم',
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFB45309),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      badge.title,
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      '${arabicDigits(badge.days)} يوم • ${badge.tier} • ${badge.xpLabel} XP',
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF475569),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      unlocked
                          ? 'فتحت كل المحطات'
                          : 'فاضل ${arabicDigits(remaining)} يوم وافتحه',
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: badge.gradient,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: badge.color.withValues(alpha: 0.28),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(badge.icon, size: 32, color: badge.iconColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgeGridCard extends StatelessWidget {
  const _BadgeGridCard({
    required this.badge,
    required this.streak,
    required this.earned,
    required this.onTap,
  });

  final _Badge badge;
  final int streak;
  final bool earned;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final remaining = (badge.days - streak).clamp(0, badge.days);
    final progress =
        badge.days == 0 ? 1.0 : (streak / badge.days).clamp(0.0, 1.0);
    final pct = (progress * 100).round();

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: earned
                  ? badge.color.withValues(alpha: 0.35)
                  : const Color(0xFFF1F5F9),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: badge.soft,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${badge.tier} • ${badge.xpLabel} XP',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: badge.color,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: badge.soft,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(badge.icon, size: 16, color: badge.color),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                badge.title,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              Text(
                earned
                    ? 'تم الفتح ✓'
                    : 'تبقى ${arabicDigits(remaining)} يوم للوصول',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: earned ? badge.color : const Color(0xFF94A3B8),
                ),
              ),
              const SizedBox(height: 8),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Text(
                    'نسبة التقدم',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${arabicDigits(pct)}%',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: badge.color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                earned
                    ? '🎉 مفتوح'
                    : '⏳ ${arabicDigits(remaining)} يوم متبقي',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 9,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EncourageCard extends StatelessWidget {
  const _EncourageCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'استمر في السير',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'كل يوم خطوة نحو الثبات والقرب من الله. شارك إنجازاتك مع أصدقائك!',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF64748B),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.lightbulb_rounded,
              color: Color(0xFFD97706),
              size: 22,
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> _showLockedBadgeDetail(
  BuildContext context,
  _Badge badge, {
  required int streak,
}) {
  final remaining = (badge.days - streak).clamp(0, badge.days);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    barrierColor: const Color(0xFF020617).withValues(alpha: 0.7),
    builder: (context) {
      return SafeArea(
        top: false,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(24, 10, 24, 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(36)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 6,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'تفاصيل المحطة',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFB45309),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Material(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      onTap: () => Navigator.pop(context),
                      borderRadius: BorderRadius.circular(12),
                      child: const SizedBox(
                        width: 32,
                        height: 32,
                        child: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Divider(color: Color(0xFFF1F5F9)),
              const SizedBox(height: 12),
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(28),
                      color: badge.color.withValues(alpha: 0.15),
                    ),
                  ),
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: badge.gradient,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: badge.color.withValues(alpha: 0.25),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Icon(badge.icon, size: 36, color: badge.iconColor),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'وسام: ${badge.fullTitle}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                badge.detailBody,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          const Text(
                            'مكافأة الإنجاز',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '+${badge.xpLabel} XP',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFD97706),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 36,
                      color: const Color(0xFFE2E8F0),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          const Text(
                            'نوع الوسام',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            badge.tierLabel,
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB).withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: const Color(0xFFFDE68A).withValues(alpha: 0.6),
                  ),
                ),
                child: Row(
                  children: [
                    const Text(
                      'أيام متبقية للفتح:',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF78350F),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${arabicDigits(remaining)} أيام متواصلة',
                      style: const TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Text(
                badge.verse,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.verse,
                  fontSize: 12,
                  color: Color(0xFF64748B),
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: const Text(
                    'حسناً، فهمت',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

Future<void> _showBadgeCelebration(BuildContext context, _Badge badge) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'celebration',
    barrierColor: const Color(0xFF020617).withValues(alpha: 0.75),
    transitionDuration: const Duration(milliseconds: 250),
    pageBuilder: (context, anim, secondary) {
      return const SizedBox.shrink();
    },
    transitionBuilder: (context, anim, secondary, child) {
      final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutBack);
      return FadeTransition(
        opacity: anim,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.92, end: 1).animate(curved),
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: MediaQuery.sizeOf(context).width - 48,
                constraints: const BoxConstraints(maxWidth: 340),
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(36),
                  border: Border.all(
                    color: const Color(0xFFFDE68A).withValues(alpha: 0.6),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 40,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: -40,
                      left: -40,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color:
                              const Color(0xFFFBBF24).withValues(alpha: 0.22),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: -40,
                      right: -40,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color:
                              const Color(0xFFEAB308).withValues(alpha: 0.18),
                        ),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 96,
                          height: 96,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 96,
                                height: 96,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFFFBBF24)
                                      .withValues(alpha: 0.25),
                                ),
                              ),
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(24),
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: badge.gradient,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color:
                                          badge.color.withValues(alpha: 0.3),
                                      blurRadius: 18,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  badge.icon,
                                  size: 36,
                                  color: badge.iconColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: const Text(
                            'وسام مفتوح حديثاً',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFB45309),
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          badge.celebrateTitle,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          badge.celebrateBody,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: const Color(0xFFFDE68A)
                                  .withValues(alpha: 0.8),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.bolt_rounded,
                                color: Color(0xFFD97706),
                                size: 20,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '+${badge.xpLabel} XP مكتسبة',
                                style: const TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFFB45309),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          width: double.infinity,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                              gradient: const LinearGradient(
                                colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFF59E0B)
                                      .withValues(alpha: 0.28),
                                  blurRadius: 12,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  Share.share(
                                    '${badge.shareText}\n\nوسام ${badge.tier} · ${badge.xpLabel} XP\nhttps://hanaraahti.app/badges/${badge.key}',
                                  );
                                },
                                borderRadius: BorderRadius.circular(18),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 15),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.share_rounded,
                                        size: 18,
                                        color: Color(0xFF0F172A),
                                      ),
                                      SizedBox(width: 8),
                                      Text(
                                        'مشاركة هذا الإنجاز مع أصدقائي',
                                        style: TextStyle(
                                          fontFamily: AppFonts.ui,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () => Navigator.pop(context),
                            style: TextButton.styleFrom(
                              backgroundColor: const Color(0xFFF1F5F9),
                              foregroundColor: const Color(0xFF334155),
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18),
                              ),
                            ),
                            child: const Text(
                              'متابعة المسيرة',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
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
        ),
      );
    },
  );
}
