import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';

class ReadingLogService {
  String get _key =>
      'honara_reading_log_${supabase.auth.currentUser?.id ?? 'guest'}';

  String _date([DateTime? value]) {
    final date = value ?? DateTime.now();
    return date.toIso8601String().substring(0, 10);
  }

  Future<Set<String>> loadToday({bool refreshRemote = true}) async {
    final prefs = await SharedPreferences.getInstance();
    final map = await _readMap(prefs);
    final today = _date();
    var local = Set<String>.from((map[today] as List? ?? []).cast<String>());

    final user = supabase.auth.currentUser;
    if (!refreshRemote || user == null) return local;

    try {
      final rows = await supabase
          .from('reading_log')
          .select('book_id, chapter')
          .eq('user_id', user.id)
          .eq('date', today);
      final remote = <String>{
        for (final row in rows as List)
          '${(row as Map)['book_id']}:${row['chapter']}',
      };
      final merged = {...local, ...remote};
      map[today] = merged.toList();
      await prefs.setString(_key, jsonEncode(map));
      return merged;
    } catch (_) {
      return local;
    }
  }

  Future<void> toggle({
    required String bookId,
    required int chapter,
    required bool completed,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final map = await _readMap(prefs);
    final key = '$bookId:$chapter';
    final today = _date();
    final day = Set<String>.from((map[today] as List? ?? []).cast<String>());
    if (completed) {
      day.add(key);
    } else {
      day.remove(key);
    }
    map[today] = day.toList();
    await prefs.setString(_key, jsonEncode(map));

    final user = supabase.auth.currentUser;
    if (user == null) return;
    try {
      if (completed) {
        await supabase.from('reading_log').upsert(
          {
            'user_id': user.id,
            'book_id': bookId,
            'chapter': chapter,
            'date': today,
          },
          onConflict: 'user_id,book_id,chapter,date',
        );
      } else {
        await supabase
            .from('reading_log')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .eq('chapter', chapter)
            .eq('date', today);
      }
    } catch (_) {
      await OfflineSync.queueReading(
        userId: user.id,
        bookId: bookId,
        chapter: chapter,
        date: today,
        completed: completed,
      );
    }
  }

  /// Push every locally cached reading day up to Supabase.
  Future<void> syncPending() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final prefs = await SharedPreferences.getInstance();
    final map = await _readMap(prefs);
    for (final entry in map.entries) {
      final date = entry.key;
      final chapters = (entry.value as List? ?? []).cast<String>();
      for (final item in chapters) {
        final parts = item.split(':');
        if (parts.length != 2) continue;
        final bookId = parts[0];
        final chapter = int.tryParse(parts[1]);
        if (chapter == null) continue;
        try {
          await supabase.from('reading_log').upsert(
            {
              'user_id': user.id,
              'book_id': bookId,
              'chapter': chapter,
              'date': date,
            },
            onConflict: 'user_id,book_id,chapter,date',
          );
        } catch (_) {
          await OfflineSync.queueReading(
            userId: user.id,
            bookId: bookId,
            chapter: chapter,
            date: date,
            completed: true,
          );
        }
      }
    }
  }

  Future<Map<String, dynamic>> _readMap(SharedPreferences prefs) async {
    final raw = prefs.getString(_key);
    if (raw == null) return {};
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return {};
    }
  }
}
