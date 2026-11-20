// ─── App Router (GoRouter) ───────────────────────────────────────────────────
// Mirrors navigation/RootNavigator.tsx + navigation/MainTabNavigator.tsx.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../features/memorization/memorization_service.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/profile_completion/profile_completion_screen.dart';
import '../screens/notification_permission/notification_permission_screen.dart';
import '../screens/main/main_tabs_screen.dart';
import '../screens/home/home_screen.dart';
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
import '../screens/daily_notifications/daily_notifications_screen.dart';
import '../screens/weekly_report/weekly_report_screen.dart';
import '../screens/bible_reader/bible_reader_screen.dart';
import '../screens/profile/profile_screen.dart';

// Named route constants – mirrors navigation/types.ts
class Routes {
  static const splash = '/';
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
  static const dailyNotifications = '/daily-notifications';
  static const weeklyReport = '/weekly-report';
  static const bibleReader = '/bible-reader';
  static const profile = '/profile';
  static const home = '/home';
}

final rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter buildRouter(BuildContext context) {
  final authProvider = Provider.of<AuthProvider>(context, listen: false);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Routes.splash,
    refreshListenable: authProvider,
    redirect: (context, state) {
      final status = authProvider.status;
      final location = state.uri.path;
      final fullLocation = state.uri.toString();

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
          Routes.login,
          Routes.signup,
          Routes.forgotPassword,
          Routes.resetPassword,
        };
        final signupProfileCompletion = location == Routes.profileCompletion &&
            state.extra is Map<String, dynamic> &&
            (state.extra
                    as Map<String, dynamic>)['requires_login_before_submit'] ==
                true;
        if (signupProfileCompletion) return null;
        if (!publicRoutes.contains(location)) return Routes.login;
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
        // Allow /onboarding and /onboarding?preview=… while onboarding is pending.
        if (location != Routes.onboarding) return Routes.onboarding;
        return null;
      }
      if (status == AuthStatus.needsNotificationPermission) {
        if (location != Routes.notificationPermission) {
          return Routes.notificationPermission;
        }
        return null;
      }

      // Fully authenticated – send to main tabs if landing on auth pages.
      if (status == AuthStatus.authenticated) {
        final invite = authProvider.pendingDevotionGroupInviteCode;
        if (invite != null &&
            invite.isNotEmpty &&
            !fullLocation.startsWith(Routes.devotionGroupInvite)) {
          return '${Routes.devotionGroupInvite}?inviteCode=${Uri.encodeQueryComponent(invite)}';
        }
        const authPages = {
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
          final linkValid = state.uri.queryParameters['linkValid'] == 'true';
          return ResetPasswordScreen(linkValid: linkValid);
        },
      ),
      GoRoute(
        path: Routes.onboarding,
        builder: (context, state) => OnboardingScreen(
          inApp: state.uri.queryParameters['preview'] == 'true' ||
              state.extra == true,
        ),
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
        builder: (context, state) => NotificationPermissionScreen(
          inApp: state.uri.queryParameters['preview'] == 'true' ||
              state.extra == true,
        ),
      ),
      GoRoute(
        path: Routes.mainTabs,
        builder: (context, state) {
          final tab = int.tryParse(state.uri.queryParameters['tab'] ?? '') ?? 0;
          return MainTabsScreen(initialIndex: tab);
        },
      ),
      // Expose Home as a direct route for reference-state review and deep links.
      GoRoute(
        path: Routes.home,
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: Routes.prayerNotes,
        builder: (context, state) => const PrayerNotesScreen(),
      ),
      GoRoute(
        path: Routes.spiritualReflection,
        builder: (context, state) => SpiritualReflectionScreen(
          initialText: state.extra is String ? state.extra as String : null,
        ),
      ),
      GoRoute(
        path: Routes.bibleMemorization,
        builder: (context, state) => BibleMemorizationScreen(
          initial: state.extra is MemorizationSeed
              ? state.extra as MemorizationSeed
              : null,
        ),
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
        builder: (context, state) => DevotionDetailScreen(
          articleId: state.uri.queryParameters['articleId'] ?? '',
        ),
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
        path: Routes.bibleReader,
        builder: (context, state) => const BibleReaderScreen(),
      ),
      GoRoute(
        path: Routes.aboutIdea,
        builder: (context, state) => const OnboardingScreen(inApp: true),
      ),
      GoRoute(
        path: Routes.dailyNotifications,
        builder: (context, state) => const DailyNotificationsScreen(),
      ),
      GoRoute(
        path: Routes.weeklyReport,
        builder: (context, state) => const WeeklyReportScreen(),
      ),
      GoRoute(
        path: Routes.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
    ],
  );
}
