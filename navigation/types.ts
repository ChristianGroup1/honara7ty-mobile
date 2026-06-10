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
  LockScreenVerse: undefined;
  Testimonies: undefined;
  DailyNotifications: undefined;
  DevotionGuide: undefined;
  DevotionDetail: undefined;
  DevotionCalendar: undefined;
  DevotionGroups: { joinSuccess?: boolean } | undefined;
  DevotionGroupInvite: { inviteCode: string };
  DevotionGroupDetails: { groupId: string };
  DevotionGroupPrayerRequests: { groupId: string; groupName?: string };
  DevotionGroupMemberDetails: {
    groupId: string;
    userId: string;
    displayName?: string;
  };
};
