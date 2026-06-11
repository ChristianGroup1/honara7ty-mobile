// ─── App Router (GoRouter) ───────────────────────────────────────────────────
// Mirrors navigation/RootNavigator.tsx + navigation/MainTabNavigator.tsx.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/welcome_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/profile_completion/profile_completion_screen.dart';
import '../screens/notification_permission/notification_permission_screen.dart';
import '../screens/main/main_tabs_screen.dart';
import '../screens/prayer_notes/prayer_notes_screen.dart';
import '../screens/spiritual_reflection/spiritual_reflection_screen.dart';
import '../screens/bible_memorization/bible_memorization_screen.dart';
import '../screens/badges/badges_screen.dart';
import '../screens/lock_screen_verse/lock_screen_verse_screen.dart';
import '../screens/devotion/devotion_guide_screen.dart';
import '../screens/devotion/devotion_detail_screen.dart';
import '../screens/devotion_calendar/devotion_calendar_screen.dart';
import '../screens/devotion_groups/devotion_groups_screen.dart';
import '../screens/devotion_groups/devotion_group_invite_screen.dart';
import '../screens/devotion_groups/devotion_group_details_screen.dart';
import '../screens/devotion_groups/devotion_group_member_details_screen.dart';
import '../screens/devotion_groups/devotion_group_prayer_requests_screen.dart';
import '../screens/about_idea/about_idea_screen.dart';
import '../screens/reading_plan/reading_plan_suggestions_screen.dart';
import '../screens/daily_notifications/daily_notifications_screen.dart';

// Named route constants – mirrors navigation/types.ts
class Routes {
  static const splash = '/';
  static const welcome = '/welcome';
  static const login = '/login';
  static const signup = '/signup';
  static const forgotPassword = '/forgot-password';
  static const resetPassword = '/reset-password';
  static const onboarding = '/onboarding';
  static const profileCompletion = '/profile-completion';
  static const notificationPermission = '/notification-permission';
  static const mainTabs = '/main';
  static const prayerNotes = '/prayer-notes';
  static const spiritualReflection = '/spiritual-reflection';
  static const bibleMemorization = '/bible-memorization';
  static const badges = '/badges';
  static const lockScreenVerse = '/lock-screen-verse';
  static const devotionGuide = '/devotion-guide';
  static const devotionDetail = '/devotion-detail';
  static const devotionCalendar = '/devotion-calendar';
  static const devotionGroups = '/devotion-groups';
  static const devotionGroupInvite = '/devotion-group-invite';
  static const devotionGroupDetails = '/devotion-group-details';
  static const devotionGroupPrayerRequests = '/devotion-group-prayer-requests';
  static const devotionGroupMemberDetails = '/devotion-group-member-details';
  static const aboutIdea = '/about-idea';
  static const readingPlanSuggestions = '/reading-plan-suggestions';
  static const dailyNotifications = '/daily-notifications';
}

