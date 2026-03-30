import { authStrings } from './modules/auth';
import { sharedStrings } from './modules/shared';
import { navigationStrings } from './modules/navigation';
import { welcomeStrings } from './modules/welcome';
import { homeStrings } from './modules/home';
import { moreStrings } from './modules/more';
import { profileStrings } from './modules/profile';
import { dailyNotificationsStrings } from './modules/dailyNotifications';
import { devotionCalendarStrings } from './modules/devotionCalendar';
import { notificationsStrings } from './modules/notifications';
import { prayerNotesStrings } from './modules/prayerNotes';
import { spiritualReflectionStrings } from './modules/spiritualReflection';
import { badgesStrings } from './modules/badges';
import { bibleMemorizationStrings } from './modules/bibleMemorization';
import { devotionStrings } from './modules/devotion';
import { onboardingStrings } from './modules/onboarding';

const locales = {
  ar: {
    auth: authStrings,
    shared: sharedStrings,
    navigation: navigationStrings,
    welcome: welcomeStrings,
    home: homeStrings,
    more: moreStrings,
    profile: profileStrings,
    dailyNotifications: dailyNotificationsStrings,
    devotionCalendar: devotionCalendarStrings,
    notifications: notificationsStrings,
    prayerNotes: prayerNotesStrings,
    spiritualReflection: spiritualReflectionStrings,
    badges: badgesStrings,
    bibleMemorization: bibleMemorizationStrings,
    devotion: devotionStrings,
    onboarding: onboardingStrings,
  },
} as const;

export type SupportedLocale = keyof typeof locales;

let currentLocale: SupportedLocale = 'ar';

export const setLocale = (locale: SupportedLocale) => {
  currentLocale = locale;
};

export const getLocale = () => currentLocale;

export const getStrings = () => locales[currentLocale];
