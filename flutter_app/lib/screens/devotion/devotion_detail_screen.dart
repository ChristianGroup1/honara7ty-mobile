import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../features/devotion/devotion_articles.dart';
import '../../features/focus/focus_mode.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/custom_alert_dialog.dart';

class DevotionDetailScreen extends StatelessWidget {
  const DevotionDetailScreen({super.key, required this.articleId});

  final String articleId;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<DevotionArticle>>(
      future: loadDevotionArticles(),
      builder: (context, snapshot) {
        final articles = snapshot.data ?? const <DevotionArticle>[];
        final article = devotionArticleById(articles, articleId);
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final isDark = context.watch<ThemeProvider>().isNightMode;
        final bg =
            isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);

        if (article == null) {
          return Scaffold(
            backgroundColor: bg,
            body: Column(
              children: [
                _DetailHeader(
                  dark: isDark,
                  title: 'شرح الخلوة',
                  onBack: () => Navigator.of(context).maybePop(),
                ),
                const Expanded(
                  child: Center(child: Text('مقالة غير موجودة')),
                ),
              ],
            ),
            bottomNavigationBar: _AppTabBar(
              isDark: isDark,
              currentIndex: -1,
              onTap: (index) =>
                  context.go('${Routes.mainTabs}?tab=$index'),
            ),
          );
        }

        final index = articles.indexWhere((item) => item.id == article.id);
        final accent = devotionAccents[index % devotionAccents.length];
        DevotionSection? quoteSection;
        for (final section in article.sections) {
          if (section.heading == null &&
              section.body != null &&
              section.items.isEmpty) {
            quoteSection = section;
            break;
          }
        }
        final contentSections = [
          for (final section in article.sections)
            if (section != quoteSection) section,
        ];

        return Scaffold(
          backgroundColor: bg,
          body: Stack(
            children: [
              Column(
                children: [
                  _DetailHeader(
                    dark: isDark,
                    title: article.title,
                    onBack: () => Navigator.of(context).maybePop(),
                    onShare: () => Share.share(
                      '${article.title}\n\n${article.summary}',
                    ),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      children: [
                        _HeroCard(article: article),
                        if (article.youtubeUrl != null) ...[
                          const SizedBox(height: 16),
                          _VideoCard(
                            dark: isDark,
                            title: article.title,
                            url: article.youtubeUrl!,
                          ),
                        ],
                        if (quoteSection?.body != null) ...[
                          const SizedBox(height: 16),
                          _QuoteCard(
                            dark: isDark,
                            body: quoteSection!.body!,
                          ),
                        ],
                        for (final section in contentSections) ...[
                          const SizedBox(height: 16),
                          _SectionBlock(
                            dark: isDark,
                            section: section,
                            accent: accent,
                          ),
                        ],
                        const SizedBox(height: 20),
                        _PrimaryCta(
                          label: 'ضبط موعد وخطة خلوتي اليومية',
                          icon: Icons.alarm_on_rounded,
                          onTap: () =>
                              context.push(Routes.dailyNotifications),
                        ),
                        const SizedBox(height: 10),
                        _SecondaryCta(
                          dark: isDark,
                          label: 'العودة للرئيسية',
                          icon: Icons.home_rounded,
                          onTap: () =>
                              context.go('${Routes.mainTabs}?tab=0'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          bottomNavigationBar: _AppTabBar(
            isDark: isDark,
            currentIndex: -1,
            onTap: (index) => context.go('${Routes.mainTabs}?tab=$index'),
          ),
        );
      },
    );
  }
}

class _DetailHeader extends StatelessWidget {
  const _DetailHeader({
    required this.dark,
    required this.title,
    required this.onBack,
    this.onShare,
  });

  final bool dark;
  final String title;
  final VoidCallback onBack;
  final VoidCallback? onShare;

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
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'إرشاد روحي',
                  style: TextStyle(
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
          const _FocusToggle(),
          if (onShare != null) ...[
            const SizedBox(width: 8),
            Material(
              color: dark
                  ? const Color(0xFF78350F).withValues(alpha: 0.35)
                  : const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                onTap: onShare,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: dark
                          ? const Color(0xFFFBBF24).withValues(alpha: 0.3)
                          : const Color(0xFFFEF3C7),
                    ),
                  ),
                  child: Icon(
                    Icons.share_rounded,
                    size: 20,
                    color: dark
                        ? const Color(0xFFFBBF24)
                        : const Color(0xFFD97706),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.article});

  final DevotionArticle article;

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
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.15),
                      ),
                    ),
                    child: Icon(
                      article.icon,
                      color: const Color(0xFFFBBF24),
                      size: 24,
                    ),
                  ),
                  const Spacer(),
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
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.auto_stories_rounded,
                          size: 12,
                          color: Color(0xFFFCD34D),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'شرح ودليل عملي',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFFCD34D),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                article.title == 'الخلوة' ? 'الخلوة الروحية' : article.title,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.10),
                  ),
                ),
                child: Text(
                  _asQuote(article.summary),
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 15,
                    fontStyle: FontStyle.italic,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFE2E8F0),
                    height: 1.55,
                  ),
                ),
              ),
            ],
          ),
    );
  }
}

