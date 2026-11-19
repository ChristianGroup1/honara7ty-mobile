import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BibleReaderPrefs {
  double fontSize;
  bool stripDiacritics;
  bool parallelTranslation;
  bool inlineLife;
  bool showNotesUnderVerse;
  int textColor;
  int background;
  String? bookId;
  int chapter;

  BibleReaderPrefs({
    this.fontSize = 18,
    this.stripDiacritics = false,
    this.parallelTranslation = false,
    this.inlineLife = false,
    this.showNotesUnderVerse = false,
    this.textColor = 0,
    this.background = 0,
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
      showNotesUnderVerse: json['showNotesUnderVerse'] == true,
      textColor: (json['textColor'] as num?)?.toInt() ?? 0,
      background: (json['background'] as num?)?.toInt() ?? 0,
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
        'showNotesUnderVerse': showNotesUnderVerse,
        'textColor': textColor,
        'background': background,
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

  /// Indexed by 1-based book id (same order as [bible.json] / old RN app).
  /// Names in arb_nav differ from bible.json, so never key by display name.
  Map<String, Map<int, Map<int, String>>>? _booksById;

  Future<String?> verse(String bookId, int chapter, int number) async {
    _booksById ??= await _load();
    return _booksById![bookId]?[chapter]?[number];
  }

  Future<Map<String, Map<int, Map<int, String>>>> _load() async {
    final json =
        jsonDecode(await rootBundle.loadString('assets/data/arb_nav.json'))
            as Map<String, dynamic>;
    final books = <String, Map<int, Map<int, String>>>{};
    final rawBooks = json['books'] as List;
    for (var index = 0; index < rawBooks.length; index++) {
      final book = rawBooks[index] as Map<String, dynamic>;
      final chapters = <int, Map<int, String>>{};
      for (final chapter in book['chapters'] as List) {
        final item = chapter as Map<String, dynamic>;
        chapters[item['chapter'] as int] = {
          for (final verse in item['verses'] as List)
            (verse as Map<String, dynamic>)['verse'] as int:
                verse['text'] as String
        };
      }
      books['${index + 1}'] = chapters;
    }
    return books;
  }
}

