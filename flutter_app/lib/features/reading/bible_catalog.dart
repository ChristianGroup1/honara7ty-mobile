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

String normalizeBibleBookName(String name) {
  var value = name.trim();
  if (value.startsWith('إنجيل ')) value = value.substring(6).trim();
  if (value.startsWith('ال')) value = value.substring(1).trim();
  return value;
}

BibleBookInfo? findBibleBook(
  List<BibleBookInfo> books, {
  String? id,
  String? name,
}) {
  if (id != null && id.isNotEmpty) {
    for (final book in books) {
      if (book.id == id) return book;
    }
  }
  if (name != null && name.trim().isNotEmpty) {
    final target = normalizeBibleBookName(name);
    for (final book in books) {
      if (normalizeBibleBookName(book.name) == target) return book;
    }
  }
  return null;
}