class _VideoCard extends StatelessWidget {
  const _VideoCard({
    required this.dark,
    required this.title,
    required this.url,
  });

  final bool dark;
  final String title;
  final String url;

  String? get _videoId {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    if (uri.host.contains('youtu.be') && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.first;
    }
    return uri.queryParameters['v'];
  }

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final thumb = _videoId == null
        ? null
        : 'https://img.youtube.com/vi/$_videoId/hqdefault.jpg';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: dark
                      ? const Color(0xFF881337).withValues(alpha: 0.4)
                      : const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.smart_display_rounded,
                  size: 16,
                  color: dark
                      ? const Color(0xFFFB7185)
                      : const Color(0xFFE11D48),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'ملخص مرئي سريع',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: dark
                      ? AppColors.darkCardMuted
                      : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'فيديو توضيحي',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: dark
                        ? AppColors.darkMutedText
                        : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => launchUrl(
                Uri.parse(url),
                mode: LaunchMode.externalApplication,
              ),
              borderRadius: BorderRadius.circular(16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (thumb != null)
                        Image.network(
                          thumb,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFF0F172A),
                          ),
                        )
                      else
                        Container(color: const Color(0xFF0F172A)),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              const Color(0xFF0F172A).withValues(alpha: 0.75),
                            ],
                          ),
                        ),
                      ),
                      Center(
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(0xFFDC2626),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFDC2626)
                                    .withValues(alpha: 0.35),
                                blurRadius: 18,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 34,
                          ),
                        ),
                      ),
                      Positioned(
                        left: 12,
                        right: 12,
                        bottom: 12,
                        child: Row(
                          children: [
                            Flexible(
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: AppFonts.ui,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'يوتيوب',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuoteCard extends StatelessWidget {
  const _QuoteCard({required this.dark, required this.body});

  final bool dark;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: dark
              ? [
                  const Color(0xFF78350F).withValues(alpha: 0.35),
                  AppColors.darkCard,
                ]
              : const [
                  Color(0xFFFFFBEB),
                  Color(0xFFFFF7ED),
                  Colors.white,
                ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: dark
              ? const Color(0xFFFBBF24).withValues(alpha: 0.3)
              : const Color(0xFFFDE68A).withValues(alpha: 0.7),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.format_quote_rounded,
            size: 26,
            color: dark
                ? const Color(0xFFFBBF24)
                : const Color(0xFFD97706),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _asQuote(body),
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: dark
                        ? AppColors.darkText
                        : const Color(0xFF334155),
                    height: 1.65,
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '— إدوارد بوندز',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: dark
                          ? const Color(0xFFFCD34D)
                          : const Color(0xFF92400E),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _SectionTone { neutral, sky, indigo, emerald }

class _SectionBlock extends StatelessWidget {
  const _SectionBlock({
    required this.dark,
    required this.section,
    required this.accent,
  });

  final bool dark;
  final DevotionSection section;
  final Color accent;

  _SectionTone get _tone {
    final heading = section.heading ?? '';
    if (heading.startsWith('أ') || heading.contains('القراءة وقت')) {
      return _SectionTone.sky;
    }
    if (heading.startsWith('ب') ||
        heading.contains('دراسة الكتاب') ||
        heading == 'ب - دراسة الكتاب') {
      return _SectionTone.indigo;
    }
    if (heading.contains('ضرورة')) return _SectionTone.emerald;
    return _SectionTone.neutral;
  }

  IconData get _icon {
    switch (_tone) {
      case _SectionTone.sky:
        return Icons.flight_rounded;
      case _SectionTone.indigo:
        return Icons.directions_car_rounded;
      case _SectionTone.emerald:
        return Icons.verified_rounded;
      case _SectionTone.neutral:
        if ((section.heading ?? '').contains('ما هو')) {
          return Icons.help_outline_rounded;
        }
        if ((section.heading ?? '').contains('الكتاب المقدس')) {
          return Icons.compare_arrows_rounded;
        }
        return Icons.auto_stories_rounded;
    }
  }

  Color get _iconBg {
    switch (_tone) {
      case _SectionTone.sky:
        return dark
            ? const Color(0xFF0C4A6E).withValues(alpha: 0.4)
            : const Color(0xFFF0F9FF);
      case _SectionTone.indigo:
        return dark
            ? const Color(0xFF312E81).withValues(alpha: 0.4)
            : const Color(0xFFEEF2FF);
      case _SectionTone.emerald:
        return dark
            ? const Color(0xFF064E3B).withValues(alpha: 0.4)
            : const Color(0xFFECFDF5);
      case _SectionTone.neutral:
        return dark
            ? const Color(0xFF0C4A6E).withValues(alpha: 0.35)
            : const Color(0xFFF0F9FF);
    }
  }

  Color get _iconColor {
    switch (_tone) {
      case _SectionTone.sky:
        return const Color(0xFF0284C7);
      case _SectionTone.indigo:
        return const Color(0xFF4F46E5);
      case _SectionTone.emerald:
        return const Color(0xFF059669);
      case _SectionTone.neutral:
        return const Color(0xFF0284C7);
    }
  }

  @override
  Widget build(BuildContext context) {
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF64748B);
    final isComparison =
        _tone == _SectionTone.sky || _tone == _SectionTone.indigo;

    if (isComparison) {
      return _ComparisonCard(
        dark: dark,
        section: section,
        tone: _tone,
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (section.heading != null)
            Container(
              padding: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: border)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: _iconBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_icon, size: 18, color: _iconColor),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      section.heading!,
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: titleColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (section.body != null) ...[
            if (section.heading != null) const SizedBox(height: 12),
            Text(
              section.body!,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: muted,
                height: 1.65,
              ),
            ),
          ],
          for (var i = 0; i < section.items.length; i++) ...[
            const SizedBox(height: 10),
            _ItemCard(
              dark: dark,
              index: i + 1,
              raw: section.items[i],
              accent: _tone == _SectionTone.emerald
                  ? const Color(0xFF059669)
                  : const Color(0xFF0EA5E9),
              rich: _tone == _SectionTone.emerald,
            ),
          ],
        ],
      ),
    );
  }
}

class _ComparisonCard extends StatelessWidget {
  const _ComparisonCard({
    required this.dark,
    required this.section,
    required this.tone,
  });

  final bool dark;
  final DevotionSection section;
  final _SectionTone tone;

  @override
  Widget build(BuildContext context) {
    final isSky = tone == _SectionTone.sky;
    final bg = dark
        ? (isSky
            ? const Color(0xFF0C4A6E).withValues(alpha: 0.25)
            : const Color(0xFF312E81).withValues(alpha: 0.25))
        : (isSky ? const Color(0xFFF0F9FF) : const Color(0xFFEEF2FF));
    final border = dark
        ? (isSky
            ? const Color(0xFF38BDF8).withValues(alpha: 0.25)
            : const Color(0xFF818CF8).withValues(alpha: 0.25))
        : (isSky ? const Color(0xFFE0F2FE) : const Color(0xFFE0E7FF));
    final titleColor = dark
        ? (isSky ? const Color(0xFFE0F2FE) : const Color(0xFFE0E7FF))
        : (isSky ? const Color(0xFF082F49) : const Color(0xFF1E1B4B));
    final badgeColor = dark ? AppColors.darkCard : Colors.white;
    final badgeText =
        isSky ? const Color(0xFF0369A1) : const Color(0xFF4338CA);
    final bodyColor =
        dark ? AppColors.darkMutedText : const Color(0xFF334155);
    final metaphorBg = dark ? AppColors.darkCard : Colors.white;
    final metaphorBorder = border;
    final metaphorTitle =
        isSky ? const Color(0xFF0369A1) : const Color(0xFF4338CA);

    final paragraphs = (section.body ?? '')
        .split(RegExp(r'\n\s*\n'))
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    String? metaphor;
    final rest = <String>[];
    for (final p in paragraphs) {
      if (p.contains('نشبه') ||
          p.contains('تشبيه') ||
          p.contains('الطيران') ||
          p.contains('قيادة سيارة')) {
        metaphor ??= p;
      } else {
        rest.add(p);
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                isSky ? Icons.flight_rounded : Icons.directions_car_rounded,
                size: 18,
                color: isSky
                    ? const Color(0xFF0284C7)
                    : const Color(0xFF4F46E5),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  section.heading ?? '',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: titleColor,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: border),
                ),
                child: Text(
                  isSky ? 'تأمل روحي' : 'بحث وفحص',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: badgeText,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final p in rest) ...[
            Text(
              p,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: bodyColor,
                height: 1.65,
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (metaphor != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: metaphorBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: metaphorBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isSky
                            ? Icons.flight_takeoff_rounded
                            : Icons.explore_rounded,
                        size: 14,
                        color: metaphorTitle,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'التشبيه التوضيحي:',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: metaphorTitle,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    metaphor,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: dark
                          ? AppColors.darkText
                          : (isSky
                              ? const Color(0xFF0C4A6E)
                              : const Color(0xFF312E81)),
                      height: 1.55,
                    ),
                  ),
                ],
              ),
            ),
          if (section.items.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (var i = 0; i < section.items.length; i++)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: _ItemCard(
                  dark: dark,
                  index: i + 1,
                  raw: section.items[i],
                  accent: isSky
                      ? const Color(0xFF0EA5E9)
                      : const Color(0xFF4F46E5),
                  rich: false,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _ParsedItem {
  const _ParsedItem({
    required this.title,
    required this.body,
    required this.verses,
  });
  final String? title;
  final String body;
  final List<String> verses;
}

_ParsedItem _parseItem(String raw) {
  var text = raw.trim();
  final verses = <String>[];
  final verseMatch = RegExp(r'\(([^)]*[٠-٩0-9]+[^)]*)\)\s*$').firstMatch(text);
  if (verseMatch != null) {
    final blob = verseMatch.group(1)!;
    for (final part in blob.split(RegExp(r'[؛;–—,]|\s+-\s+'))) {
      final cleaned = part.trim();
      if (cleaned.isNotEmpty) verses.add(cleaned);
    }
    text = text.substring(0, verseMatch.start).trim();
  }

  String? title;
  var body = text;
  final colon = text.indexOf(':');
  if (colon > 0 && colon < 40) {
    title = text.substring(0, colon).trim();
    body = text.substring(colon + 1).trim();
  }
  return _ParsedItem(title: title, body: body, verses: verses);
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({
    required this.dark,
    required this.index,
    required this.raw,
    required this.accent,
    required this.rich,
  });

  final bool dark;
  final int index;
  final String raw;
  final Color accent;
  final bool rich;

  @override
  Widget build(BuildContext context) {
    final parsed = rich ? _parseItem(raw) : null;
    final title = parsed?.title;
    final body = parsed?.body ?? raw;
    final verses = parsed?.verses ?? const <String>[];
    final chipBg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final textColor = dark ? AppColors.darkText : const Color(0xFF1E293B);
    final muted = dark ? AppColors.darkMutedText : const Color(0xFF475569);

    return Container(
      padding: EdgeInsets.all(rich ? 16 : 14),
      decoration: BoxDecoration(
        color: chipBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.25),
                      blurRadius: 6,
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  '$index',
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: title != null
                    ? Text(
                        title,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: textColor,
                        ),
                      )
                    : Text(
                        body,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: textColor,
                          height: 1.55,
                        ),
                      ),
              ),
            ],
          ),
          if (title != null) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(right: 34),
              child: Text(
                body,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: muted,
                  height: 1.55,
                ),
              ),
            ),
          ],
          if (verses.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(right: 34),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final verse in verses)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: dark
                            ? const Color(0xFF064E3B).withValues(alpha: 0.4)
                            : const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: dark
                              ? const Color(0xFF10B981)
                                  .withValues(alpha: 0.35)
                              : const Color(0xFFA7F3D0),
                        ),
                      ),
                      child: Text(
                        verse,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: dark
                              ? const Color(0xFF6EE7B7)
                              : const Color(0xFF065F46),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PrimaryCta extends StatelessWidget {
  const _PrimaryCta({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [
                Color(0xFF0EA5E9),
                Color(0xFF4F46E5),
                Color(0xFF4338CA),
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

class _SecondaryCta extends StatelessWidget {
  const _SecondaryCta({
    required this.dark,
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final bool dark;
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
    final color = dark ? AppColors.darkText : const Color(0xFF334155);

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _asQuote(String value) {
  final trimmed = value.trim();
  if (trimmed.startsWith('«') || trimmed.startsWith('"')) return trimmed;
  return '«$trimmed»';
}

class _FocusToggle extends StatefulWidget {
  const _FocusToggle();

  @override
  State<_FocusToggle> createState() => _FocusToggleState();
}

class _FocusToggleState extends State<_FocusToggle> {
  var _manual = false;
  var _active = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final preference = await FocusMode.preference();
    final active = await FocusMode.isActive();
    if (!mounted) return;
    setState(() {
      _manual = preference == FocusModePreference.manual;
      _active = active;
    });
  }

  Future<void> _press() async {
    if (!FocusMode.supported) {
      await showCustomAlert(
        context: context,
        title: 'إعداد وضع الخلوة للآيفون',
        message:
            'آبل لا تسمح بتفعيل وضع عدم الإزعاج تلقائياً، ولكن يمكنك إعداد "Focus Mode" مخصص للخلوة في إعدادات الهاتف والسماح لتطبيق "هنا راحتي" فقط بإرسال الإشعارات.',
        type: AlertType.info,
      );
      return;
    }
    if (!await FocusMode.hasPermission()) {
      if (!mounted) return;
      await showCustomAlert(
        context: context,
        title: 'صلاحية مطلوبة',
        message: 'نحتاج لصلاحية التحكم في وضع عدم الإزعاج لتفعيل هذه الميزة.',
        type: AlertType.warning,
        actions: [
          AlertAction(text: 'إلغاء', isCancel: true),
          AlertAction(text: 'موافق', onPressed: FocusMode.requestPermission),
        ],
      );
      return;
    }
    if (_active) {
      await FocusMode.disable();
    } else {
      await FocusMode.enable();
    }
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    if (!_manual) return const SizedBox.shrink();
    final dark = context.watch<ThemeProvider>().isNightMode;
    return Material(
      color: dark ? AppColors.darkCardMuted : const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: _press,
        borderRadius: BorderRadius.circular(16),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(
            _active
                ? Icons.notifications_off_rounded
                : Icons.notifications_none_rounded,
            size: 20,
            color: dark ? AppColors.darkText : const Color(0xFF334155),
          ),
        ),
      ),
    );
  }
}

/// Same 5-tab bar as the rest of the app.
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
