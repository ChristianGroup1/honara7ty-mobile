import {
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  localizeAuthError,
} from '../lib/authErrors';

describe('authErrors', () => {
  it('localizes common auth messages to Arabic', () => {
    expect(localizeAuthError('Invalid login credentials')).toBe(
      'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    );
    expect(localizeAuthError('User already registered')).toBe(
      'هذا البريد الإلكتروني مسجل مسبقاً',
    );
    expect(localizeAuthError('Password should be at least 8 characters')).toBe(
      `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
    );
  });

  it('returns unknown messages as-is', () => {
    expect(localizeAuthError('Something custom happened')).toBe(
      'Something custom happened',
    );
  });

  it('validates emails with the shared regex', () => {
    expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
    expect(EMAIL_REGEX.test('invalid-email')).toBe(false);
  });
});
