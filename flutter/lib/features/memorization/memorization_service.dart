import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/supabase_service.dart';

class MemorizationAttempt {
  const MemorizationAttempt(
      {required this.id,
      required this.bookId,
      required this.bookName,
      required this.chapter,
      required this.verses,
      required this.score,
      required this.total,
      required this.timeSeconds,
      required this.difficulty,
      required this.createdAt});
  final String id, bookId, bookName, difficulty;
  final int chapter, score, total, timeSeconds;
  final List<int> verses;
  final DateTime createdAt;
  Map<String, dynamic> toJson() => {
        'id': id,
        'bookId': bookId,
        'bookName': bookName,
        'chapter': chapter,
        'verses': verses,
        'score': score,
        'total': total,
        'timeSeconds': timeSeconds,
        'difficulty': difficulty,
        'createdAt': createdAt.toIso8601String()
      };
  factory MemorizationAttempt.fromJson(Map<String, dynamic> v) =>
      MemorizationAttempt(
          id: v['id'] as String,
          bookId: v['bookId'] as String,
          bookName: v['bookName'] as String,
          chapter: v['chapter'] as int,
          verses: (v['verses'] as List).map((x) => (x as num).toInt()).toList(),
          score: v['score'] as int,
          total: v['total'] as int,
          timeSeconds: v['timeSeconds'] as int,
          difficulty: v['difficulty'] as String,
          createdAt: DateTime.parse(v['createdAt'] as String));
}

class MemorizationService {
  String get _key =>
      'honara_memorization_attempts_${supabase.auth.currentUser?.id ?? 'guest'}';
  Future<List<MemorizationAttempt>> load() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List)
          .map((v) =>
              MemorizationAttempt.fromJson(Map<String, dynamic>.from(v as Map)))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (_) {
      return [];
    }
  }

  Future<void> save(MemorizationAttempt attempt) async {
    final items = await load()
      ..removeWhere((item) => item.id == attempt.id);
    items.insert(0, attempt);
    await (await SharedPreferences.getInstance()).setString(_key,
        jsonEncode(items.take(100).map((item) => item.toJson()).toList()));
    final user = supabase.auth.currentUser;
    if (user == null) return;
    try {
      await supabase.from('memorization_log').insert({
        'user_id': user.id,
        'book_id': attempt.bookId,
        'chapter': attempt.chapter,
        'verses': attempt.verses,
        'score': attempt.score,
        'total': attempt.total,
        'time_seconds': attempt.timeSeconds,
        'difficulty': attempt.difficulty
      });
    } catch (_) {}
  }

  Future<void> delete(String id) async {
    final items = await load()
      ..removeWhere((item) => item.id == id);
    await (await SharedPreferences.getInstance()).setString(
        _key, jsonEncode(items.map((item) => item.toJson()).toList()));
  }
}
