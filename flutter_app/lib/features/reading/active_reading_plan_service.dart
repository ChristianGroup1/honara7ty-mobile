import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';
import 'bible_catalog.dart';

class ActiveReadingPlan {
  const ActiveReadingPlan({
    required this.bookId,
    required this.bookName,
    required this.startChapter,
    required this.chaptersPerDay,
    required this.days,
    required this.completedDays,
    this.lastCompletedDate,
  });

  final String? lastCompletedDate;
  final String bookId, bookName;
  final int startChapter, chaptersPerDay, days, completedDays;

  ActiveReadingPlan copyWith({int? completedDays, String? lastCompletedDate}) =>
      ActiveReadingPlan(
        bookId: bookId,
        bookName: bookName,
        startChapter: startChapter,
        chaptersPerDay: chaptersPerDay,
        days: days,
        completedDays: completedDays ?? this.completedDays,
        lastCompletedDate: lastCompletedDate ?? this.lastCompletedDate,
      );

  List<int> chaptersForDay(int chapterCount) {
    if (completedDays >= days) return [];
    final start = startChapter + completedDays * chaptersPerDay;
    return List.generate(chaptersPerDay, (i) => start + i)
        .where((chapter) => chapter > 0 && chapter <= chapterCount)
        .toList();
  }

  /// Chapters the plan is on now: today's reading, or the last reached day.
  List<int> resumeChapters(int chapterCount) {
    final current = chaptersForDay(chapterCount);
    if (current.isNotEmpty) return current;
    if (chapterCount <= 0) return const [];
    final pace = chaptersPerDay < 1 ? 1 : chaptersPerDay;
    final reached = completedDays > 0 ? completedDays - 1 : 0;
    final start = (startChapter + reached * pace).clamp(1, chapterCount);
    final end = (start + pace - 1).clamp(start, chapterCount);
    return [for (var chapter = start; chapter <= end; chapter++) chapter];
  }

  Map<String, dynamic> toJson() => {
        'bookId': bookId,
        'bookName': bookName,
        'startChapter': startChapter,
        'chaptersPerDay': chaptersPerDay,
        'days': days,
        'completedDays': completedDays,
        'lastCompletedDate': lastCompletedDate,
      };

  factory ActiveReadingPlan.fromJson(Map<String, dynamic> x) =>
      ActiveReadingPlan(
        bookId: '${x['bookId']}',
        bookName: '${x['bookName']}',
        startChapter: (x['startChapter'] as num?)?.toInt() ?? 1,
        chaptersPerDay: (x['chaptersPerDay'] as num?)?.toInt() ?? 1,
        days: (x['days'] as num?)?.toInt() ?? 1,
        completedDays: (x['completedDays'] as num?)?.toInt() ?? 0,
        lastCompletedDate: x['lastCompletedDate'] as String?,
      );
}

class ActiveReadingPlanService {
  String get _key =>
      'honara_active_plan_${supabase.auth.currentUser?.id ?? 'guest'}';

  Future<ActiveReadingPlan?> load({bool refreshRemote = true}) async {
    final local = await _readLocal();
    if (!refreshRemote) return local;
    final user = supabase.auth.currentUser;
    if (user == null) return local;

    ActiveReadingPlan? remote = _fromMeta(user.userMetadata);

    try {
      final row = await supabase
          .from('profiles')
          .select('active_reading_plan')
          .eq('id', user.id)
          .maybeSingle();
      final planJson = row?['active_reading_plan'];
      if (planJson is Map) {
        remote = ActiveReadingPlan.fromJson(
          Map<String, dynamic>.from(planJson),
        );
      }
    } catch (_) {
      try {
        final row = await supabase
            .from('profiles')
            .select('reading_book, reading_chapter, daily_chapters_target')
            .eq('id', user.id)
            .maybeSingle();
        if (remote == null && row?['reading_book'] != null) {
          final catalog = await loadBibleCatalog();
          final matched = findBibleBook(
            catalog,
            id: local?.bookId,
            name: '${row!['reading_book']}',
          );
          remote = ActiveReadingPlan(
            bookId: matched?.id ?? local?.bookId ?? '1',
            bookName: matched?.name ?? '${row['reading_book']}',
            startChapter: (row['reading_chapter'] as num?)?.toInt() ?? 1,
            chaptersPerDay:
                (row['daily_chapters_target'] as num?)?.toInt() ?? 1,
            days: local?.days ?? 30,
            completedDays: local?.completedDays ?? 0,
            lastCompletedDate: local?.lastCompletedDate,
          );
        }
      } catch (_) {}
    }

    if (remote != null) {
      await _writeLocal(remote);
      return remote;
    }
    return local;
  }

  Future<void> save(ActiveReadingPlan? plan) async {
    await _writeLocal(plan);
    final user = supabase.auth.currentUser;
    if (user == null) return;

    // Full plan always lands in auth metadata (works on current schema).
    await OfflineSync.saveAuthMetadata(user.id, {
      'active_reading_plan': plan?.toJson(),
    });

    // Mirror summary fields used by older clients / admin.
    final summary = <String, dynamic>{
      if (plan != null) ...{
        'reading_book': plan.bookName,
        'reading_chapter': plan.startChapter,
        'daily_chapters_target': plan.chaptersPerDay,
      },
    };
    if (summary.isNotEmpty) {
      await OfflineSync.saveProfile(user.id, summary);
    }

    // Best-effort dedicated column once the migration is applied.
    try {
      await supabase.from('profiles').upsert({
        'id': user.id,
        'active_reading_plan': plan?.toJson(),
        'updated_at': DateTime.now().toIso8601String(),
      });
    } catch (_) {}
  }

  Future<void> syncPending() async {
    final plan = await _readLocal();
    final user = supabase.auth.currentUser;
    if (user == null) return;
    await save(plan);
  }

  ActiveReadingPlan? _fromMeta(Map<String, dynamic>? meta) {
    final raw = meta?['active_reading_plan'];
    if (raw is! Map) return null;
    try {
      return ActiveReadingPlan.fromJson(Map<String, dynamic>.from(raw));
    } catch (_) {
      return null;
    }
  }

  Future<ActiveReadingPlan?> _readLocal() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    if (raw == null) return null;
    try {
      return ActiveReadingPlan.fromJson(
        Map<String, dynamic>.from(jsonDecode(raw) as Map),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeLocal(ActiveReadingPlan? plan) async {
    final prefs = await SharedPreferences.getInstance();
    if (plan == null) {
      await prefs.remove(_key);
    } else {
      await prefs.setString(_key, jsonEncode(plan.toJson()));
    }
  }
}
