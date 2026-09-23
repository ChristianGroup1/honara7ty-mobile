import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/memorization/memorization_service.dart';
import 'package:honara7ty/features/reminders/devotion_reminder.dart';

void main() {
  test('verse plan is stable and covers the schedule window', () {
    final start = DateTime.utc(2026, 9, 24, 4);
    final plan = devotionVersePlan(start, 25);
    expect(plan, hasLength(25));
    expect(plan, devotionVersePlan(start, 25));
    expect(devotionScheduleDays(includeFollowUp: true, android: true), 25);
    expect(devotionScheduleDays(includeFollowUp: true, android: false), 30);
  });

  test('morning reminder gets an evening follow-up', () {
    final primary = DateTime(2026, 9, 24, 7, 30);
    expect(followUpTime(primary, 7, 30), DateTime(2026, 9, 24, 19, 30));
    expect(followUpTime(DateTime(2026, 9, 24, 23, 40), 23, 40), isNull);
  });

  test('memorization goal counts perfect verses in the current month', () {
    final now = DateTime(2026, 9, 24);
    final stats = memorizationStats(
      [
        MemorizationAttempt(
          id: '1',
          bookId: '1',
          bookName: 'تكوين',
          chapter: 1,
          verses: const [1, 2],
          score: 2,
          total: 2,
          timeSeconds: 40,
          difficulty: 'medium',
          createdAt: now,
        ),
      ],
      const MemorizationGoal(period: 'month', target: 5),
      now,
    );
    expect(stats.periodCount, 2);
    expect(stats.perfectAttempts, 1);
    expect(stats.streak, 1);
    expect(stats.averageScore, 100);
  });
}
