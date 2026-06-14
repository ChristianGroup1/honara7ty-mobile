export const weeklyReportStrings = {
  title: 'أسبوعك مع ربنا',
  eyebrow: 'ملخص الأسبوع',
  rangeLabel: (start: string, end: string) => `من ${start} إلى ${end}`,
  loading: 'بنجمّع ملخص أسبوعك...',
  refresh: 'تحديث',
  stats: {
    devotionDays: 'أيام الخلوة',
    devotionDaysValue: (done: number, total: number) => `${done} / ${total}`,
    streak: 'سلسلة الثبات',
    streakValue: (days: number) => `${days} يوم`,
    chapters: 'إصحاحات قرأتها',
    verses: 'آيات حفظتها',
    prayers: 'طلبات صلاة جديدة',
    answered: 'صلوات مستجابة',
    reflections: 'تأملات كتبتها',
  },
  encouragement: {
    none: 'كل يوم فرصة جديدة تبدأ فيها وقتك مع ربنا. ابدأ النهارده 💙',
    some: 'بداية كويسة! كمّل وخلّي وقتك مع ربنا ثابت كل يوم 🙏',
    most: 'أسبوع مليان بركة 👏 ربنا يثبتك ويزيدك.',
    perfect: 'أسبوع كامل مع ربنا 🎉 نعمة كبيرة، استمر!',
  },
  emptyTitle: 'لسه مفيش نشاط الأسبوع ده',
  emptyMessage: 'ابدأ خلوتك أو سجّل تأملك وهتلاقي ملخص أسبوعك يظهر هنا.',
  shareTitle: 'أسبوعي مع ربنا',
  shareButton: 'شارك ملخص أسبوعك',
  shareMessage: (params: {
    devotionDays: number;
    totalDays: number;
    streak: number;
    chapters: number;
    verses: number;
    prayers: number;
    reflections: number;
  }) =>
    `📖 أسبوعي مع ربنا\n\n` +
    `🕊️ أيام الخلوة: ${params.devotionDays} من ${params.totalDays}\n` +
    `🔥 سلسلة الثبات: ${params.streak} يوم\n` +
    `📚 إصحاحات قريتها: ${params.chapters}\n` +
    `💭 آيات حفظتها: ${params.verses}\n` +
    `🙏 طلبات صلاة جديدة: ${params.prayers}\n` +
    `📝 تأملات كتبتها: ${params.reflections}`,
  shareErrorTitle: 'تعذّرت المشاركة',
} as const;
