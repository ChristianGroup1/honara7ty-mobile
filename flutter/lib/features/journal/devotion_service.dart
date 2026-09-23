import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';
import '../reading/bible_catalog.dart';

class DevotionService {
  DevotionService({SupabaseClient? client}) : client = client ?? supabase;
  final SupabaseClient client;
  String get userId {
    final id = client.auth.currentUser?.id;
    if (id == null) throw StateError('يرجى تسجيل الدخول أولًا');
    return id;
  }

  static String dateKey(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Future<Map<String, bool>> month(DateTime month) async {
    final key = 'devotion_month_${userId}_${month.year}_${month.month}';
    final prefs = await SharedPreferences.getInstance();
    try {
      final rows = await client
          .from('devotion_log')
          .select('date, completed')
          .eq('user_id', userId)
          .gte('date', dateKey(DateTime(month.year, month.month)))
          .lt('date', dateKey(DateTime(month.year, month.month + 1)));
      final result = {
        for (final row in rows) row['date'] as String: row['completed'] == true
      };
      await prefs.setString(key, jsonEncode(result));
      return _withPending(result, month);
    } catch (_) {
      final raw = prefs.getString(key);
      if (raw == null) return _withPending({}, month);
      final decoded = jsonDecode(raw) as Map;
      return _withPending(
        {
          for (final entry in decoded.entries)
            entry.key.toString(): entry.value == true
        },
        month,
      );
    }
  }

  Future<Map<String, bool>> _withPending(
      Map<String, bool> days, DateTime month) async {
    final pending = await OfflineSync.pendingDevotion(userId);
    final prefix = '${month.year}-${month.month.toString().padLeft(2, '0')}-';
    for (final entry in pending.entries) {
      if (entry.key.startsWith(prefix)) {
        days[entry.key] = entry.value['completed'] == true;
      }
    }
    return days;
  }

  Future<void> setCompleted(DateTime date, bool completed) async {
    await saveDay(date: date, completed: completed);
  }

  Future<bool> saveDay({
    required DateTime date,
    required bool completed,
    String? book,
    List<int>? chapters,
    List<({String book, List<int> chapters})>? readings,
  }) async {
    final entries = readings ??
        (completed && book != null
            ? [(book: book, chapters: chapters ?? const <int>[])]
            : null);
    final first = entries == null || entries.isEmpty ? null : entries.first;
    final saved = await OfflineSync.saveDevotion({
      'user_id': userId,
      'date': dateKey(date),
      'completed': completed,
      'reading_book': first?.book,
      'reading_chapter':
          first == null || first.chapters.isEmpty ? null : first.chapters.first,
      'chapters_read':
          entries?.fold<int>(0, (sum, entry) => sum + entry.chapters.length),
      'selected_chapters': first?.chapters,
      'reading_entries': entries
          ?.map((entry) => {
                'reading_book': entry.book,
                'selected_chapters': entry.chapters,
              })
          .toList(),
    });
    // The React Native app recalculates XP from the complete journal after
    // every change.  Keep this best-effort so a profile-sync failure never
    // makes recording a devotion look like it failed.
    await _refreshProfileXp();
    return saved;
  }

  Future<void> _refreshProfileXp() async {
    try {
      final logs = await completedLogs();
      final xp = computeTotalXp(logs.length);
      final prefs = await SharedPreferences.getInstance();
      final key = 'profile_xp_$userId';
      if (prefs.getInt(key) == xp) return;
      await OfflineSync.saveProfile(userId, {'xp': xp});
      await prefs.setInt(key, xp);
    } catch (_) {
      // XP is derived data. The next successful journal save/reconnect will
      // safely recompute it, so do not block the primary journal operation.
    }
  }

  Future<List<Map<String, dynamic>>> completedLogs() async {
    final key = 'devotion_completed_$userId';
    final prefs = await SharedPreferences.getInstance();
    try {
      final rows = await client
          .from('devotion_log')
          .select(
              'date, completed, reading_book, reading_chapter, chapters_read, selected_chapters, reading_entries')
          .eq('user_id', userId)
          .eq('completed', true);
      final result = [
        for (final row in rows as List) Map<String, dynamic>.from(row as Map)
      ];
      await prefs.setString(key, jsonEncode(result));
      return _withPendingLogs(result);
    } catch (_) {
      final raw = prefs.getString(key);
      if (raw == null) return _withPendingLogs([]);
      final decoded = jsonDecode(raw) as List;
      return _withPendingLogs(
          [for (final row in decoded) Map<String, dynamic>.from(row as Map)]);
    }
  }

  Future<List<Map<String, dynamic>>> _withPendingLogs(
    List<Map<String, dynamic>> logs,
  ) async {
    final pending = await OfflineSync.pendingDevotion(userId);
    logs.removeWhere((log) => pending.containsKey(log['date']));
    logs.addAll(pending.values.where((log) => log['completed'] == true));
    return logs;
  }
}

class TodayReadingSuggestion {
  const TodayReadingSuggestion({required this.label, required this.first});
  final String label;
  final bool first;
}

Future<TodayReadingSuggestion> suggestTodayReading() async {
  final books = await loadBibleCatalog();
  if (books.isEmpty) {
    return const TodayReadingSuggestion(label: '', first: true);
  }
  final logs = await DevotionService().completedLogs();
  logs.sort((a, b) => '${b['date']}'.compareTo('${a['date']}'));
  if (logs.isEmpty) {
    return TodayReadingSuggestion(label: books.first.name, first: true);
  }
  final log = logs.first;
  final entries = readingEntriesFromLog(log);
  final lastEntry = entries.isEmpty ? null : entries.last;
  final bookName = lastEntry?.book ?? log['reading_book'];
  final book = books.cast<BibleBookInfo?>().firstWhere(
        (item) => item!.name == bookName,
        orElse: () => null,
      );
  final chapters =
      lastEntry?.chapters ?? _chaptersFrom(log['selected_chapters']);
  chapters.sort();
  final last = chapters.isEmpty
      ? (log['reading_chapter'] as num?)?.toInt()
      : chapters.last;
  if (book == null || last == null) {
    return TodayReadingSuggestion(label: books.first.name, first: false);
  }
  if (last < book.chapters) {
    return TodayReadingSuggestion(
        label: '${book.name} ${last + 1}', first: false);
  }
  final index = books.indexWhere((item) => item.id == book.id);
  final next =
      index >= 0 && index + 1 < books.length ? books[index + 1] : books.first;
  return TodayReadingSuggestion(label: '${next.name} 1', first: false);
}

int chaptersInLog(Map<String, dynamic> log) {
  final entries = readingEntriesFromLog(log);
  if (entries.isNotEmpty) {
    return entries.fold<int>(0, (sum, entry) => sum + entry.chapters.length);
  }
  final selected = log['selected_chapters'];
  if (selected is List && selected.isNotEmpty) return selected.length;
  final count = log['chapters_read'];
  if (count is num && count > 0) return count.toInt();
  if (log['reading_chapter'] != null) return 1;
  return 0;
}

/// A normalized reading entry.  Older rows contain a single legacy reading;
/// newer rows may contain several books/chapters in `reading_entries`.
typedef ReadingEntry = ({String book, List<int> chapters});

List<int> _chaptersFrom(dynamic raw) {
  if (raw is! List) return const [];
  final chapters = <int>{
    for (final value in raw)
      if ((value is num ? value.toInt() : int.tryParse('$value'))
          case final chapter?)
        if (chapter > 0) chapter,
  }.toList()
    ..sort();
  return chapters;
}

List<ReadingEntry> readingEntriesFromLog(Map<String, dynamic> log) {
  final raw = log['reading_entries'];
  if (raw is List) {
    final entries = <ReadingEntry>[];
    for (final value in raw) {
      if (value is! Map) continue;
      final book =
          (value['reading_book'] ?? value['book'] ?? '').toString().trim();
      final chapters = _chaptersFrom(
        value['selected_chapters'] ?? value['chapters'],
      );
      if (book.isNotEmpty && chapters.isNotEmpty) {
        entries.add((book: book, chapters: chapters));
      }
    }
    if (entries.isNotEmpty) return entries;
  }

  final book = (log['reading_book'] ?? '').toString().trim();
  if (book.isEmpty) return const [];
  final selected = _chaptersFrom(log['selected_chapters']);
  if (selected.isNotEmpty) return [(book: book, chapters: selected)];
  final chapter = log['reading_chapter'];
  final parsed = chapter is num ? chapter.toInt() : int.tryParse('$chapter');
  return parsed != null && parsed > 0
      ? [
          (book: book, chapters: [parsed])
        ]
      : const [];
}

String formatReadingEntries(Map<String, dynamic> log) {
  return readingEntriesFromLog(log)
      .map((entry) => '${entry.book} ${entry.chapters.join('، ')}')
      .join('، ');
}

int computeStreak(Iterable<String> dates, [DateTime? now]) {
  final unique = dates.toSet().toList()..sort((a, b) => b.compareTo(a));
  if (unique.isEmpty) return 0;
  final today = now ?? DateTime.now();
  var expected = DevotionService.dateKey(today);
  var streak = 0;
  for (final date in unique) {
    if (date == expected) {
      streak++;
      final parts = expected.split('-');
      final previous = DateTime(
        int.parse(parts[0]),
        int.parse(parts[1]),
        int.parse(parts[2]),
      ).subtract(const Duration(days: 1));
      expected = DevotionService.dateKey(previous);
    } else if (date.compareTo(expected) < 0) {
      break;
    }
  }
  return streak;
}

int computeTotalXp(int completedDays) {
  const perDay = 10;
  const levelBase = 100;
  const daysPerLevel = 7;
  final days = completedDays < 0 ? 0 : completedDays;
  final level = days ~/ daysPerLevel + 1;
  final levelXp = level <= 1 ? 0 : levelBase * (level * (level + 1) ~/ 2 - 1);
  return days * perDay + levelXp;
}
