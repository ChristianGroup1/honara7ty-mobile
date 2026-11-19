import '../../core/strings.dart';

String localizeAuthError(String message) {
  final text = message.toLowerCase();
  if (text.contains('invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  }
  if (text.contains('email not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  }
  if (text.contains('user not found')) {
    return 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني';
  }
  if (text.contains('user already registered') ||
      text.contains('email already in use') ||
      text.contains('already registered')) {
    return 'هذا البريد الإلكتروني مسجل مسبقاً';
  }
  if (text.contains('too many requests')) {
    return 'محاولات كثيرة، يرجى الانتظار قليلاً والمحاولة مجدداً';
  }
  if (text.contains('password should be at least')) {
    return AppStrings.signupPasswordTooShort(AppStrings.minPasswordLength);
  }
  if (text.contains('same password')) {
    return 'كلمة المرور الجديدة يجب أن تختلف عن القديمة';
  }
  if (text.contains('token has expired') ||
      text.contains('jwt expired') ||
      text.contains('invalid token') ||
      text.contains('invalid refresh token')) {
    return 'الرمز غير صالح أو منتهي الصلاحية';
  }
  if (text.contains('invalid email')) {
    return AppStrings.loginEmailInvalid;
  }
  return message;
}
