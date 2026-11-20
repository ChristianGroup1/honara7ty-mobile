import 'dart:convert';
import 'dart:math';

import 'package:flutter/services.dart';

import '../journal/devotion_service.dart';
import 'bible_catalog.dart';
import 'bible_tools.dart';

class DailyVerse {
  const DailyVerse({
    required this.text,
    required this.reference,
    this.bookName,
  });

  final String text;
  final String reference;
  final String? bookName;
}

const _fallbackVerses = [
  DailyVerse(
    text: 'سِرَاجٌ لِرِجْلِي كَلَامُكَ وَنُورٌ لِسَبِيلِي.',
    reference: 'مزمور ١١٩: ١٠٥',
    bookName: 'مزمور',
  ),
  DailyVerse(
    text: 'لَا تَخَفْ لِأَنِّي مَعَكَ. لَا تَتَلَفَّتْ لِأَنِّي إِلَهُكَ.',
    reference: 'إشعياء ٤١: ١٠',
    bookName: 'إشعياء',
  ),
  DailyVerse(
    text:
        'لَا تَهْتَمُّوا بِشَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلَاةِ وَالدُّعَاءِ.',
    reference: 'فيلبي ٤: ٦',
    bookName: 'فيلبي',
  ),
  DailyVerse(
    text: 'سَلَامًا أَتْرُكُ لَكُمْ. سَلَامِي أُعْطِيكُمْ.',
    reference: 'يوحنا ١٤: ٢٧',
    bookName: 'يوحنا',
  ),
  DailyVerse(
    text: 'الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ.',
    reference: 'مزمور ٢٣: ١',
    bookName: 'مزمور',
  ),
  DailyVerse(
    text: 'تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ.',
    reference: 'أمثال ٣: ٥',
    bookName: 'أمثال',
  ),
  DailyVerse(
    text:
        'كُلَّ الْأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ.',
    reference: 'رومية ٨: ٢٨',
    bookName: 'رومية',
  ),
];

String _arabicDigits(String value) => value.replaceAllMapped(
      RegExp(r'[0-9]'),
      (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match[0]!)],
    );

/// Picks one verse for today from the book the user is currently reading.
/// Stable for the calendar day (same verse all day, changes tomorrow).
Future<DailyVerse> pickDailyVerseFromReadingBook({
  String? preferredBookId,
  String? preferredBookName,
}) async {
  try {
    final catalog = await loadBibleCatalog();
    final prefs = await BibleReaderPrefs.load();
    final suggestion = await suggestTodayReading();

    BibleBookInfo? book;
    if (preferredBookId != null && preferredBookId.isNotEmpty) {
      book = findBibleBook(catalog, id: preferredBookId);
    }
    book ??= prefs.bookId == null
        ? null
        : findBibleBook(catalog, id: prefs.bookId);
    if (book == null &&
        preferredBookName != null &&
        preferredBookName.isNotEmpty) {
      book = findBibleBook(catalog, name: preferredBookName);
    }
    book ??= suggestion.bookName == null
        ? null
        : findBibleBook(catalog, name: suggestion.bookName);
    book ??= catalog.isEmpty ? null : catalog.first;
    if (book == null) return _fallbackForToday();

    final raw =
        jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
            as Map<String, dynamic>;
    final books = raw['books'] as List;
    final bookIndex = int.tryParse(book.id);
    if (bookIndex == null || bookIndex < 1 || bookIndex > books.length) {
      return _fallbackForToday();
    }

    final bookJson = books[bookIndex - 1] as Map<String, dynamic>;
    final chapters = bookJson['chapters'] as List;
    if (chapters.isEmpty) return _fallbackForToday();

    final dayKey = DevotionService.dateKey(DateTime.now());
    final rng = Random(Object.hash(dayKey, book.id));
    final chapterJson =
        chapters[rng.nextInt(chapters.length)] as Map<String, dynamic>;
    final verses = chapterJson['verses'] as List;
    if (verses.isEmpty) return _fallbackForToday();

    final verseJson = verses[rng.nextInt(verses.length)] as Map<String, dynamic>;
    final chapterNum = (chapterJson['chapter'] as num?)?.toInt() ?? 1;
    final verseNum = (verseJson['verse'] as num?)?.toInt() ?? 1;
    final text = (verseJson['text'] as String?)?.trim() ?? '';
    if (text.isEmpty) return _fallbackForToday();

    final name = (bookJson['name'] as String?) ?? book.name;
    return DailyVerse(
      text: text,
      reference:
          '$name ${_arabicDigits('$chapterNum')}: ${_arabicDigits('$verseNum')}',
      bookName: name,
    );
  } catch (_) {
    return _fallbackForToday();
  }
}

DailyVerse fallbackDailyVerseForToday() {
  final day = DateTime.now().difference(DateTime(DateTime.now().year)).inDays;
  return _fallbackVerses[day.abs() % _fallbackVerses.length];
}

DailyVerse _fallbackForToday() => fallbackDailyVerseForToday();
