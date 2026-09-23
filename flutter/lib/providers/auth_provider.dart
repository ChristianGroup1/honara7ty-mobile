// ─── Auth Provider ───────────────────────────────────────────────────────────
// Mirrors hooks/useAppBootstrap.ts – tracks auth state, onboarding flags, etc.

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/deep_links.dart';
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
    _init();
  }

  Future<void> _init() async {
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
      final restored = await restoreGoogleSession();
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

    final meta = _user!.userMetadata ?? {};
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

    if (_status == AuthStatus.authenticated) {
      await PushTokens.register(_user!.id);
      await DevotionSchedule.ensure();
    }
    await LegacyAsyncStorageMigration.migrate(_user!.id);
    await OfflineSync.flush();
    await OfflineSync.migrateEncryption();
    notifyListeners();
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
      _status =
          _user == null ? AuthStatus.unauthenticated : AuthStatus.authenticated;
      notifyListeners();
    }
  }
}