GoRouter buildRouter(BuildContext context) {
  final authProvider = Provider.of<AuthProvider>(context, listen: false);

  return GoRouter(
    initialLocation: Routes.splash,
    refreshListenable: authProvider,
    redirect: (context, state) {
      final status = authProvider.status;
      final location = state.uri.toString();

      // Always allow splash on startup.
      if (status == AuthStatus.splash) {
        return location == Routes.splash ? null : Routes.splash;
      }

      // Password-recovery deep link.
      if (status == AuthStatus.recoveryMode) {
        if (location != Routes.resetPassword) return Routes.resetPassword;
        return null;
      }

      // Not logged in – gate all protected routes.
      if (status == AuthStatus.unauthenticated) {
        final publicRoutes = {
          Routes.welcome,
          Routes.login,
          Routes.signup,
          Routes.forgotPassword,
          Routes.resetPassword,
        };
        if (!publicRoutes.contains(location)) return Routes.welcome;
        return null;
      }

      // Logged in – redirect through onboarding funnel.
      if (status == AuthStatus.needsProfileCompletion) {
        if (location != Routes.profileCompletion) {
          return Routes.profileCompletion;
        }
        return null;
      }
      if (status == AuthStatus.needsOnboarding) {
        if (location != Routes.onboarding) return Routes.onboarding;
        return null;
      }

      // Fully authenticated – send to main tabs if landing on auth pages.
      if (status == AuthStatus.authenticated) {
        const authPages = {
          Routes.welcome,
          Routes.login,
          Routes.signup,
          Routes.splash,
        };
        if (authPages.contains(location)) return Routes.mainTabs;
        return null;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: Routes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: Routes.welcome,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: Routes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: Routes.signup,
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: Routes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: Routes.resetPassword,
        builder: (context, state) {
          final linkValid =
              state.uri.queryParameters['linkValid'] == 'true';
          return ResetPasswordScreen(linkValid: linkValid);
        },
      ),
      GoRoute(
        path: Routes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: Routes.profileCompletion,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return ProfileCompletionScreen(
            userId: extra?['userId'] as String?,
            email: extra?['email'] as String?,
            requiresLoginBeforeSubmit:
                extra?['requires_login_before_submit'] as bool? ?? false,
          );
        },
      ),
      GoRoute(
        path: Routes.notificationPermission,
        builder: (context, state) => const NotificationPermissionScreen(),
      ),
      GoRoute(
        path: Routes.mainTabs,
        builder: (context, state) => const MainTabsScreen(),
      ),
      GoRoute(
        path: Routes.prayerNotes,
        builder: (context, state) => const PrayerNotesScreen(),
      ),
      GoRoute(
        path: Routes.spiritualReflection,
        builder: (context, state) => const SpiritualReflectionScreen(),
      ),
      GoRoute(
        path: Routes.bibleMemorization,
        builder: (context, state) => const BibleMemorizationScreen(),
      ),
      GoRoute(
        path: Routes.badges,
        builder: (context, state) => const BadgesScreen(),
      ),
      GoRoute(
        path: Routes.lockScreenVerse,
        builder: (context, state) => const LockScreenVerseScreen(),
      ),
      GoRoute(
        path: Routes.devotionGuide,
        builder: (context, state) => const DevotionGuideScreen(),
      ),
      GoRoute(
        path: Routes.devotionDetail,
        builder: (context, state) => const DevotionDetailScreen(),
      ),
      GoRoute(
        path: Routes.devotionCalendar,
        builder: (context, state) => const DevotionCalendarScreen(),
      ),
      GoRoute(
        path: Routes.devotionGroups,
        builder: (context, state) => const DevotionGroupsScreen(),
      ),
      GoRoute(
        path: Routes.devotionGroupInvite,
        builder: (context, state) {
          final code = state.uri.queryParameters['inviteCode'] ?? '';
          return DevotionGroupInviteScreen(inviteCode: code);
        },
      ),
      GoRoute(
        path: Routes.devotionGroupDetails,
        builder: (context, state) {
          final groupId = state.uri.queryParameters['groupId'] ?? '';
          return DevotionGroupDetailsScreen(groupId: groupId);
        },
      ),
      GoRoute(
        path: Routes.devotionGroupPrayerRequests,
        builder: (context, state) {
          final groupId = state.uri.queryParameters['groupId'] ?? '';
          final groupName = state.uri.queryParameters['groupName'];
          return DevotionGroupPrayerRequestsScreen(
            groupId: groupId,
            groupName: groupName,
          );
        },
      ),
      GoRoute(
        path: Routes.devotionGroupMemberDetails,
        builder: (context, state) {
          final groupId = state.uri.queryParameters['groupId'] ?? '';
          final userId = state.uri.queryParameters['userId'] ?? '';
          final displayName = state.uri.queryParameters['displayName'];
          return DevotionGroupMemberDetailsScreen(
            groupId: groupId,
            userId: userId,
            displayName: displayName,
          );
        },
      ),
      GoRoute(
        path: Routes.aboutIdea,
        builder: (context, state) => const AboutIdeaScreen(),
      ),
      GoRoute(
        path: Routes.readingPlanSuggestions,
        builder: (context, state) => const ReadingPlanSuggestionsScreen(),
      ),
      GoRoute(
        path: Routes.dailyNotifications,
        builder: (context, state) => const DailyNotificationsScreen(),
      ),
    ],
  );
}
