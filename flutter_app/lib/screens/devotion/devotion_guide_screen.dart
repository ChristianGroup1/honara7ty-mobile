import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/devotion/devotion_articles.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/youth_screen_shell.dart';

class DevotionGuideScreen extends StatelessWidget {
  const DevotionGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = youthBg(isDark);
    final text = isDark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = isDark ? AppColors.darkMutedText : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          YouthAmbientBlurs(dark: isDark),
          Column(
            children: [
              YouthStickyHeader(
                dark: isDark,
                eyebrow: 'إرشاد روحي',
                title: AppStrings.devotionGuideTitle,
                onBack: () => Navigator.of(context).maybePop(),
                trailing: YouthIconBadge(
                  dark: isDark,
                  icon: Icons.menu_book_rounded,
                  color: const Color(0xFF0284C7),
                  bg: const Color(0xFFF0F9FF),
                ),
              ),
              Expanded(
                child: FutureBuilder<List<DevotionArticle>>(
                  future: loadDevotionArticles(),
                  builder: (context, snapshot) {
                    final articles =
                        snapshot.data ?? const <DevotionArticle>[];
                    if (snapshot.connectionState != ConnectionState.done) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      itemCount: articles.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return const YouthHeroBanner(
                            badge: 'شرح الخلوة',
                            title: 'خطوات عملية لوقت هادئ مع الله',
                            body:
                                'مقالات قصيرة تساعدك تبدأ خلوتك، تثبتها، وتفهم الفرق بين القراءة والدراسة.',
                            icon: Icons.auto_stories_rounded,
                          );
                        }
                        final article = articles[index - 1];
                        final accent = devotionAccents[
                            (index - 1) % devotionAccents.length];
                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(24),
                            onTap: () => context.push(
                              '${Routes.devotionDetail}?articleId=${article.id}',
                            ),
                            child: YouthSoftCard(
                              dark: isDark,
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Container(
                                    width: 52,
                                    height: 52,
                                    decoration: BoxDecoration(
                                      color: accent.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: accent.withValues(alpha: 0.25),
                                      ),
                                    ),
                                    child: Icon(article.icon, color: accent),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          article.title,
                                          style: TextStyle(
                                            fontFamily: AppFonts.ui,
                                            color: text,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          article.summary,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontFamily: AppFonts.ui,
                                            color: muted,
                                            fontSize: 12,
                                            height: 1.45,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    Icons.chevron_left_rounded,
                                    color: muted,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  },
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
