import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme.dart';
import '../../features/devotion/devotion_articles.dart';
import '../../providers/theme_provider.dart';
import '../../features/focus/focus_mode.dart';
import '../../widgets/app_header.dart';
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
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final card = isDark ? AppColors.darkCard : AppColors.lightCard;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    if (article == null) {
      return Scaffold(
        backgroundColor: bg,
        body: Column(
          children: [
            AppHeader(
              title: 'شرح الخلوة',
              onBack: () => Navigator.of(context).maybePop(),
            ),
            const Expanded(child: Center(child: Text('مقالة غير موجودة'))),
          ],
        ),
      );
    }

    final index = articles.indexWhere((item) => item.id == article.id);
    final accent = devotionAccents[index % devotionAccents.length];

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: article.title,
            onBack: () => Navigator.of(context).maybePop(),
            trailing: const _FocusToggle(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(24),
                    ),
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.white,
                        child: Icon(article.icon, color: accent, size: 30),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        article.title,
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        article.summary,
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white70,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                if (article.youtubeUrl != null) ...[
                  const SizedBox(height: 16),
                  _Card(
                    color: card,
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.ondemand_video, color: Color(0xFFD32F2F)),
                      title: const Text(
                        'ملخص مرئي',
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.right,
                      ),
                      subtitle: const Text(
                        'افتح الفيديو على يوتيوب',
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.right,
                      ),
                      onTap: () => launchUrl(
                        Uri.parse(article.youtubeUrl!),
                        mode: LaunchMode.externalApplication,
                      ),
                    ),
                  ),
                ],
                for (var i = 0; i < article.sections.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: _SectionCard(
                      section: article.sections[i],
                      accent: accent,
                      card: card,
                      text: text,
                      quote: i == 0 &&
                          article.sections[i].heading == null &&
                          article.sections[i].body != null,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
      },
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.color, required this.child});
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.section,
    required this.accent,
    required this.card,
    required this.text,
    required this.quote,
  });

  final DevotionSection section;
  final Color accent;
  final Color card;
  final Color text;
  final bool quote;

  @override
  Widget build(BuildContext context) {
    return _Card(
      color: card,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (quote)
            Icon(Icons.format_quote, color: accent)
          else if (section.heading != null)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                border: Border(right: BorderSide(color: accent, width: 3)),
              ),
              child: Text(
                section.heading!,
                textDirection: TextDirection.rtl,
                style: TextStyle(
                  color: accent,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          if (section.body != null)
            Text(
              section.body!,
              textDirection: TextDirection.rtl,
              style: TextStyle(color: text, height: 1.7, fontSize: 15),
            ),
          for (var i = 0; i < section.items.length; i++)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Row(
                textDirection: TextDirection.rtl,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: accent,
                    child: Text(
                      '${i + 1}',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      section.items[i],
                      textDirection: TextDirection.rtl,
                      style: TextStyle(color: text, height: 1.6),
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
    if (!_manual) return const SizedBox(width: 40, height: 40);
    return IconButton(
      onPressed: _press,
      icon: Icon(
        _active ? Icons.notifications_off : Icons.notifications_none,
        color: Colors.white,
      ),
    );
  }
}
