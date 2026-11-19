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
        MemorizationAttempt(
          id: '2',
          bookId: '43',
          bookName: 'يوحنا',
          chapter: 3,
          verses: const [16],
          score: 1,
          total: 2,
          timeSeconds: 55,
          difficulty: 'fullText',
          createdAt: now.subtract(const Duration(days: 1)),
        ),
      ],
      const MemorizationGoal(period: 'month', target: 5),
      now,
    );
    expect(stats.periodCount, 2);
    expect(stats.monthCount, 2);
    expect(stats.weekCount, 2);
    expect(stats.perfectAttempts, 1);
    expect(stats.totalVerses, 2);
    expect(stats.streak, 1);
    expect(stats.averageScore, 75);
    expect(stats.bestScore, 100);
    expect(stats.difficultyBreakdown.map((item) => item.difficulty),
        containsAll(['medium', 'full']));
    expect(formatMemorizationDuration(125), '2:05 د');
  });

  test('memorization keeps the new practice modes', () {
    for (final mode in ['order', 'choice', 'letters', 'fade']) {
      expect(normalizeMemorizationDifficulty(mode), mode);
    }
    expect(normalizeMemorizationDifficulty('fullText'), 'full');
    expect(normalizeMemorizationDifficulty('unknown'), 'medium');
  });

  test('memorization streak continues from yesterday', () {
    final now = DateTime(2026, 9, 24);
    final stats = memorizationStats(
      [
        MemorizationAttempt(
          id: '1',
          bookId: '1',
          bookName: 'تكوين',
          chapter: 1,
          verses: const [1],
          score: 1,
          total: 1,
          timeSeconds: 20,
          difficulty: 'easy',
          createdAt: now.subtract(const Duration(days: 1)),
        ),
      ],
      const MemorizationGoal(period: 'week', target: 3),
      now,
    );
    expect(stats.streak, 1);
    expect(stats.periodCount, 1);
  });
}
