import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/offline_sync.dart';
import '../../core/supabase_retry.dart';
import '../../core/supabase_service.dart';
import '../reading/bible_catalog.dart';

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
          id: (v['id'] ?? '').toString(),
          bookId: (v['bookId'] ?? v['book_id'] ?? '').toString(),
          bookName: (v['bookName'] ?? v['book_name'] ?? v['bookLabel'] ?? '')
              .toString(),
          chapter: (v['chapter'] as num?)?.toInt() ?? 0,
          verses: [
            for (final value in (v['verses'] as List? ?? const []))
              if (value is num) value.toInt()
          ],
          score: (v['score'] as num?)?.toInt() ?? 0,
          total: (v['total'] as num?)?.toInt() ?? 0,
          timeSeconds: (v['timeSeconds'] as num?)?.toInt() ??
              (v['time_seconds'] as num?)?.toInt() ??
              0,
          difficulty: (v['difficulty'] ?? 'medium').toString(),
          createdAt: DateTime.tryParse(
                  (v['createdAt'] ?? v['created_at'] ?? '').toString()) ??
              DateTime.now());
}

class MemorizationSeed {
  const MemorizationSeed({
    required this.bookId,
    required this.chapter,
    required this.verses,
  });

  final String bookId;
  final int chapter;
  final List<int> verses;
}

class MemorizationGoal {
  const MemorizationGoal({this.period = 'month', this.target = 0});
  final String period;
  final int target;

  Map<String, dynamic> toJson() => {'period': period, 'target': target};

  factory MemorizationGoal.fromJson(Map<String, dynamic> json) =>
      MemorizationGoal(
        period: json['period'] == 'week' ? 'week' : 'month',
        target: (json['target'] as num?)?.toInt() ?? 0,
      );
}

class MemorizationDifficultyStat {
  const MemorizationDifficultyStat({
    required this.difficulty,
    required this.attempts,
    required this.averageScore,
  });

  final String difficulty;
  final int attempts;
  final int averageScore;
}

class MemorizationStats {
  const MemorizationStats({
    required this.totalVerses,
    required this.totalAttempts,
    required this.averageScore,
    required this.weekCount,
    required this.monthCount,
    required this.periodCount,
    required this.streak,
    required this.bestScore,
    required this.perfectAttempts,
    required this.averageTime,
    required this.byDifficulty,
    required this.difficultyBreakdown,
  });

  final int totalVerses;
  final int totalAttempts;
  final int averageScore;
  final int weekCount;
  final int monthCount;
  final int periodCount;
  final int streak;
  final int bestScore;
  final int perfectAttempts;
  final int averageTime;
  final Map<String, int> byDifficulty;
  final List<MemorizationDifficultyStat> difficultyBreakdown;
}

const memorizationDifficultyOrder = [
  'easy',
  'medium',
  'hard',
  'full',
  'order',
  'choice',
  'letters',
  'fade',
];

String normalizeMemorizationDifficulty(String value) {
  final key = value.trim().toLowerCase();
  if (key == 'fulltext' || key == 'full_text' || key == 'full-text') {
    return 'full';
  }
  if (memorizationDifficultyOrder.contains(key)) return key;
  return 'medium';
}

String formatMemorizationDuration(int seconds) {
  final safe = seconds < 0 ? 0 : seconds;
  final minutes = safe ~/ 60;
  final rest = safe % 60;
  if (minutes <= 0) return '$rest ث';
  return '$minutes:${rest.toString().padLeft(2, '0')} د';
}

