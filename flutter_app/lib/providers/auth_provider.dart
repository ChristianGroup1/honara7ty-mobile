// ─── Auth Provider ───────────────────────────────────────────────────────────
// Mirrors hooks/useAppBootstrap.ts – tracks auth state, onboarding flags, etc.

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/deep_links.dart';
import '../core/remote_timeout.dart';
import '../core/telemetry.dart';
import '../features/auth/google_auth.dart';
import '../core/offline_sync.dart';
import '../core/legacy_async_storage_migration.dart';
import '../features/focus/focus_mode.dart';
import '../features/reminders/devotion_reminder.dart';
import '../features/reminders/devotion_schedule.dart';
import '../features/reminders/notification_permission_flow.dart';
import '../core/push_tokens.dart';
import '../core/supabase_service.dart';

enum AuthStatus {
  loading,
  splash,
  unauthenticated,
  needsProfileCompletion,
  needsOnboarding,
  needsNotificationPermission,
  recoveryMode,
  authenticated,
}

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.splash;
  var _restoringGoogle = false;
  User? _user;
  bool _recoveryLinkValid = false;
  String? _pendingDevotionGroupInviteCode;

  AuthStatus get status => _status;
  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get recoveryLinkValid => _recoveryLinkValid;
  String? get pendingDevotionGroupInviteCode => _pendingDevotionGroupInviteCode;

  AuthProvider() {
    unawaited(_init());
  }

  Future<void> _init() async {
    try {
      await _bootstrap().timeout(const Duration(seconds: 6));
    } catch (error, stack) {
      debugPrint('Auth bootstrap timed out / failed: $error\n$stack');
      // Fail open from whatever local session we already have.
      _user ??= supabase.auth.currentSession?.user;
      if (_status == AuthStatus.splash) {
        await _resolveAuthenticatedStatus(isStartup: true);
      }
    }
  }

  Future<void> _bootstrap() async {
    final storedInvite =
        (await SharedPreferences.getInstance()).getString(pendingInviteKey);
    if (storedInvite != null && storedInvite.isNotEmpty) {
      _pendingDevotionGroupInviteCode = storedInvite;
    }
    DeepLinks.listen(this);
    supabase.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      final session = data.session;

      if (DeepLinks.holdRecovery || event == AuthChangeEvent.passwordRecovery) {
        _user = session?.user;
        if (event == AuthChangeEvent.passwordRecovery) {
          _recoveryLinkValid = session != null;
        }
        _status = AuthStatus.recoveryMode;
        notifyListeners();
        return;
      }

      if (event == AuthChangeEvent.signedIn ||
          event == AuthChangeEvent.tokenRefreshed ||
          event == AuthChangeEvent.initialSession) {
        _user = session?.user;
        await _resolveAuthenticatedStatus();
        return;
      }

      if (_restoringGoogle && session == null) return;

      if (event == AuthChangeEvent.signedOut) {
        _user = null;
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }
    });

    if (DeepLinks.startupRecovery != null) {
      _user = supabase.auth.currentUser;
      _recoveryLinkValid = DeepLinks.startupRecovery!.isValid;
      _status = AuthStatus.recoveryMode;
      notifyListeners();
      return;
    }

    final session = supabase.auth.currentSession;
    _user = session?.user;
    if (_user == null && DeepLinks.startupRecovery == null) {
      _restoringGoogle = true;
      final restored = await tryRemote(
        restoreGoogleSession,
        timeout: const Duration(seconds: 3),
      );
      _restoringGoogle = false;
      _user = supabase.auth.currentUser ?? restored;
    }
    await _resolveAuthenticatedStatus(isStartup: true);
  }

  Future<void> _resolveAuthenticatedStatus({bool isStartup = false}) async {
    if (_user == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    final meta = <String, dynamic>{
      ...?_user!.userMetadata,
      ...await OfflineSync.pendingAuthMetadata(_user!.id),
    };
    final profileCompleted = meta['profile_completed'] != false;
    final onboardingCompleted = meta['onboarding_completed'] == true;

    final seenPermission = await hasSeenNotificationPermissionPrompt(_user!.id);
    if (!profileCompleted) {
      _status = AuthStatus.needsProfileCompletion;
    } else if (!onboardingCompleted) {
      _status = AuthStatus.needsOnboarding;
    } else if (!seenPermission) {
      _status = AuthStatus.needsNotificationPermission;
    } else {
      _status = AuthStatus.authenticated;
    }

    // Leave splash / open the app from local session + cache first.
    notifyListeners();

    // Server sync is best-effort and must never block offline open.
    unawaited(_syncAfterAuthReady());
  }

  Future<void> _syncAfterAuthReady() async {
    final userId = _user?.id;
    if (userId == null) return;
    try {
      if (_status == AuthStatus.authenticated) {
        await tryRemote(() => PushTokens.register(userId));
        await tryRemote(DevotionSchedule.ensure);
      }
      await LegacyAsyncStorageMigration.migrate(userId);
      await tryRemote(OfflineSync.flush, timeout: const Duration(seconds: 12));
      await tryRemote(
        OfflineSync.migrateEncryption,
        timeout: const Duration(seconds: 8),
      );
    } catch (error, stack) {
      debugPrint('Post-auth sync skipped: $error\n$stack');
    }
  }

  /// Called after sign-in / sign-up to re-evaluate routing.
  Future<void> refresh() async {
    final session = supabase.auth.currentSession;
    _user = session?.user;
    await _resolveAuthenticatedStatus();
  }

  Future<void> signOut() async {
    await PushTokens.unregister();
    await DevotionReminder.instance.cancel();
    await FocusMode.cancel();
    await clearTelemetryUser();
    await signOutGoogle();
    await supabase.auth.signOut();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void setPendingDevotionGroupInvite(String? code) {
    _pendingDevotionGroupInviteCode = code;
    notifyListeners();
  }

  Future<void> clearPendingDevotionGroupInvite() async {
    _pendingDevotionGroupInviteCode = null;
    await (await SharedPreferences.getInstance()).remove(pendingInviteKey);
    notifyListeners();
  }

  void setRecoveryMode({required bool linkValid}) {
    _recoveryLinkValid = linkValid;
    _status = AuthStatus.recoveryMode;
    notifyListeners();
  }

  void hideSplash() {
    if (_status == AuthStatus.splash) {
      _user ??= supabase.auth.currentSession?.user;
      _status =
          _user == null ? AuthStatus.unauthenticated : AuthStatus.authenticated;
      notifyListeners();
    }
  }
}
