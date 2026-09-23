import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/reading/active_reading_plan_service.dart';

void main() {
  const plan = ActiveReadingPlan(
      bookId: '1',
      bookName: 'التكوين',
      startChapter: 49,
      chaptersPerDay: 3,
      days: 1,
      completedDays: 0);
  test('last day never includes chapters beyond end of book', () {
    expect(plan.chaptersForDay(50), [49, 50]);
  });
  test('completed plan has no additional reading', () {
    expect(plan.copyWith(completedDays: 1).chaptersForDay(50), isEmpty);
  });
  test('completion date and book survive persistence', () {
    final saved =
        plan.copyWith(completedDays: 1, lastCompletedDate: '2026-09-23');
    final restored = ActiveReadingPlan.fromJson(saved.toJson());
    expect(restored.lastCompletedDate, '2026-09-23');
    expect(restored.bookId, '1');
    expect(restored.completedDays, 1);
  });
}
