import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/core/app_open_log.dart';

void main() {
  test('app open day uses the device calendar date', () {
    expect(appOpenDay(DateTime(2026, 11, 20, 1, 5)), '2026-11-20');
    expect(appOpenDay(DateTime(2026, 1, 2, 23, 59)), '2026-01-02');
  });

  test('app open platform is one of the stored values', () {
    expect(const {'ios', 'android', 'other'}, contains(appOpenPlatform()));
  });
}
