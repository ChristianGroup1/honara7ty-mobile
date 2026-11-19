import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';

class AboutIdeaScreen extends StatelessWidget {
  const AboutIdeaScreen({super.key});

  static const _points = <({IconData icon, Color tint, Color bg, String title, String body})>[
    (
      icon: Icons.menu_book_rounded,
      tint: Color(0xFF0284C7),
      bg: Color(0xFFF0F9FF),
      title: 'كلمة الله كل يوم',
      body:
          'هنا نساعدك تفتح كتابك المقدس وتقرأ فيه كل يوم بانتظام، وفي وقت محدد يناسبك علشان تفضل ثابت في علاقتك مع كلمة الله.',
    ),
    (
      icon: Icons.schedule_rounded,
      tint: Color(0xFFD97706),
      bg: Color(0xFFFFFBEB),
      title: 'وقت ثابت مع الرب',
      body:
          'اقرأ كتابك كل يوم، فيه قوة ليومك ونور لطريقك. التذكير اليومي بيساعدك تثبت العادة من غير ما تنساها.',
    ),
    (
      icon: Icons.groups_rounded,
      tint: Color(0xFF4F46E5),
      bg: Color(0xFFEEF2FF),
      title: 'شركة وتشجيع',
      body:
          'تابع خلوتك، شارك مع مجموعات، احفظ آيات، وسجّل صلواتك وتأملاتك — كل ده في مكان واحد يقوّي مسيرتك.',
    ),
    (
      icon: Icons.favorite_rounded,
      tint: Color(0xFFE11D48),
      bg: Color(0xFFFFF1F2),
      title: 'خلّي البداية اليوم',
      body:
          'ابدأ من النهاردة، حدد وقت تقابل فيه مع الله وتتغذى من كلمته الحية. الاستمرارية أهم من الكمال.',
    ),
  ];

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
                eyebrow: 'هنا راحتي',
                title: AppStrings.moreAboutIdeaTitle,
                onBack: () => Navigator.of(context).maybePop(),
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.lightbulb_rounded,
                  color: const Color(0xFFD97706),
                  bg: const Color(0xFFFFFBEB),
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                  children: [
                    const YouthHeroBanner(
                      badge: 'ليش التطبيق؟',
                      title: 'مرحباً بك في هنا راحتي',
                      body:
                          'فكرة بسيطة: وقت هادئ ثابت مع الله كل يوم — قراءة، صلاة، حفظ، وتشجيع في المسيرة.',
                      icon: Icons.auto_awesome_rounded,
                    ),
                    const SizedBox(height: 16),
                    YouthSoftCard(
                      dark: isDark,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.format_quote_rounded,
                                color: isDark
                                    ? const Color(0xFFFBBF24)
                                    : const Color(0xFFD97706),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'آية الفكرة',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontWeight: FontWeight.w900,
                                  color: text,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '«وُجِدَ كَلاَمُكَ فَأَكَلْتُهُ، فَكَانَ كَلاَمُكَ لِي لِلْفَرَحِ وَلِبَهْجَةِ قَلْبِي»',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              fontStyle: FontStyle.italic,
                              color: text,
                              height: 1.7,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'إرميا ١٥ : ١٦',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: isDark
                                    ? const Color(0xFFFCD34D)
                                    : const Color(0xFF92400E),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'إيه الفكرة؟',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        color: text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'أربع ركائز بسيطة لوقت هادئ مع الله',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontWeight: FontWeight.w500,
                        fontSize: 12,
                        color: muted,
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (var i = 0; i < _points.length; i++) ...[
                      YouthSoftCard(
                        dark: isDark,
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? _points[i].tint.withValues(alpha: 0.18)
                                    : _points[i].bg,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(
                                _points[i].icon,
                                color: _points[i].tint,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${(i + 1).toString().padLeft(2, '0')}  ${_points[i].title}',
                                    style: TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13,
                                      color: text,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _points[i].body,
                                    style: TextStyle(
                                      fontFamily: AppFonts.ui,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 12,
                                      height: 1.55,
                                      color: muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    const SizedBox(height: 8),
                    YouthPrimaryButton(
                      label: 'ابدأ خلوتك من الرئيسية',
                      icon: Icons.home_rounded,
                      onTap: () => context.go('${Routes.mainTabs}?tab=0'),
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
