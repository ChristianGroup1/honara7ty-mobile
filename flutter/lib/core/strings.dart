// ─── Arabic String Catalogue ────────────────────────────────────────────────
// Mirrors all localization/modules/*.ts files from the React Native source.

class AppStrings {
  // ── Navigation ──
  static const navHome = 'الرئيسية';
  static const navProfile = 'الملف الشخصي';
  static const navSettings = 'الإعدادات';
  static const navMore = 'المزيد';

  // ── Welcome ──
  static const welcomeTitle = 'أهلاً بيك في هنا راحتي';
  static const welcomeDescription =
      'إحنا فرحانين إنك معانا. التطبيق ده معمول عشان يشجعك تكون في تواصل مع الله دايمًا وفي وقت محدد كل يوم ، وتحفظ كلمته وتاخد خطوات في حياتك الروحية.';
  static const welcomeLogin = 'تسجيل الدخول';
  static const welcomeCreateAccount = 'إنشاء حساب جديد';

  // ── Auth – Common ──
  static const authLogin = 'تسجيل الدخول';
  static const authSignUp = 'إنشاء حساب';
  static const authEmail = 'البريد الإلكتروني';
  static const authEmailPlaceholder = 'أدخل بريدك الإلكتروني';
  static const authPassword = 'كلمة المرور';
  static const authPasswordPlaceholder = 'أدخل كلمة المرور';
  static const authForgotPassword = 'نسيت كلمه المرور ؟';
  static const authPlayServicesUnavailable =
      'خدمات Google Play غير متاحة أو قديمة.';
  static const authGenericErrorTitle = 'خطأ';
  static const authCancelledTitle = 'تم الإلغاء';
  static const authSignInInProgressTitle = 'جاري تسجيل الدخول';
  static const authSignUpInProgressTitle = 'جاري التسجيل';
  static const authInProgressMessage = 'العملية جارية بالفعل.';
  static const authSecureHint = 'دخول آمن ومشفّر';
  static const authOr = 'أو';
  static const authNext = 'التالي';

  // ── Auth – Login ──
  static const loginTitle = 'تسجيل الدخول';
  static const loginEmailRequired = 'يرجى إدخال البريد الإلكتروني';
  static const loginEmailInvalid = 'يرجى إدخال بريد إلكتروني صحيح';
  static const loginPasswordRequired = 'يرجى إدخال كلمة المرور';
  static const loginSignInErrorTitle = 'خطأ في تسجيل الدخول';
  static const loginCancelledMessage = 'تم إلغاء عملية تسجيل الدخول.';
  static const loginInProgressMessage = 'عملية تسجيل الدخول جارية بالفعل.';
  static const loginGoogleButton = 'تسجيل الدخول باستخدام جوجل';
  static const loginFacebookButton = 'تسجيل الدخول باستخدام فيسبوك';
  static const loginFooterPrefix = 'ليس لديك حساب؟ ';
  static const loginFooterAction = 'إنشاء حساب جديد';

  // ── Auth – Signup ──
  static const signupTitle = 'إنشاء حساب';
  static const signupFullName = 'الاسم الكامل';
  static const signupFullNamePlaceholder = 'أدخل اسمك';
  static const signupPhone = 'رقم الهاتف';
  static const signupPhonePlaceholder = 'أدخل رقم هاتفك';
  static const signupPasswordPlaceholder = '8 أحرف على الأقل';
  static const signupConfirmPassword = 'تأكيد كلمة المرور';
  static const signupConfirmPasswordPlaceholder = 'أعد إدخال كلمة المرور';
  static const signupFullNameRequired = 'يرجى إدخال الاسم الكامل';
  static const signupEmailRequired = 'يرجى إدخال البريد الإلكتروني';
  static const signupEmailInvalid = 'يرجى إدخال بريد إلكتروني صحيح';
  static const signupPhoneRequired = 'يرجى إدخال رقم الهاتف';
  static const signupPhoneInvalid = 'يرجى إدخال رقم هاتف صحيح';
  static const signupPasswordRequired = 'يرجى إدخال كلمة المرور';
  static const signupConfirmPasswordRequired = 'يرجى تأكيد كلمة المرور';
  static const signupConfirmPasswordMismatch = 'كلمة المرور غير متطابقة';
  static const signupSignUpErrorTitle = 'خطأ في التسجيل';
  static const signupCancelledMessage = 'تم إلغاء عملية التسجيل.';
  static const signupInProgressMessage = 'عملية التسجيل جارية بالفعل.';
  static const signupGoogleButton = 'إنشاء حساب باستخدام جوجل';
  static const signupFacebookButton = 'إنشاء حساب باستخدام فيسبوك';
  static const signupFooterPrefix = 'لديك حساب بالفعل؟ ';
  static const signupFooterAction = 'تسجيل الدخول';

  static String signupPasswordTooShort(int min) =>
      'كلمة المرور يجب أن تكون $min أحرف على الأقل';

