import 'dart:io';

import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_service.dart';
import '../reminders/devotion_schedule.dart';

const _webClientId =
    '496533823141-ngb38njinb595ndm6qlu1ollommpg2sl.apps.googleusercontent.com';
const _iosClientId =
    '496533823141-45ea5o2ud652e9gk3dmbfirtrt3t7f5l.apps.googleusercontent.com';

GoogleSignIn _google() => GoogleSignIn(
      clientId: Platform.isIOS ? _iosClientId : null,
      serverClientId: _webClientId,
      scopes: const ['email', 'profile'],
    );

Future<void> signOutGoogle() async {
  try {
    await _google().signOut();
  } catch (_) {}
}

Future<User?> restoreGoogleSession() async {
  try {
    final account = await _google().signInSilently();
    if (account == null) return null;
    return _signInWithAccount(account);
  } catch (_) {
    return null;
  }
}

Future<User?> signInWithGoogle() async {
  final account = await _google().signIn();
  if (account == null) return null;
  return _signInWithAccount(account);
}

Future<User?> _signInWithAccount(GoogleSignInAccount account) async {
  final auth = await account.authentication;
  final idToken = auth.idToken;
  if (idToken == null) {
    throw const AuthException('تعذر إكمال تسجيل الدخول بجوجل');
  }
  final res = await supabase.auth.signInWithIdToken(
    provider: OAuthProvider.google,
    idToken: idToken,
    accessToken: auth.accessToken,
  );
  if (res.user != null) {
    await DevotionSchedule.ensure();
  }
  return res.user;
}
