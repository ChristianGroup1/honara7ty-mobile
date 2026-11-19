# 64-reference screen/state coverage

The source Figma page contains exactly 64 raster screenshot frames (nodes `1:2`–`1:65`). Each row below is a separate reference slot, including modal and intermediate states. `Covered flow` means the Flutter implementation has the corresponding parent flow and action family. It does **not** certify pixel-level or exact-state parity. The Figma plan currently blocks individual frame reads, so every row still requires direct comparison against its source frame.

The shared design system has now been applied across the Flutter app: page headers, cards, buttons, fields, dialogs, bottom sheets, and the five-destination bottom navigation. This gives all 64 reference states the same visual foundation while preserving their existing screen-specific content and actions. Exact screenshot-by-screenshot matching remains pending.

| # | Figma node | Reference-state family | Flutter implementation | Status |
|---:|---|---|---|---|
| 01 | `1:2` | Badges/achievements overview | `BadgesScreen` | Flow covered; visual check pending |
| 02 | `1:3` | Home: daily devotion answer sheet | `HomeScreen` / `_DevotionAnswerSheet` | Flow covered; visual check pending |
| 03 | `1:4` | Home: devotion response feedback | `HomeScreen` / custom alert | Flow covered; visual check pending |
| 04 | `1:5` | Bible reader: book/chapter selection | `BibleReaderScreen` | Flow covered; visual check pending |
| 05 | `1:6` | Bible reader: selected verse actions | `BibleReaderScreen` | Flow covered; visual check pending |
| 06 | `1:7` | Bible reader: search state | `BibleReaderScreen` | Flow covered; visual check pending |
| 07 | `1:8` | Bible reader: saved/highlighted verses | `BibleReaderScreen` | Flow covered; visual check pending |
| 08 | `1:9` | Bible reader: reading options/menu | `BibleReaderScreen` | Flow covered; visual check pending |
| 09 | `1:10` | Bible reader: note/highlight interaction | `BibleReaderScreen` | Flow covered; visual check pending |
| 10 | `1:11` | Bible reader: alternate reading layout | `BibleReaderScreen` | Flow covered; visual check pending |
| 11 | `1:12` | Bible reader: word-meaning lookup | `BibleReaderScreen` / Strong's data | Flow covered; visual check pending |
| 12 | `1:13` | Bible reader: translation display | `BibleReaderScreen` | Flow covered; visual check pending |
| 13 | `1:14` | Bible reader: favorites list | `BibleReaderScreen` | Flow covered; visual check pending |
| 14 | `1:15` | Bible reader: highlights list | `BibleReaderScreen` | Flow covered; visual check pending |
| 15 | `1:16` | Bible reader: typography/color setting | `BibleReaderScreen` | Flow covered; visual check pending |
| 16 | `1:17` | Bible reader: selected verse/share action | `BibleReaderScreen` | Flow covered; visual check pending |
| 17 | `1:18` | Bible reader: chapter reading | `BibleReaderScreen` | Flow covered; visual check pending |
| 18 | `1:19` | Bible reader: additional reader state | `BibleReaderScreen` | Flow covered; visual check pending |
| 19 | `1:20` | Prayer notes: list | `PrayerNotesScreen` | Flow covered; visual check pending |
| 20 | `1:21` | Prayer notes: add/edit sheet | `PrayerNotesScreen` | Flow covered; visual check pending |
| 21 | `1:22` | Prayer notes: detail state | `PrayerNotesScreen` | Flow covered; visual check pending |
| 22 | `1:23` | Prayer notes: delete/answered feedback | `PrayerNotesScreen` | Flow covered; visual check pending |
| 23 | `1:24` | Prayer notes: voice memo | `PrayerNotesScreen` / `VoiceMemoField` | Flow covered; visual check pending |
| 24 | `1:25` | Spiritual reflection: list | `SpiritualReflectionScreen` | Flow covered; visual check pending |
| 25 | `1:26` | Spiritual reflection: add/edit sheet | `SpiritualReflectionScreen` | Flow covered; visual check pending |
| 26 | `1:27` | Spiritual reflection: detail state | `SpiritualReflectionScreen` | Flow covered; visual check pending |
| 27 | `1:28` | Spiritual reflection: delete confirmation | `SpiritualReflectionScreen` | Flow covered; visual check pending |
| 28 | `1:29` | Spiritual reflection: voice memo | `SpiritualReflectionScreen` / `VoiceMemoField` | Flow covered; visual check pending |
| 29 | `1:30` | Daily reminders: schedule settings | `DailyNotificationsScreen` | Flow covered; visual check pending |
| 30 | `1:31` | Daily reminders: time picker | `DailyNotificationsScreen` | Flow covered; visual check pending |
| 31 | `1:32` | Reading plan: suggestion list | `ReadingPlanSuggestionsScreen` | Flow covered; visual check pending |
| 32 | `1:33` | Reading plan: expanded plan details | `ReadingPlanSuggestionsScreen` | Flow covered; visual check pending |
| 33 | `1:34` | Memorization: passage picker | `BibleMemorizationScreen` | Flow covered; visual check pending |
| 34 | `1:35` | Memorization: selected passage/configuration | `BibleMemorizationScreen` | Flow covered; visual check pending |
| 35 | `1:36` | Memorization: recitation | `BibleMemorizationScreen` | Flow covered; visual check pending |
| 36 | `1:37` | Memorization: result | `BibleMemorizationScreen` | Flow covered; visual check pending |
| 37 | `1:38` | Memorization: statistics | `BibleMemorizationScreen` | Flow covered; visual check pending |
| 38 | `1:39` | Memorization: goal editor | `BibleMemorizationScreen` | Flow covered; visual check pending |
| 39 | `1:40` | Badges: streak/progress | `BadgesScreen` | Flow covered; visual check pending |
| 40 | `1:41` | Badges: earned/locked badge details | `BadgesScreen` | Flow covered; visual check pending |
| 41 | `1:42` | Badges: share feedback | `BadgesScreen` | Flow covered; visual check pending |
| 42 | `1:43` | Lock-screen verse: wallpaper preview | `LockScreenVerseScreen` | Flow covered; visual check pending |
| 43 | `1:44` | Lock-screen verse: theme selection | `LockScreenVerseScreen` | Flow covered; visual check pending |
| 44 | `1:45` | Lock-screen verse: book picker | `LockScreenVerseScreen` | Flow covered; visual check pending |
| 45 | `1:46` | Lock-screen verse: chapter picker | `LockScreenVerseScreen` | Flow covered; visual check pending |
| 46 | `1:47` | Lock-screen verse: verse picker | `LockScreenVerseScreen` | Flow covered; visual check pending |
| 47 | `1:48` | More/settings: menu | `MoreScreen` | Flow covered; visual check pending |
| 48 | `1:49` | More/settings: focus mode options | `MoreScreen` / `FocusMode` | Flow covered; visual check pending |
| 49 | `1:50` | More/settings: permission or guidance feedback | `MoreScreen` / focus guide | Flow covered; visual check pending |
| 50 | `1:51` | Profile: overview | `ProfileScreen` | Flow covered; visual check pending |
| 51 | `1:52` | Profile: edit details | `ProfileScreen` | Flow covered; visual check pending |
| 52 | `1:53` | Profile: date picker | `ProfileScreen` | Flow covered; visual check pending |
| 53 | `1:54` | Profile: sign-out confirmation | `ProfileScreen` | Flow covered; visual check pending |
| 54 | `1:55` | Profile: account deletion confirmation | `ProfileScreen` | Flow covered; visual check pending |
| 55 | `1:56` | Devotion guide: article list | `DevotionGuideScreen` | Flow covered; visual check pending |
| 56 | `1:57` | Devotion detail: article | `DevotionDetailScreen` | Flow covered; visual check pending |
| 57 | `1:58` | Devotion detail: focus/video state | `DevotionDetailScreen` | Flow covered; visual check pending |
| 58 | `1:59` | Devotion calendar: month grid | `DevotionCalendarScreen` | Flow covered; visual check pending |
| 59 | `1:60` | Devotion calendar: selected day | `DevotionCalendarScreen` | Flow covered; visual check pending |
| 60 | `1:61` | Devotion calendar: day editor/passages | `DevotionCalendarScreen` / Home devotion picker | Flow covered; visual check pending |
| 61 | `1:62` | Auth: welcome/signup entry | `SignupScreen` | Welcome entry intentionally removed; app now opens Login and Signup remains reachable from Login |
| 62 | `1:63` | Auth: signup/profile completion | `SignupScreen` / `ProfileCompletionScreen` | Flow covered; visual check pending |
| 63 | `1:64` | Auth: forgot-password sent state | `ForgotPasswordScreen` | Flow covered; visual check pending |
| 64 | `1:65` | Auth: login/reset-password states | `LoginScreen` / `ResetPasswordScreen` | Flow covered; visual check pending |

## Coverage summary

- Reference frames inventoried: **64 / 64** (node IDs `1:2` through `1:65`).
- Major original screen flows represented in Flutter: auth/onboarding, home, prayer and reflection journals, daily reminders/reading plans, Bible reader, memorization, badges, lock-screen verse, settings/profile, devotion guide/detail/calendar.
- Additional original flows also included: devotion groups and subflows, weekly report, and idea/about screen.
- Direct screenshot-by-screenshot visual verification: **pending** because Figma has currently blocked individual image reads on this account. The frame family labels above are an implementation coverage checklist, not a certified reconstruction of each screenshot. Recheck labels and visuals against the Figma frame once access is available.