MemorizationStats memorizationStats(
    List<MemorizationAttempt> logs, MemorizationGoal goal,
    [DateTime? now]) {
  final today = now ?? DateTime.now();
  final localToday = DateTime(today.year, today.month, today.day);
  // Match the React Native week window: Sunday → today.
  final startOfWeek =
      localToday.subtract(Duration(days: localToday.weekday % 7));
  final startOfMonth = DateTime(localToday.year, localToday.month);
  var week = 0;
  var month = 0;
  var totalVerses = 0;
  var scoreSum = 0.0;
  var time = 0;
  var best = 0;
  var perfect = 0;
  final days = <String>{};
  final difficultyCounts = <String, int>{};
  final difficultyScoreSums = <String, double>{};

  String dayKey(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  for (final log in logs) {
    final correct =
        log.total > 0 && log.score == log.total ? log.verses.length : 0;
    final local = log.createdAt.toLocal();
    final localDay = DateTime(local.year, local.month, local.day);
    totalVerses += correct;
    if (!localDay.isBefore(startOfWeek)) week += correct;
    if (!localDay.isBefore(startOfMonth)) month += correct;
    final percent = log.total > 0 ? log.score / log.total : 0.0;
    final percentInt = (percent * 100).round();
    scoreSum += percent;
    if (percentInt > best) best = percentInt;
    if (log.total > 0 && log.score == log.total) perfect++;
    if (correct > 0) days.add(dayKey(localDay));
    time += log.timeSeconds < 0 ? 0 : log.timeSeconds;
    final difficulty = normalizeMemorizationDifficulty(log.difficulty);
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] ?? 0) + 1;
    difficultyScoreSums[difficulty] =
        (difficultyScoreSums[difficulty] ?? 0) + percentInt;
  }

  var streak = 0;
  var cursor = localToday;
  if (!days.contains(dayKey(cursor))) {
    cursor = cursor.subtract(const Duration(days: 1));
  }
  while (days.contains(dayKey(cursor))) {
    streak++;
    cursor = cursor.subtract(const Duration(days: 1));
  }

  const difficultyOrder = memorizationDifficultyOrder;
  final breakdown = <MemorizationDifficultyStat>[
    for (final key in difficultyOrder)
      if ((difficultyCounts[key] ?? 0) > 0)
        MemorizationDifficultyStat(
          difficulty: key,
          attempts: difficultyCounts[key]!,
          averageScore:
              (difficultyScoreSums[key]! / difficultyCounts[key]!).round(),
        ),
    for (final entry in difficultyCounts.entries)
      if (!difficultyOrder.contains(entry.key))
        MemorizationDifficultyStat(
          difficulty: entry.key,
          attempts: entry.value,
          averageScore: (difficultyScoreSums[entry.key]! / entry.value).round(),
        ),
  ];

  return MemorizationStats(
    totalVerses: totalVerses,
    totalAttempts: logs.length,
    averageScore: logs.isEmpty ? 0 : (scoreSum / logs.length * 100).round(),
    weekCount: week,
    monthCount: month,
    periodCount: goal.period == 'month' ? month : week,
    streak: streak,
    bestScore: best,
    perfectAttempts: perfect,
    averageTime: logs.isEmpty ? 0 : (time / logs.length).round(),
    byDifficulty: difficultyCounts,
    difficultyBreakdown: breakdown,
  );
}

class MemorizationService {
  static Map<String, String>? _bookNameCache;

  String get _key =>
      'honara_memorization_attempts_${supabase.auth.currentUser?.id ?? 'guest'}';
  String get _goalKey =>
      'honara_memorization_goal_${supabase.auth.currentUser?.id ?? 'guest'}';

  Future<Map<String, String>> _bookNames() async {
    if (_bookNameCache != null) return _bookNameCache!;
    try {
      final books = await loadBibleCatalog();
      _bookNameCache = {for (final book in books) book.id: book.name};
    } catch (_) {
      _bookNameCache = {};
    }
    return _bookNameCache!;
  }