  // ── Auth – Forgot Password ──
  static const forgotPasswordTitle = 'نسيت كلمة المرور؟';
  static const forgotPasswordEmailRequired = 'يرجى إدخال البريد الإلكتروني';
  static const forgotPasswordEmailInvalid =
      'يرجى إدخال بريد إلكتروني صحيح';
  static const forgotPasswordResetSentTitle = 'تحقق من بريدك!';
  static const forgotPasswordResetSentMessage =
      'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى:';
  static const forgotPasswordResetHint =
      'إذا لم تجد الرسالة، تحقق من مجلد الرسائل غير المرغوب فيها.';
  static const forgotPasswordResend = 'إرسال مرة أخرى';
  static const forgotPasswordSendRecoveryLink = 'إرسال رابط الاستعادة';
  static const forgotPasswordFooterPrefix = 'تذكرت كلمة المرور؟ ';
  static const forgotPasswordFooterAction = 'تسجيل الدخول';
  static const forgotPasswordInfoTitle = 'استعادة سريعة وآمنة';
  static const forgotPasswordInfoDescription =
      'أدخل بريدك الإلكتروني لنرسل لك رابطًا يعيدك مباشرة إلى حسابك.';

  // ── Auth – Reset Password ──
  static const resetPasswordInvalidLinkTitle = 'رابط غير صالح';
  static const resetPasswordNewPasswordTitle = 'تعيين كلمة مرور جديدة';
  static const resetPasswordNewPasswordRequired =
      'يرجى إدخال كلمة المرور الجديدة';
  static const resetPasswordConfirmRequired = 'يرجى تأكيد كلمة المرور';
  static const resetPasswordConfirmMismatch = 'كلمتا المرور غير متطابقتين';
  static const resetPasswordSuccessTitle = 'تم بنجاح! 🎉';
  static const resetPasswordSuccessMessage =
      'تم تغيير كلمة مرورك بنجاح. يمكنك الآن تسجيل الدخول باستخدامها.';
  static const resetPasswordLinkOffMessage =
      'رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.\nأدخل بريدك الإلكتروني لإرسال رابط جديد.';
  static const resetPasswordNewPassword = 'كلمة المرور الجديدة';
  static const resetPasswordConfirmPassword = 'تأكيد كلمة المرور';
  static const resetPasswordSubmit = 'تعيين كلمة المرور';
  static const resetPasswordSendNewLink = 'إرسال رابط جديد';
  static const resetPasswordFooterPrefix = 'تذكرت كلمة المرور؟ ';
  static const resetPasswordFooterAction = 'تسجيل الدخول';
  static String resetPasswordMinHint(int min) =>
      'كلمة المرور يجب أن تكون $min أحرف على الأقل';
  static String resetPasswordTooShort(int min) =>
      'كلمة المرور يجب أن تكون $min أحرف على الأقل';

  // ── Profile Completion ──
  static const profileCompletionTitle = 'إكمال الملف الشخصي';
  static const profileChurchSection = 'معلومات الكنيسة';
  static const profileChurch = 'الكنيسة';
  static const profileChurchPlaceholder = 'اسم الكنيسة';
  static const profileSect = 'الطائفة';
  static const profileSectPlaceholder = 'اسم الطائفة';
  static const profilePersonalSection = 'معلومات شخصية';
  static const profileBirthDate = 'تاريخ الميلاد';
  static const profileBirthDatePlaceholder = 'اضغط لاختيار التاريخ';
  static const profileGender = 'الجنس';
  static const profileMale = 'ذكر';
  static const profileFemale = 'أنثى';
  static const profileOptional = 'اختياري';
  static const profileSubmit = 'إنشاء الحساب';

  // ── Notification Permission ──
  static const notifPermissionTitle = 'تفعيل الإشعارات';
  static const notifPermissionSubtitle =
      'ابق على تواصل مع تذكيرات قراءة الكتاب المقدس وصلواتك اليومية.';
  static const notifPermissionAllow = 'السماح بالإشعارات';
  static const notifPermissionSkip = 'تخطي الآن';

  // ── Home ──
  static const homeGreetingMorning = 'صباح الخير';
  static const homeGreetingEvening = 'مساء الخير';
  static const homeDailyQuestionTitle = 'قرأت الكتاب المقدس اليوم؟';
  static const homeYes = 'نعم ✓';
  static const homeNo = 'لا';
  static const homeEditAnswer = 'تعديل الإجابة';
  static const homePrayerNotesTitle = 'طلبات الصلاة';
  static const homePrayerNotesSubtitle = 'سجّل طلباتك وشارك أفكارك';
  static const homeReflectionTitle = 'تأملات روحية';
  static const homeReflectionSubtitle = 'اكتب تأملاتك اليومية';
  static const homeLogoutTitle = 'تسجيل الخروج';
  static const homeLogoutMessage = 'هل تريد تسجيل الخروج؟';
  static const homeCancel = 'إلغاء';
  static const homeLogout = 'خروج';
  static const homeLater = 'لاحقًا';
  static const homeCorrectStreakTitle = 'أحسنت! 🎉';
  static const homeStartNowTitle = 'ابدأ الآن 📖';
  static const homeSavedOfflineMessage =
      'تم الحفظ محليًا وسيتم المزامنة عند الاتصال بالإنترنت.';
  static const homePermissionNoticeTitle = 'فعّل الإشعارات';
  static const homePermissionNoticeBody =
      'احصل على تذكيرات قراءة الكتاب المقدس كل يوم.';
  static const homePermissionEnable = 'تفعيل';
  static const homePermissionOpenSettings = 'فتح الإعدادات';
  static const homeReadingSelectionRequiredTitle = 'اختر قراءتك';
  static const homeReadingSelectionRequiredMessage =
      'الرجاء اختيار سفر وإصحاح للتسجيل.';

