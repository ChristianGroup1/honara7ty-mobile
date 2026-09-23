import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BibleReaderPrefs {
  double fontSize;
  bool stripDiacritics;
  bool parallelTranslation;
  bool inlineLife;
  int textColor;
  String? bookId;
  int chapter;

  BibleReaderPrefs({
    this.fontSize = 18,
    this.stripDiacritics = false,
    this.parallelTranslation = false,
    this.inlineLife = false,
    this.textColor = 0,
    this.bookId,
    this.chapter = 1,
  });

  static const _key = 'honara7ty:bible-reader:prefs';

  static Future<BibleReaderPrefs> load() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    if (raw == null) return BibleReaderPrefs();
    final json = jsonDecode(raw) as Map<String, dynamic>;
    return BibleReaderPrefs(
      fontSize: (json['fontSize'] as num?)?.toDouble() ?? 18,
      stripDiacritics: json['stripDiacritics'] == true,
      parallelTranslation: json['parallelTranslation'] == true,
      inlineLife: json['inlineLife'] == true,
      textColor: (json['textColor'] as num?)?.toInt() ?? 0,
      bookId: json['bookId'] as String?,
      chapter: (json['chapter'] as num?)?.toInt() ?? 1,
    );
  }

  Future<void> save() async {
    await (await SharedPreferences.getInstance()).setString(
      _key,
      jsonEncode({
        'fontSize': fontSize,
        'stripDiacritics': stripDiacritics,
        'parallelTranslation': parallelTranslation,
        'inlineLife': inlineLife,
        'textColor': textColor,
        'bookId': bookId,
        'chapter': chapter,
      }),
    );
  }
}

String stripArabicDiacritics(String value) =>
    value.replaceAll(RegExp(r'[\u064B-\u0652\u0670\u0640]'), '');

class LifeTranslation {
  LifeTranslation._();
  static final instance = LifeTranslation._();
  Map<String, Map<int, Map<int, String>>>? _books;

  Future<String?> verse(String bookName, int chapter, int number) async {
    _books ??= await _load();
    return _books![bookName]?[chapter]?[number];
  }

  Future<Map<String, Map<int, Map<int, String>>>> _load() async {
    final json = jsonDecode(await rootBundle.loadString('assets/data/arb_nav.json'))
        as Map<String, dynamic>;
    final books = <String, Map<int, Map<int, String>>>{};
    for (final raw in json['books'] as List) {
      final book = raw as Map<String, dynamic>;
      final chapters = <int, Map<int, String>>{};
      for (final chapter in book['chapters'] as List) {
        final item = chapter as Map<String, dynamic>;
        chapters[item['chapter'] as int] = {
          for (final verse in item['verses'] as List)
            (verse as Map<String, dynamic>)['verse'] as int:
                verse['text'] as String
        };
      }
      books[book['name'] as String] = chapters;
    }
    return books;
  }
}

class StrongsLookup {
  StrongsLookup._();
  static final instance = StrongsLookup._();
  Map<String, dynamic>? _lexicon;
  Map<String, String>? _arabic;
  final _books = <String, Map<String, dynamic>>{};

  Future<List<({String word, String id, String meaning})>> verse(
    String bookId,
    int chapter,
    int number,
  ) async {
    _lexicon ??= jsonDecode(
      await rootBundle.loadString('assets/data/strongs/generatedLexicon.json'),
    ) as Map<String, dynamic>;
    _arabic ??= Map<String, String>.from(
      jsonDecode(await rootBundle.loadString(
        'assets/data/strongs/arabicOverrides.json',
      )) as Map,
    );
    try {
      _books[bookId] ??= jsonDecode(
        await rootBundle.loadString('assets/data/strongs/mappings/book$bookId.json'),
      ) as Map<String, dynamic>;
    } catch (_) {
      return [];
    }
    final refs = _books[bookId]!['$bookId:$chapter:$number'];
    if (refs is! List) return [];
    return [
      for (final raw in refs)
        if (raw is Map)
          (
            word: (raw['displayWord'] ?? '').toString(),
            id: (raw['strongId'] ?? '').toString(),
            meaning: _meaning((raw['strongId'] ?? '').toString()),
          )
    ];
  }

  String _meaning(String id) {
    final arabic = _arabic![id];
    if (arabic != null && arabic.isNotEmpty) return arabic;
    final entry = _lexicon![id];
    if (entry is Map) {
      final arabicDef = (entry['definitionAr'] ?? '').toString();
      if (arabicDef.isNotEmpty) return arabicDef;
      return (entry['definitionEn'] ?? '').toString();
    }
    return '';
  }
}
