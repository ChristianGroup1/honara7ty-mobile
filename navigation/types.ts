export type RootStackParamList = {
  MainTabs: undefined;
  Welcome: undefined;
  SignupStep1: undefined;
  ProfileCompletion:
    | {
        userId?: string;
        email?: string;
        requires_login_before_submit?: boolean;
      }
    | undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { linkValid?: boolean };
  Onboarding: undefined;
  NotificationPermission: undefined;
  AboutIdea: undefined;
  PrayerNotes: undefined;
  SpiritualReflection: undefined;
  BibleReader: undefined;
  BibleMemorization: undefined;
  Badges: undefined;
  Testimonies: undefined;
  DailyNotifications: undefined;
  DevotionGuide: undefined;
  DevotionDetail: undefined;
  DevotionCalendar: undefined;
  DevotionGroups: undefined;
  DevotionGroupDetails: { groupId: string };
  DevotionGroupMemberDetails: {
    groupId: string;
    userId: string;
    displayName?: string;
  };
};
