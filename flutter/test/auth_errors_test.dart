import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/auth/auth_errors.dart';

void main() {
  test('auth errors from Supabase appear in Arabic', () {
    expect(
      localizeAuthError('Invalid login credentials'),
      'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    );
    expect(
      localizeAuthError('User already registered'),
      'هذا البريد الإلكتروني مسجل مسبقاً',
    );
    expect(
      localizeAuthError('Email not confirmed'),
      'يرجى تأكيد بريدك الإلكتروني أولاً',
    );
  });
}
