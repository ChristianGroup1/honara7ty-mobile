import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/auth_provider.dart';
import 'supabase_service.dart';

const pendingInviteKey = 'pending_group_invite';

class DeepLinks {
  DeepLinks._();
  static ({bool isValid})? startupRecovery;
  static var holdRecovery = false;
  static StreamSubscription<Uri>? _subscription;
  static AuthProvider? _auth;

  static Future<void> captureInitial() async {
    try {
      final uri = await AppLinks().getInitialLink();
      if (uri != null) await _handle(uri, startup: true);
    } catch (error) {
      debugPrint('Deep link startup skipped: $error');
    }
  }

  static void listen(AuthProvider auth) {
    _auth = auth;
    if (_subscription != null) return;
    _subscription = AppLinks().uriLinkStream.listen(
      (uri) => _handle(uri),
      onError: (Object error) => debugPrint('Deep link skipped: $error'),
    );
  }

  static void finishRecovery() {
    holdRecovery = false;
    startupRecovery = null;
  }

  static String? inviteCodeFromUri(Uri uri) {
    final invite = _isInvite(uri);
    if (!invite) return null;
    final code = _params(uri)['code']?.replaceAll(RegExp(r'\s+'), '');
    if (code == null || code.isEmpty) return null;
    return code;
  }

  static bool isResetPassword(Uri uri) =>
      uri.scheme == 'honara7ty' &&
      (uri.host == 'reset-password' || uri.path == '/reset-password');

  static bool isAuthCallback(Uri uri) =>
      uri.scheme == 'honara7ty' &&
      (uri.host == 'auth-callback' || uri.path == '/auth-callback');

  static Future<void> _handle(Uri uri, {bool startup = false}) async {
    if (isAuthCallback(uri)) {
      final ok = await _consumeSession(uri);
      if (ok) holdRecovery = false;
      return;
    }
    if (isResetPassword(uri)) {
      final params = _params(uri);
      if (params['error'] != null) {
        _enterRecovery(valid: false, startup: startup);
        return;
      }
      final ok = await _consumeSession(uri);
      _enterRecovery(valid: ok, startup: startup);
      return;
    }
    final code = inviteCodeFromUri(uri);
    if (code != null) await _storeInvite(code);
  }

  static Future<bool> _consumeSession(Uri uri) async {
    final params = _params(uri);
    try {
      if ((params['code'] ?? '').isNotEmpty) {
        await supabase.auth.exchangeCodeForSession(params['code']!);
        return true;
      }
      final access = params['access_token'];
      final refresh = params['refresh_token'];
      if (access != null && refresh != null) {
        await supabase.auth.setSession(refresh);
        return true;
      }
    } catch (error) {
      debugPrint('Deep link session skipped: $error');
    }
    return false;
  }

  static void _enterRecovery({required bool valid, required bool startup}) {
    holdRecovery = true;
    startupRecovery = (isValid: valid);
    _auth?.setRecoveryMode(linkValid: valid);
  }

  static Future<void> _storeInvite(String code) async {
    await (await SharedPreferences.getInstance()).setString(pendingInviteKey, code);
    _auth?.setPendingDevotionGroupInvite(code);
  }

  static bool _isInvite(Uri uri) {
    if (uri.scheme == 'honara7ty') {
      return uri.host == 'devotion-group-invite' ||
          uri.path == '/devotion-group-invite';
    }
    if (uri.scheme == 'https' || uri.scheme == 'http') {
      return uri.host == 'honara7ty.space' &&
          (uri.path == '/devotion-group-invite' ||
              uri.path == '/devotion-group-invite.html');
    }
    return false;
  }

  static Map<String, String> _params(Uri uri) {
    final params = Map<String, String>.from(uri.queryParameters);
    if (uri.fragment.isNotEmpty) {
      params.addAll(Uri.splitQueryString(uri.fragment));
    }
    return params;
  }
}
