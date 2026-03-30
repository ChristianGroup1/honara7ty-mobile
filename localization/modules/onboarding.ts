export interface OnboardingSlide {
  key: string;
  title?: string;
  body?: string;
  verse?: string;
  verseRef?: string;
}

export const onboardingStrings = {
  eyebrow: 'رحلة قصيرة قبل البداية',
  skip: 'تخطي',
  slides: [
     {
      key: '1',
      title: 'مرحباً بك في تطبيق هنا راحتى ',
      body:
        '"هنا نساعدك تفتح كتابك المقدس وتقرأ فيه كل يوم بانتظام، وفي وقت محدد يناسبك علشان تفضل ثابت في علاقتك مع كلمة الله."',
    },
    {
      key: '2',
      body: 'اقرأ كتابك كل يوم، فيه قوة ليومك ونور لطريقك.',
      verse:
        'وُجِدَ كَلاَمُكَ فَأَكَلْتُهُ، فَكَانَ كَلاَمُكَ لِيلِلسُّرُورِ وَلِفَرَحِ قَلْبِي',
      verseRef: 'إرميا 15 : 16',
    },
   
    {
      key: '3',
      title: 'خلّي البداية اليوم',
      body:
        'ابدأ من النهارده حدد وقت تقابل فيه مع الله وتتغذى فيه من كلمته الحيه ومتكسلش يلا بينا',
    },
  ] as OnboardingSlide[],
  start: 'ابدأ معنا!',
  previous: 'سابق',
  next: 'لاحق',
} as const;
