import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';

class ReadingLogService {
  String get _key =>
      'honara_reading_log_${supabase.auth.currentUser?.id ?? 'guest'}';
  String _date() => DateTime.now().toIso8601String().substring(0, 10);
  Future<Set<String>> loadToday() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    if (raw == null) return {};
    try {
      final map = Map<String, dynamic>.from(jsonDecode(raw) as Map);
      return Set<String>.from((map[_date()] as List? ?? []).cast<String>());
    } catch (_) {
      return {};
    }
  }

  Future<void> toggle(
      {required String bookId,
      required int chapter,
      required bool completed}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    Map<String, dynamic> map =
        raw == null ? {} : Map<String, dynamic>.from(jsonDecode(raw) as Map);
    final key = '$bookId:$chapter';
    final today =
        Set<String>.from((map[_date()] as List? ?? []).cast<String>());
    if (completed) {
      today.add(key);
    } else {
      today.remove(key);
    }
    map[_date()] = today.toList();
    await prefs.setString(_key, jsonEncode(map));
    final user = supabase.auth.currentUser;
    if (user == null) return;
    try {
      if (completed) {
        await supabase.from('reading_log').upsert({
          'user_id': user.id,
          'book_id': bookId,
          'chapter': chapter,
          'date': _date()
        });
      } else {
        await supabase
            .from('reading_log')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .eq('chapter', chapter)
            .eq('date', _date());
      }
    } catch (_) {
      await OfflineSync.queueReading(
        userId: user.id,
        bookId: bookId,
        chapter: chapter,
        date: _date(),
        completed: completed,
      );
    }
  }
}