  // ── More Screen ──
  static const moreTitle = 'المزيد';
  static const moreNightModeTitle = 'الوضع الليلي';
  static const moreNightModeSubtitle = 'تفعيل المظهر الداكن';
  static const moreDevotionGuideTitle = 'دليل القداسة';
  static const moreDevotionGuideSubtitle = 'خطوات يومية للنمو الروحي';
  static const moreAboutIdeaTitle = 'فكرة التطبيق';
  static const moreAboutIdeaSubtitle = 'تعرف على القصة خلف التطبيق';
  static const moreBibleMemorizationTitle = 'حفظ الآيات';
  static const moreBibleMemorizationSubtitle = 'احفظ آيات الكتاب المقدس';
  static const moreLockScreenVerseTitle = 'آية شاشة القفل';
  static const moreLockScreenVerseSubtitle = 'اجعل آية خلفية شاشتك';
  static const moreBadgesTitle = 'الأوسمة';
  static const moreBadgesSubtitle = 'تابع تقدمك وإنجازاتك';
  static const moreDevotionCalendarTitle = 'تقويم التقديس';
  static const moreDevotionCalendarSubtitle = 'سجّل أيام قراءتك';

  // ── Profile ──
  static const profileTitle = 'الملف الشخصي';
  static const profileEditButton = 'تعديل';
  static const profileDevotionGroups = 'مجموعات التقديس';

  // ── Daily Notifications / Settings ──
  static const dailyNotifTitle = 'الإعدادات';
  static const dailyNotifReminderTitle = 'تذكير القراءة';
  static const dailyNotifReminderSubtitle = 'اختر وقت تذكيرك اليومي';

  // ── Prayer Notes ──
  static const prayerNotesTitle = 'طلبات الصلاة';
  static const prayerNotesAddButton = 'إضافة طلب';
  static const prayerNotesEmptyMessage = 'لا توجد طلبات صلاة بعد';
  static const prayerNotesAddFirst = 'أضف أول طلب صلاة لك';

  // ── Spiritual Reflection ──
  static const reflectionTitle = 'التأملات الروحية';
  static const reflectionAddButton = 'تأمل جديد';
  static const reflectionEmptyMessage = 'لا توجد تأملات بعد';

  // ── Bible Memorization ──
  static const memorizationTitle = 'حفظ الآيات';
  static const memorizationPickVerse = 'اختر آية للحفظ';
  static const memorizationStartButton = 'ابدأ الحفظ';

  // ── Badges ──
  static const badgesTitle = 'الأوسمة والإنجازات';
  static const badgesStreakTitle = 'السلسلة الحالية';
  static const badgesDays = 'يوم';

  // ── Lock Screen Verse ──
  static const lockScreenTitle = 'آية شاشة القفل';
  static const lockScreenPickVerse = 'اختر الآية';
  static const lockScreenPickTheme = 'اختر الثيم';
  static const lockScreenSave = 'حفظ كخلفية';

  // ── Devotion Guide ──
  static const devotionGuideTitle = 'دليل القداسة';

  // ── Devotion Calendar ──
  static const devotionCalendarTitle = 'تقويم التقديس';

  // ── Devotion Groups ──
  static const devotionGroupsTitle = 'مجموعات التقديس';
  static const devotionGroupsCreate = 'إنشاء مجموعة';
  static const devotionGroupsJoin = 'انضمام لمجموعة';
  static const devotionGroupsEmpty = 'لم تنضم لأي مجموعة بعد';

  // ── About Idea ──
  static const aboutIdeaTitle = 'فكرة التطبيق';

  // ── Reading Plan ──
  static const readingPlanTitle = 'خطة القراءة';

  // ── General ──
  static const generalSave = 'حفظ';
  static const generalCancel = 'إلغاء';
  static const generalDelete = 'حذف';
  static const generalEdit = 'تعديل';
  static const generalBack = 'رجوع';
  static const generalError = 'خطأ';
  static const generalSuccess = 'نجاح';
  static const generalLoading = 'جارٍ التحميل...';
  static const generalRetry = 'إعادة المحاولة';
  static const generalClose = 'إغلاق';
  static const generalConfirm = 'تأكيد';
  static const generalYes = 'نعم';
  static const generalNo = 'لا';

  static const int minPasswordLength = 8;
}
