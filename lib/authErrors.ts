/**
 * Minimum password length enforced across all auth screens.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Translates common Supabase auth error messages to Arabic.
 */
export const localizeAuthError = (message: string): string => {
  if (/invalid login credentials/i.test(message))
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (/email not confirmed/i.test(message))
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  if (/user not found/i.test(message))
    return 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني';
  if (/user already registered/i.test(message))
    return 'هذا البريد الإلكتروني مسجل مسبقاً';
  if (/email already in use/i.test(message))
    return 'هذا البريد الإلكتروني مستخدم بالفعل';
  if (/too many requests/i.test(message))
    return 'محاولات كثيرة، يرجى الانتظار قليلاً والمحاولة مجدداً';
  if (/password should be at least/i.test(message))
    return `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`;
  if (/same password/i.test(message))
    return 'كلمة المرور الجديدة يجب أن تختلف عن القديمة';
  if (/token has expired|jwt expired|invalid token|invalid refresh token/i.test(message))
    return 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية';
  if (/invalid email/i.test(message))
    return 'يرجى إدخال بريد إلكتروني صحيح';
  return message;
};
