export const devotionGroupsStrings = {
  title: 'مجموعات الخلوة',
  heroTitle: 'تابعوا الخلوة مع بعض',
  heroText:
    'اعمل مجموعة خلوة، شارك كود الدعوة، وشوف مين أخد خلوته النهارده وقرأ في إيه.',
  createTitle: 'إنشاء مجموعة خلوة',
  groupNamePlaceholder: 'اسم مجموعة الخلوة',
  create: 'إنشاء',
  joinTitle: 'انضمام لكود دعوة',
  inviteCodePlaceholder: 'كود الدعوة',
  join: 'انضمام',
  inviteCode: 'كود الدعوة',
  inviteLink: 'لينك الدعوة',
  inviteShareMessage: (link: string) =>
    `اتدعيت لمجموعة خلوة على هنار حتي. افتح اللينك لو حابب تدخل:\n${link}`,
  groupsCount: 'مجموعة خلوة',
  searchGroupsPlaceholder: 'ابحث في المجموعات...',
  myGroupsTitle: 'مجموعات الخلوة',
  groupDetailsTitle: 'تفاصيل مجموعة الخلوة',
  membersTitle: 'أعضاء مجموعة الخلوة',
  memberDetailsTitle: 'تفاصيل العضو',
  memberHistoryTitle: 'سجل الخلوة',
  memberCalendarTitle: 'تقويم العضو',
  memberCalendarCaption: 'اضغط على أي يوم لمعرفة تفاصيل الخلوة',
  recordedDays: 'أيام مسجلة',
  completedDays: 'أيام الخلوة',
  personalStatsTitle: 'إحصائياتي في مجموعة الخلوة',
  currentStreak: 'الثبات الحالي',
  commitmentRate: 'نسبة الالتزام',
  recordedAt: 'اتسجلت الساعة',
  latestDevotionTitle: 'آخر تسجيل خلوة',
  latestCompletedDevotionPrefix: 'آخر خلوة مكتملة:',
  noRecordForDay: 'مفيش تسجيل خلوة في اليوم ده.',
  recordDevotion: 'تسجيل خلوة',
  emptyMemberHistory: 'لسه مفيش سجل خلوة للعضو ده.',
  emptyGroups: 'لسه مفيش مجموعات خلوة. اعمل مجموعة خلوة أو ادخل كود دعوة.',
  emptyMembers: 'لسه مفيش أعضاء في مجموعة الخلوة.',
  completed: 'أخذ الخلوة',
  notCompleted: 'لم يسجل الخلوة',
  noReadingDetails: 'بدون تفاصيل قراءة',
  todayDevotionTitle: 'خلوة النهارده',
  todayDevotionNotAnswered: 'سجل بسرعة هل أخدت خلوة النهارده ولا لا.',
  todayDevotionCompleted: 'أنت مسجل إنك أخذت الخلوة النهارده.',
  todayDevotionNotCompleted: 'أنت مسجل إنك لم تأخذ الخلوة النهارده.',
  answerTodayDevotion: 'سجل خلوة اليوم',
  editTodayDevotion: 'تعديل تسجيل الخلوة',
  markDevotionCompleted: 'أخذت الخلوة',
  markDevotionNotCompleted: 'لم آخذها',
  todayDevotionSavedTitle: 'تم تسجيل الخلوة',
  todayDevotionSavedMessage: 'تم تحديث حالتك في مجموعة الخلوة.',
  todayDevotionSavedOffline:
    'تم حفظ التغيير على الجهاز، وسيتم إرساله تلقائياً عند عودة الإنترنت.',
  sharedReadingTitle: 'قراءة مجموعة الخلوة المشتركة',
  noSharedReading: 'كل عضو يقرأ الجزء المناسب له. لم يتم تحديد جزء مشترك.',
  sharedTargetPrefix: 'الهدف:',
  noSharedTarget: 'بدون مدة محددة',
  targetOneWeek: 'خلال أسبوع',
  targetOneMonth: ' خلال شهر',
  targetTwoMonths: 'خلال شهرين',
  targetDays: (days: number) => `خلال ${days} يوم`,
  customTarget: 'مدة محددة',
  customTargetPlaceholder: 'عدد الأيام',
  setSharedReading: 'تحديد جزء مشترك',
  editSharedReading: 'تعديل الجزء المشترك',
  clearSharedReading: 'إلغاء الجزء المشترك',
  saveSharedReading: 'حفظ الجزء',
  groupPrayerRequestsTitle: 'طلبات الصلاة في المجموعة',
  groupPrayerRequestsSubtitle:
    'شارك طلب صلاة مع أعضاء المجموعة عشان يصلوا معاك.',
  groupPrayerRequestPlaceholder: 'اكتب طلب الصلاة هنا...',
  openGroupPrayerRequests: 'فتح طلبات الصلاة',
  sharePrayerRequest: 'مشاركة طلب الصلاة',
  editPrayerRequestTitle: 'تعديل طلب الصلاة',
  editPrayerRequest: 'تعديل',
  savePrayerRequest: 'حفظ التعديل',
  deletePrayerRequest: 'حذف',
  deletePrayerRequestTitle: 'حذف طلب الصلاة؟',
  deletePrayerRequestMessage: 'سيتم حذف طلب الصلاة من المجموعة.',
  emptyGroupPrayerRequests: 'لسه مفيش طلبات صلاة مشتركة في المجموعة.',
  sharedReadingEditorTitle: 'تحديد قراءة مجموعة الخلوة',
  sharedReadingEditorSubtitle:
    'اختار سفر وإصحاحات لو حابين تقروا نفس الجزء مع بعض. ممكن تسيبها فاضية عادي.',
  sharedReadingRequiredTitle: 'اختيار الجزء مطلوب',
  sharedReadingRequiredMessage: 'اختار سفر وإصحاح واحد على الأقل قبل الحفظ.',
  selectBook: 'اختار السفر',
  selectChapters: 'اختار الإصحاحات',
  selectBookFirst: 'اختار السفر الأول',
  selectAllChapters: 'اختيار كل الإصحاحات',
  sharedTargetTitle: 'هدف القراءة',
  sharedTargetHint: 'اختار مدة تقريبية لإنهاء الجزء، أو سيبها بدون مدة.',
  sharedTargetRequiredTitle: 'مدة القراءة مطلوبة',
  sharedTargetRequiredMessage: 'اكتب عدد أيام صحيح للمدة المحددة.',
  oldTestament: 'العهد القديم',
  newTestament: 'العهد الجديد',
  bookCount: 'سفر',
  sharedReadingChapterHint:
    'اختار إصحاح واحد أو أكثر كقراءة مشتركة لمجموعة الخلوة.',
  sendPendingReminders: 'تذكير الأعضاء المتأخرين',
  pendingRemindersSentTitle: 'تم إرسال التذكيرات',
  pendingRemindersSentMessage: ({
    sent,
    pending,
    missingTokens,
  }: {
    sent: number;
    pending: number;
    missingTokens: number;
  }) => {
    if (pending === 0) {
      return 'كل أعضاء مجموعة الخلوة سجلوا خلوة النهارده.';
    }

    if (sent === 0) {
      return `يوجد ${pending} عضو لم يسجل خلوته، لكن لا يوجد جهاز مسجل لاستقبال الإشعارات. لازم يفتحوا التطبيق مرة ويوافقوا على الإشعارات.`;
    }

    if (missingTokens > 0) {
      return `تم إرسال التذكير إلى ${sent} جهاز. يوجد ${missingTokens} عضو متأخر بدون جهاز مسجل للإشعارات.`;
    }

    return `تم إرسال التذكير إلى ${sent} جهاز.`;
  },
  pushRegistrationFailedTitle: 'لم يتم تسجيل الجهاز',
  pushRegistrationFailedMessage:
    'لم نتمكن من تسجيل جهازك للإشعارات. تأكد من السماح بالإشعارات ثم حاول مرة أخرى.',
  pushRegistrationSuccessTitle: 'تم تسجيل الجهاز',
  pushRegistrationSuccessMessage:
    'سيصلك الآن تذكير مجموعة الخلوة حتى لو التطبيق مقفول.',
  joinSuccessTitle: 'تم الانضمام',
  joinSuccessMessage: 'تم الانضمام لمجموعة الخلوة بنجاح.',
  inviteScreenTitle: 'دعوة مجموعة خلوة',
  inviteScreenHeading: 'اتدعيت لمجموعة خلوة',
  inviteScreenBody:
    'لو حابب تدخل مجموعة الخلوة اضغط انضمام، ولو مش حابب تقدر ترجع للصفحة الرئيسية.',
  acceptInvite: 'انضمام لمجموعة الخلوة',
  checkingInviteStatus: 'بنتأكد من حالة الدعوة...',
  alreadyJoinedGroupTitle: 'أنت موجود في مجموعة الخلوة',
  alreadyJoinedGroupMessage:
    'أنت منضم لمجموعة الخلوة بالفعل. تقدر تفتح المجموعة أو ترجع للصفحة الرئيسية.',
  alreadyJoinedGroup: 'أنت منضم لمجموعة الخلوة بالفعل.',
  openGroup: 'فتح مجموعة الخلوة',
  goHome: 'الصفحة الرئيسية',
  declineInvite: 'الصفحة الرئيسية',
  leaveGroup: 'الخروج من مجموعة الخلوة',
  leaveGroupTitle: 'الخروج من مجموعة الخلوة؟',
  leaveGroupMessage:
    'سيتم خروجك من مجموعة الخلوة. يمكنك الانضمام مرة أخرى بكود الدعوة.',
  deleteGroup: 'حذف مجموعة الخلوة',
  deleteGroupTitle: 'حذف مجموعة الخلوة؟',
  deleteGroupMessage:
    'سيتم حذف مجموعة الخلوة والأعضاء والتذكيرات المرتبطة بها. لا يمكن التراجع عن هذه الخطوة.',
  removeMember: 'حذف العضو',
  removeMemberTitle: 'حذف العضو؟',
  removeMemberMessage: (name: string) =>
    `سيتم حذف ${name} من مجموعة الخلوة. يمكنه الانضمام مرة أخرى بكود الدعوة.`,
  makeMemberAdmin: 'تعيين أدمن',
  makeMemberAdminTitle: 'تعيين أدمن؟',
  makeMemberAdminMessage: (name: string) =>
    `سيتم تعيين ${name} كمسؤول في مجموعة الخلوة ويمكنه تذكير الأعضاء وإدارة القراءة المشتركة والأعضاء.`,
  removeMemberAdmin: 'إزالة الأدمن',
  removeMemberAdminTitle: 'إزالة الأدمن؟',
  removeMemberAdminMessage: (name: string) =>
    `سيتم إرجاع ${name} كعضو عادي ولن يستطيع إدارة القراءة المشتركة أو الأعضاء.`,
  cancel: 'إلغاء',
  owner: 'قائد',
  leader: 'مسؤول',
  member: 'عضو',
  missingGroupNameTitle: 'اسم مجموعة الخلوة مطلوب',
  missingGroupNameMessage: 'اكتب اسم واضح لمجموعة الخلوة قبل الإنشاء.',
  missingInviteCodeTitle: 'كود الدعوة مطلوب',
  missingInviteCodeMessage: 'اكتب كود الدعوة للانضمام لمجموعة الخلوة.',
  invalidInviteCodeTitle: 'كود الدعوة غير صحيح',
  genericErrorTitle: 'حدث خطأ',
  genericErrorMessage: 'حاول مرة أخرى بعد قليل.',
  reminderMessage: 'فاكر خلوة النهارده؟ مستنيين نشوف قرأت في إيه.',
  today: 'النهارده',
} as const;