  Future<List<MemorizationAttempt>> _loadLocal() async {
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

  Future<void> _saveLocal(List<MemorizationAttempt> items) async {
    await (await SharedPreferences.getInstance()).setString(
      _key,
      jsonEncode(items.take(100).map((item) => item.toJson()).toList()),
    );
  }

  bool _sameAttempt(MemorizationAttempt left, MemorizationAttempt right) {
    if (left.id.isNotEmpty && left.id == right.id) return true;
    if (left.bookId != right.bookId || left.chapter != right.chapter) {
      return false;
    }
    if (left.score != right.score || left.total != right.total) return false;
    if (left.verses.length != right.verses.length) return false;
    for (var i = 0; i < left.verses.length; i++) {
      if (left.verses[i] != right.verses[i]) return false;
    }
    return left.createdAt.difference(right.createdAt).inSeconds.abs() < 5;
  }

  MemorizationAttempt _fromRemote(
    Map<String, dynamic> row,
    Map<String, String> names,
  ) {
    final bookId = (row['book_id'] ?? '').toString();
    return MemorizationAttempt(
      id: (row['id'] ?? '').toString(),
      bookId: bookId,
      bookName: names[bookId] ?? bookId,
      chapter: (row['chapter'] as num?)?.toInt() ?? 0,
      verses: [
        for (final value in (row['verses'] as List? ?? const []))
          if (value is num) value.toInt()
      ],
      score: (row['score'] as num?)?.toInt() ?? 0,
      total: (row['total'] as num?)?.toInt() ?? 0,
      timeSeconds: (row['time_seconds'] as num?)?.toInt() ?? 0,
      difficulty: (row['difficulty'] ?? 'medium').toString(),
      createdAt: DateTime.tryParse((row['created_at'] ?? '').toString()) ??
          DateTime.now(),
    );
  }

  Future<List<MemorizationAttempt>> load({bool refreshRemote = true}) async {
    final local = await _loadLocal();
    final user = supabase.auth.currentUser;
    if (user == null || !refreshRemote) return local;

    try {
      final rows = await withExpiredJwtRetry(() => supabase
          .from('memorization_log')
          .select(
              'id, book_id, chapter, verses, score, total, time_seconds, difficulty, created_at')
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(100));
      final names = await _bookNames();
      final remote = [
        for (final row in rows as List)
          _fromRemote(Map<String, dynamic>.from(row as Map), names),
      ];
      final merged = <MemorizationAttempt>[...remote];
      for (final attempt in local) {
        final already = merged.any((item) => _sameAttempt(item, attempt));
        if (!already) merged.add(attempt);
      }
      merged.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      await _saveLocal(merged);
      return merged;
    } catch (_) {
      return local;
    }
  }

  Map<String, dynamic> _remotePayload(
    String userId,
    MemorizationAttempt attempt,
  ) {
    final difficulty = normalizeMemorizationDifficulty(attempt.difficulty);
    return {
      'user_id': userId,
      'book_id': attempt.bookId,
      'chapter': attempt.chapter,
      'verses': attempt.verses,
      'score': attempt.score,
      'total': attempt.total,
      'time_seconds': attempt.timeSeconds,
      // Keep the React Native value so both clients share the same rows.
      'difficulty': difficulty == 'full' ? 'fullText' : difficulty,
    };
  }

  /// Saves locally always. Returns whether Supabase confirmed the insert.
  Future<({MemorizationAttempt attempt, bool synced})> save(
    MemorizationAttempt attempt,
  ) async {
    var stored = attempt;
    final items = await _loadLocal()
      ..removeWhere((item) => item.id == attempt.id);
    items.insert(0, stored);
    await _saveLocal(items);

    final user = supabase.auth.currentUser;
    if (user == null) {
      return (attempt: stored, synced: false);
    }

    final payload = _remotePayload(user.id, stored);
    try {
      final row = await withExpiredJwtRetry(
        () => supabase
            .from('memorization_log')
            .insert(payload)
            .select('id, created_at')
            .single(),
      );
      final remoteId = (row['id'] ?? '').toString();
      final createdAt = DateTime.tryParse((row['created_at'] ?? '').toString());
      if (remoteId.isNotEmpty) {
        stored = MemorizationAttempt(
          id: remoteId,
          bookId: stored.bookId,
          bookName: stored.bookName,
          chapter: stored.chapter,
          verses: stored.verses,
          score: stored.score,
          total: stored.total,
          timeSeconds: stored.timeSeconds,
          difficulty: stored.difficulty,
          createdAt: createdAt ?? stored.createdAt,
        );
        final syncedItems = await _loadLocal()
          ..removeWhere((item) => item.id == attempt.id || item.id == remoteId);
        syncedItems.insert(0, stored);
        await _saveLocal(syncedItems);
      }
      return (attempt: stored, synced: true);
    } catch (error, stackTrace) {
      debugPrint('memorization_log insert failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      await OfflineSync.queueMemorization(user.id, attempt.id, payload);
      // Best-effort flush in case the failure was transient.
      unawaited(OfflineSync.flush());
      return (attempt: stored, synced: false);
    }
  }

  Future<MemorizationGoal> goal() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_goalKey);
    if (raw != null) {
      try {
        return MemorizationGoal.fromJson(
            Map<String, dynamic>.from(jsonDecode(raw) as Map));
      } catch (_) {}
    }
    final user = supabase.auth.currentUser;
    if (user == null) return const MemorizationGoal();
    try {
      final row = await withExpiredJwtRetry(() => supabase
          .from('memorization_goals')
          .select('target_per_week')
          .eq('user_id', user.id)
          .maybeSingle());
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
      await withExpiredJwtRetry(
        () => supabase
            .from('memorization_goals')
            .upsert({
              'user_id': user.id,
              'target_per_week': goal.target,
              'updated_at': DateTime.now().toIso8601String(),
            })
            .select('user_id')
            .single(),
      );
    } catch (error, stackTrace) {
      debugPrint('memorization_goals upsert failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      await OfflineSync.queueMemorizationGoal(user.id, goal.target);
      unawaited(OfflineSync.flush());
    }
  }

  Future<void> delete(String id) async {
    final items = await _loadLocal()
      ..removeWhere((item) => item.id == id);
    await _saveLocal(items);
  }
}
