import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/support/support_service.dart';

void main() {
  test('support statuses have Arabic labels', () {
    expect(supportStatusLabel('open'), 'وصلت');
    expect(supportStatusLabel('in_progress'), 'بنشتغل عليها');
    expect(supportStatusLabel('waiting'), 'مستنيين ردك');
    expect(supportStatusLabel('resolved'), 'اتحلت');
    expect(supportStatusLabel('closed'), 'اتقفلت');
  });
}
