import 'dart:convert';

import 'package:flutter/services.dart';

class BibleBookInfo {
  const BibleBookInfo({
    required this.id,
    required this.name,
    required this.chapters,
  });

  final String id;
  final String name;
  final int chapters;
}

Future<List<BibleBookInfo>> loadBibleCatalog() async {
  final json = jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
      as Map<String, dynamic>;
  return (json['books'] as List).asMap().entries.map((entry) {
    final book = entry.value as Map<String, dynamic>;
    return BibleBookInfo(
      id: '${entry.key + 1}',
      name: book['name'] as String,
      chapters: (book['chapters'] as List).length,
    );
  }).toList();
}
