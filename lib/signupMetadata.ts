const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

export function getOptionalPhoneError(phone: string, invalidMessage: string) {
  const trimmedPhone = phone.trim();
  return trimmedPhone && !PHONE_REGEX.test(trimmedPhone) ? invalidMessage : '';
}

export function buildSignupMetadata(name: string, phone: string) {
  const trimmedPhone = phone.trim();

  return {
    full_name: name.trim(),
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
    profile_completed: false,
    onboarding_completed: false,
  };
}
