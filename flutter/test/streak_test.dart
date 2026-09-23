import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/journal/devotion_service.dart';

void main() {
  test('streak counts consecutive days ending today', () {
    const dates = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-20'];
    expect(computeStreak(dates, DateTime(2026, 9, 24)), 3);
  });

  test('streak breaks when today is missing', () {
    expect(computeStreak(['2026-09-23'], DateTime(2026, 9, 24)), 0);
  });

  test('xp grows with completed days and levels', () {
    expect(computeTotalXp(0), 0);
    expect(computeTotalXp(7), 70 + 200);
  });

  test('multiple reading entries are preserved in reports and calendar text',
      () {
    final log = <String, dynamic>{
      'reading_entries': [
        {
          'reading_book': 'التكوين',
          'selected_chapters': [3, 1, 3]
        },
        {
          'reading_book': 'يوحنا',
          'selected_chapters': [2]
        },
      ],
    };
    expect(chaptersInLog(log), 3);
    expect(formatReadingEntries(log), 'التكوين 1، 3، يوحنا 2');
  });

  test('legacy single-reading rows remain readable', () {
    final log = <String, dynamic>{
      'reading_book': 'مرقس',
      'reading_chapter': 4,
    };
    final entries = readingEntriesFromLog(log);
    expect(entries, hasLength(1));
    expect(entries.single.book, 'مرقس');
    expect(entries.single.chapters, [4]);
  });
}
