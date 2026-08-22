import {
  buildSignupMetadata,
  getOptionalPhoneError,
} from '../lib/signupMetadata';

describe('optional signup phone', () => {
  it('accepts an empty phone number and omits it from signup metadata', () => {
    expect(getOptionalPhoneError('   ', 'invalid')).toBe('');
    expect(buildSignupMetadata('  Test User  ', '   ')).toEqual({
      full_name: 'Test User',
      profile_completed: false,
      onboarding_completed: false,
    });
  });

  it('keeps validating a phone number when the user provides one', () => {
    expect(getOptionalPhoneError('123', 'invalid')).toBe('invalid');
    expect(getOptionalPhoneError('+201001234567', 'invalid')).toBe('');
    expect(buildSignupMetadata('Test User', ' +201001234567 ')).toEqual({
      full_name: 'Test User',
      phone: '+201001234567',
      profile_completed: false,
      onboarding_completed: false,
    });
  });
});
