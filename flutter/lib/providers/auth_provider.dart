// ─── Auth Provider ───────────────────────────────────────────────────────────
// Mirrors hooks/useAppBootstrap.ts – tracks auth state, onboarding flags, etc.

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
    // Listen to auth state changes.
    supabase.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      final session = data.session;

      if (event == AuthChangeEvent.passwordRecovery) {
        _user = session?.user;
        _recoveryLinkValid = session != null;
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

      if (event == AuthChangeEvent.signedOut) {
        _user = null;
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }
    });

    // Check current session on startup.
    final session = supabase.auth.currentSession;
    _user = session?.user;
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

    if (!profileCompleted) {
      _status = AuthStatus.needsProfileCompletion;
    } else if (!onboardingCompleted) {
      _status = AuthStatus.needsOnboarding;
    } else {
      _status = AuthStatus.authenticated;
    }

    notifyListeners();
  }

  /// Called after sign-in / sign-up to re-evaluate routing.
  Future<void> refresh() async {
    final session = supabase.auth.currentSession;
    _user = session?.user;
    await _resolveAuthenticatedStatus();
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void setPendingDevotionGroupInvite(String? code) {
    _pendingDevotionGroupInviteCode = code;
    notifyListeners();
  }

  void clearPendingDevotionGroupInvite() {
    _pendingDevotionGroupInviteCode = null;
    notifyListeners();
  }

  void setRecoveryMode({required bool linkValid}) {
    _recoveryLinkValid = linkValid;
    _status = AuthStatus.recoveryMode;
    notifyListeners();
  }

  void hideSplash() {
    if (_status == AuthStatus.splash) {
      _status = _user == null ? AuthStatus.unauthenticated : AuthStatus.authenticated;
      notifyListeners();
    }
  }
}
