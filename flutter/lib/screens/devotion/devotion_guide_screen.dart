import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/devotion/devotion_articles.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/app_header.dart';
import '../../widgets/screen_hero.dart';

class DevotionGuideScreen extends StatelessWidget {
  const DevotionGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: AppStrings.devotionGuideTitle,
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: FutureBuilder<List<DevotionArticle>>(
              future: loadDevotionArticles(),
              builder: (context, snapshot) {
                final articles = snapshot.data ?? const <DevotionArticle>[];
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: articles.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return const ScreenHero(
                    icon: Icons.menu_book_outlined,
                    badge: 'شرح الخلوة',
                    eyebrow: 'شرح الخلوة',
                    title: 'شرح الخلوة',
                    body: 'خطوات عملية لوقت هادئ مع الله',
                  );
                }
                final article = articles[index - 1];
                final accent = devotionAccents[(index - 1) % devotionAccents.length];
                return Material(
                  color: card,
                  borderRadius: BorderRadius.circular(18),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () => context.push(
                      '${Routes.devotionDetail}?articleId=${article.id}',
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        border: Border(
                          right: BorderSide(color: accent, width: 4),
                        ),
                      ),
                      child: Row(
                        textDirection: TextDirection.rtl,
                        children: [
                          CircleAvatar(
                            radius: 26,
                            backgroundColor: accent.withValues(alpha: 0.16),
                            child: Icon(article.icon, color: accent),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  article.title,
                                  textDirection: TextDirection.rtl,
                                  style: TextStyle(
                                    color: text,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  article.summary,
                                  textDirection: TextDirection.rtl,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: muted,
                                    fontSize: 12,
                                    height: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_left, color: muted),
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
    );
  }
}
