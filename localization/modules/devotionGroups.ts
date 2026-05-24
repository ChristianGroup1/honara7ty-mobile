export const devotionGroupsStrings = {
  title: 'جروبات الخلوة',
  heroTitle: 'تابعوا الخلوة مع بعض',
  heroText:
    'اعمل جروب، شارك كود الدعوة، وشوف مين أخد خلوته النهارده وقرأ في إيه.',
  createTitle: 'إنشاء جروب',
  groupNamePlaceholder: 'اسم الجروب',
  create: 'إنشاء',
  joinTitle: 'انضمام لكود دعوة',
  inviteCodePlaceholder: 'كود الدعوة',
  join: 'انضمام',
  inviteCode: 'كود الدعوة',
  groupsCount: 'جروب',
  myGroupsTitle: 'جروباتي',
  groupDetailsTitle: 'تفاصيل الجروب',
  membersTitle: 'أعضاء الجروب',
  memberDetailsTitle: 'تفاصيل العضو',
  memberHistoryTitle: 'سجل الخلوة',
  memberCalendarTitle: 'تقويم العضو',
  memberCalendarCaption: 'اضغط على أي يوم لمعرفة تفاصيل الخلوة',
  recordedDays: 'أيام مسجلة',
  completedDays: 'أيام الخلوة',
  personalStatsTitle: 'إحصائياتي في الجروب',
  currentStreak: 'الثبات الحالي',
  commitmentRate: 'نسبة الالتزام',
  recordedAt: 'اتسجلت الساعة',
  latestDevotionTitle: 'آخر تسجيل خلوة',
  latestCompletedDevotionPrefix: 'آخر خلوة مكتملة:',
  noRecordForDay: 'مفيش تسجيل خلوة في اليوم ده.',
  recordDevotion: 'تسجيل خلوة',
  emptyMemberHistory: 'لسه مفيش سجل خلوة للعضو ده.',
  emptyGroups: 'لسه مفيش جروبات. اعمل جروب أو ادخل كود دعوة.',
  emptyMembers: 'لسه مفيش أعضاء في الجروب.',
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
  todayDevotionSavedMessage: 'تم تحديث حالتك في الجروب.',
  todayDevotionSavedOffline:
    'تم حفظ التغيير على الجهاز، وسيتم إرساله تلقائياً عند عودة الإنترنت.',
  sharedReadingTitle: 'قراءة الجروب المشتركة',
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
  sharedReadingEditorTitle: 'تحديد قراءة الجروب',
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
    'اختار إصحاح واحد أو أكثر كقراءة مشتركة للجروب.',
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
      return 'كل أعضاء الجروب سجلوا خلوة النهارده.';
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
    'سيصلك الآن تذكير الجروب حتى لو التطبيق مقفول.',
  deleteGroup: 'حذف الجروب',
  deleteGroupTitle: 'حذف الجروب؟',
  deleteGroupMessage:
    'سيتم حذف الجروب والأعضاء والتذكيرات المرتبطة به. لا يمكن التراجع عن هذه الخطوة.',
  removeMember: 'حذف العضو',
  removeMemberTitle: 'حذف العضو؟',
  removeMemberMessage: (name: string) =>
    `سيتم حذف ${name} من الجروب. يمكنه الانضمام مرة أخرى بكود الدعوة.`,
  makeMemberAdmin: 'تعيين أدمن',
  makeMemberAdminTitle: 'تعيين أدمن؟',
  makeMemberAdminMessage: (name: string) =>
    `سيتم تعيين ${name} كمسؤول في الجروب ويمكنه تذكير الأعضاء وإدارة القراءة المشتركة والأعضاء.`,
  removeMemberAdmin: 'إزالة الأدمن',
  removeMemberAdminTitle: 'إزالة الأدمن؟',
  removeMemberAdminMessage: (name: string) =>
    `سيتم إرجاع ${name} كعضو عادي ولن يستطيع إدارة القراءة المشتركة أو الأعضاء.`,
  cancel: 'إلغاء',
  owner: 'قائد',
  leader: 'مسؤول',
  member: 'عضو',
  missingGroupNameTitle: 'اسم الجروب مطلوب',
  missingGroupNameMessage: 'اكتب اسم واضح للجروب قبل الإنشاء.',
  missingInviteCodeTitle: 'كود الدعوة مطلوب',
  missingInviteCodeMessage: 'اكتب كود الدعوة للانضمام للجروب.',
  invalidInviteCodeTitle: 'كود الدعوة غير صحيح',
  genericErrorTitle: 'حدث خطأ',
  genericErrorMessage: 'حاول مرة أخرى بعد قليل.',
  reminderMessage: 'فاكر خلوة النهارده؟ مستنيين نشوف قرأت في إيه.',
  today: 'النهارده',
} as const;
