<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the honara7ty React Native app. Here is a summary of every change made:

## What was done

- **Installed `react-native-config`** to load environment variables at build time (native linking required — see note below).
- **Created `.env`** with `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` (covered by `.gitignore`).
- **Updated `lib/analyticsConfig.ts`** to read the API key and host from `react-native-config` instead of hardcoded values, and corrected the host to the EU region (`eu.i.posthog.com`).
- **Updated `lib/analytics.ts`** to always create a PostHog client instance (using `disabled: true` when env vars are absent), and exported it as `posthogClient` for use by the provider.
- **Added `PostHogProvider`** inside `NavigationContainer` in `navigation/RootNavigator.tsx` with touch autocapture enabled and manual screen tracking preserved.
- **Added `react-native-config` type declarations** to `svg.d.ts`.
- **Instrumented 12 events** across 7 screens with user identification on login/signup and session reset on logout.

## Event tracking table

| Event | Description | File |
|---|---|---|
| `user_logged_in` | Email/password login success | `components/login/LoginScreen.tsx` |
| `user_logged_in_google` | Google SSO login success | `components/login/LoginScreen.tsx` |
| `user_signed_up` | Account creation completed (profile step) | `components/profile-completion/ProfileCompletionScreen.tsx` |
| `user_signed_up_google` | Google SSO signup success | `components/signup/SignupScreen.tsx` |
| `user_logged_out` | User logout (from Home or Profile) | `components/home/HomeScreen.tsx`, `components/profile/ProfileScreen.tsx` |
| `devotion_logged` | Daily devotion saved (completed/skipped + book + chapters) | `components/home/HomeScreen.tsx` |
| `onboarding_completed` | User finishes onboarding slides | `components/onboarding/OnboardingScreen.tsx` |
| `prayer_note_created` | New prayer note created | `components/prayer-notes/PrayerNotesScreen.tsx` |
| `prayer_note_marked_answered` | Prayer note toggled to answered | `components/prayer-notes/PrayerNotesScreen.tsx` |
| `badge_shared` | Streak badge shared (badge key + streak days) | `components/badges/BadgesScreen.tsx` |
| `profile_updated` | User saves profile changes | `components/profile/ProfileScreen.tsx` |
| `notification_permission_requested` | Notification permission card tapped | `components/home/HomeScreen.tsx` |

Screen views are tracked automatically via the existing `trackScreen()` calls in `navigation/RootNavigator.tsx`. User identification (`posthog.identify`) is called on successful login and signup with `userId`, `email`, and `name`. `posthog.reset()` is called on logout.

## Native setup required

`react-native-config` requires a small native configuration step after installation:

- **Android**: The plugin is applied automatically via the Gradle plugin. Rebuild the project.
- **iOS**: Run `pod install` in the `ios/` directory, then rebuild.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics](https://eu.posthog.com/project/158366/dashboard/618330)
- **Insight 1 — User Acquisition: Daily Logins & Signups**: [View](https://eu.posthog.com/project/158366/insights/OLiyNwrJ)
- **Insight 2 — Signup → Onboarding → First Devotion Funnel**: [View](https://eu.posthog.com/project/158366/insights/O5tVQALd)
- **Insight 3 — Daily Devotion Engagement (Completed vs Skipped)**: [View](https://eu.posthog.com/project/158366/insights/kZiVr9Iy)
- **Insight 4 — Churn Signal: Logouts Over Time**: [View](https://eu.posthog.com/project/158366/insights/53WjcXPZ)
- **Insight 5 — Feature Engagement: Prayer Notes & Badges**: [View](https://eu.posthog.com/project/158366/insights/0ljkEkdp)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-native/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
