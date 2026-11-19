import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DevotionSection {
  const DevotionSection({this.heading, this.body, this.items = const []});
  final String? heading;
  final String? body;
  final List<String> items;
}

class DevotionArticle {
  const DevotionArticle({
    required this.id,
    required this.title,
    required this.summary,
    required this.icon,
    required this.sections,
    this.youtubeUrl,
  });

  final String id;
  final String title;
  final String summary;
  final IconData icon;
  final String? youtubeUrl;
  final List<DevotionSection> sections;
}

const devotionAccents = [
  Color(0xFF4A6FA5),
  Color(0xFF6B4C9A),
  Color(0xFF2E8B7A),
  Color(0xFFC05C5C),
  Color(0xFFB07B2A),
];

const _icons = <String, IconData>{
  '1': Icons.volunteer_activism_outlined,
  '2': Icons.menu_book_outlined,
  '3': Icons.schedule_outlined,
  '4': Icons.auto_stories_outlined,
  '5': Icons.book_outlined,
};

List<DevotionArticle>? _articles;

Future<List<DevotionArticle>> loadDevotionArticles() async {
  if (_articles != null) return _articles!;
  final raw = jsonDecode(
    await rootBundle.loadString('assets/data/devotion_articles.json'),
  ) as List;
  _articles = [
    for (final item in raw)
      DevotionArticle(
        id: item['id'] as String,
        title: item['title'] as String,
        summary: item['summary'] as String,
        icon: _icons[item['id']] ?? Icons.menu_book_outlined,
        youtubeUrl: item['youtubeUrl'] as String?,
        sections: [
          for (final section in item['sections'] as List)
            DevotionSection(
              heading: section['heading'] as String?,
              body: section['body'] as String?,
              items: [
                for (final line in (section['items'] as List? ?? []))
                  line as String
              ],
            )
        ],
      )
  ];
  return _articles!;
}

DevotionArticle? devotionArticleById(List<DevotionArticle> articles, String id) {
  for (final article in articles) {
    if (article.id == id) return article;
  }
  return null;
}
