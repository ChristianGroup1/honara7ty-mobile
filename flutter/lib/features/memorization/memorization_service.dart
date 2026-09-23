import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/offline_sync.dart';
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

class MemorizationGoal {
  const MemorizationGoal({this.period = 'month', this.target = 0});
  final String period;
  final int target;

  Map<String, dynamic> toJson() => {'period': period, 'target': target};

  factory MemorizationGoal.fromJson(Map<String, dynamic> json) => MemorizationGoal(
        period: json['period'] == 'week' ? 'week' : 'month',
        target: (json['target'] as num?)?.toInt() ?? 0,
      );
}

class MemorizationStats {
  const MemorizationStats({
    required this.totalVerses,
    required this.totalAttempts,
    required this.averageScore,
    required this.periodCount,
    required this.streak,
    required this.bestScore,
    required this.perfectAttempts,
    required this.averageTime,
    required this.byDifficulty,
  });

  final int totalVerses;
  final int totalAttempts;
  final int averageScore;
  final int periodCount;
  final int streak;
  final int bestScore;
  final int perfectAttempts;
  final int averageTime;
  final Map<String, int> byDifficulty;
}

MemorizationStats memorizationStats(List<MemorizationAttempt> logs, MemorizationGoal goal, [DateTime? now]) {
  final today = now ?? DateTime.now();
  final startOfWeek = DateTime(today.year, today.month, today.day - today.weekday % 7);
  final startOfMonth = DateTime(today.year, today.month);
  var week = 0;
  var month = 0;
  var totalVerses = 0;
  var scoreSum = 0.0;
  var time = 0;
  var best = 0;
  var perfect = 0;
  final days = <String>{};
  final difficulty = <String, int>{};
  String dayKey(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  for (final log in logs) {
    final correct = log.total > 0 && log.score == log.total ? log.verses.length : 0;
    final local = log.createdAt.toLocal();
    totalVerses += correct;
    if (!local.isBefore(startOfWeek)) week += correct;
    if (!local.isBefore(startOfMonth)) month += correct;
    final percent = log.total > 0 ? log.score / log.total : 0;
    scoreSum += percent;
    if ((percent * 100).round() > best) best = (percent * 100).round();
    if (log.total > 0 && log.score == log.total) perfect++;
    if (correct > 0) days.add(dayKey(local));
    time += log.timeSeconds;
    difficulty[log.difficulty] = (difficulty[log.difficulty] ?? 0) + 1;
  }
  var streak = 0;
  var cursor = DateTime(today.year, today.month, today.day);
  while (days.contains(dayKey(cursor))) {
    streak++;
    cursor = cursor.subtract(const Duration(days: 1));
  }
  return MemorizationStats(
    totalVerses: totalVerses,
    totalAttempts: logs.length,
    averageScore: logs.isEmpty ? 0 : (scoreSum / logs.length * 100).round(),
    periodCount: goal.period == 'month' ? month : week,
    streak: streak,
    bestScore: best,
    perfectAttempts: perfect,
    averageTime: logs.isEmpty ? 0 : (time / logs.length).round(),
    byDifficulty: difficulty,
  );
}

class MemorizationService {
  String get _key =>
      'honara_memorization_attempts_${supabase.auth.currentUser?.id ?? 'guest'}';
  String get _goalKey =>
      'honara_memorization_goal_${supabase.auth.currentUser?.id ?? 'guest'}';
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
    } catch (_) {
      await OfflineSync.queueMemorization(user.id, attempt.id, {
        'user_id': user.id,
        'book_id': attempt.bookId,
        'chapter': attempt.chapter,
        'verses': attempt.verses,
        'score': attempt.score,
        'total': attempt.total,
        'time_seconds': attempt.timeSeconds,
        'difficulty': attempt.difficulty,
      });
    }
  }

  Future<MemorizationGoal> goal() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_goalKey);
    if (raw != null) {
      try {
        return MemorizationGoal.fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map));
      } catch (_) {}
    }
    final user = supabase.auth.currentUser;
    if (user == null) return const MemorizationGoal();
    try {
      final row = await supabase
          .from('memorization_goals')
          .select('target_per_week')
          .eq('user_id', user.id)
          .maybeSingle();
      final target = (row?['target_per_week'] as num?)?.toInt() ?? 0;
      final goal = MemorizationGoal(period: 'week', target: target);
      await prefs.setString(_goalKey, jsonEncode(goal.toJson()));
      return goal;
    } catch (_) {
      return const MemorizationGoal();
    }
  }

  Future<void> saveGoal(MemorizationGoal goal) async {
    await (await SharedPreferences.getInstance())
        .setString(_goalKey, jsonEncode(goal.toJson()));
    final user = supabase.auth.currentUser;
    if (user == null) return;
    try {
      await supabase.from('memorization_goals').upsert({
        'user_id': user.id,
        'target_per_week': goal.target,
        'updated_at': DateTime.now().toIso8601String(),
      });
    } catch (_) {
      await OfflineSync.queueMemorizationGoal(user.id, goal.target);
    }
  }

  Future<void> delete(String id) async {
    final items = await load()
      ..removeWhere((item) => item.id == id);
    await (await SharedPreferences.getInstance()).setString(
        _key, jsonEncode(items.map((item) => item.toJson()).toList()));
  }
}
