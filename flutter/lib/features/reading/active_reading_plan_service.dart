import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/supabase_service.dart';

class ActiveReadingPlan {
  const ActiveReadingPlan(
      {required this.bookId,
      required this.bookName,
      required this.startChapter,
      required this.chaptersPerDay,
      required this.days,
      required this.completedDays,
      this.lastCompletedDate});
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
          lastCompletedDate: lastCompletedDate ?? this.lastCompletedDate);
  List<int> chaptersForDay(int chapterCount) {
    if (completedDays >= days) return [];
    final start = startChapter + completedDays * chaptersPerDay;
    return List.generate(chaptersPerDay, (i) => start + i)
        .where((chapter) => chapter > 0 && chapter <= chapterCount)
        .toList();
  }

  Map<String, dynamic> toJson() => {
        'bookId': bookId,
        'bookName': bookName,
        'startChapter': startChapter,
        'chaptersPerDay': chaptersPerDay,
        'days': days,
        'completedDays': completedDays,
        'lastCompletedDate': lastCompletedDate
      };
  factory ActiveReadingPlan.fromJson(Map<String, dynamic> x) =>
      ActiveReadingPlan(
          bookId: x['bookId'],
          bookName: x['bookName'],
          startChapter: x['startChapter'],
          chaptersPerDay: x['chaptersPerDay'],
          days: x['days'],
          completedDays: x['completedDays'] ?? 0,
          lastCompletedDate: x['lastCompletedDate'] as String?);
}

class ActiveReadingPlanService {
  String get _key =>
      'honara_active_plan_${supabase.auth.currentUser?.id ?? 'guest'}';
  Future<ActiveReadingPlan?> load() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    if (raw == null) return null;
    try {
      return ActiveReadingPlan.fromJson(
          Map<String, dynamic>.from(jsonDecode(raw) as Map));
    } catch (_) {
      return null;
    }
  }

  Future<void> save(ActiveReadingPlan? plan) async {
    final p = await SharedPreferences.getInstance();
    if (plan == null) {
      await p.remove(_key);
    } else {
      await p.setString(_key, jsonEncode(plan.toJson()));
    }
  }
}
