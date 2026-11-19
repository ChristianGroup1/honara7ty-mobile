import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../features/reminders/devotion_reminder.dart';
import 'supabase_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Required so iOS/Android can deliver data messages while the app is killed.
  debugPrint('FCM background: ${message.messageId}');
}

class PushTokens {
  static StreamSubscription<String>? _refresh;
  static var _listening = false;
  static var _backgroundBound = false;

  static Future<void> ensureBackgroundHandler() async {
    if (_backgroundBound) return;
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    _backgroundBound = true;
  }

  static Future<void> register(String? userId) async {
    if (userId == null || (!Platform.isAndroid && !Platform.isIOS)) return;
    try {
      await ensureBackgroundHandler();
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        debugPrint('Push permission denied');
        return;
      }

      if (Platform.isIOS) {
        await messaging.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
        // iOS needs an APNs token before FCM can mint a device token.
        String? apns;
        for (var i = 0; i < 10; i++) {
          apns = await messaging.getAPNSToken();
          if (apns != null) break;
          await Future<void>.delayed(const Duration(milliseconds: 400));
        }
        if (apns == null) {
          debugPrint('Push token skipped: APNs token not ready yet');
          return;
        }
      }

      final token = await messaging.getToken();
      if (token != null) await _upsert(userId, token);
      await _refresh?.cancel();
      _refresh =
          messaging.onTokenRefresh.listen((next) => _upsert(userId, next));
      if (!_listening) {
        _listening = true;
        FirebaseMessaging.onMessage.listen((message) async {
          final notification = message.notification;
          if (notification == null || Platform.isIOS) return;
          await DevotionReminder.instance.showNow(
            notification.title ?? 'هنا راحتي',
            notification.body ?? '',
          );
        });
      }
    } catch (error) {
      debugPrint('Push token skipped: $error');
    }
  }

  static Future<void> unregister() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await supabase.from('user_push_tokens').delete().eq('token', token);
      }
    } catch (error) {
      debugPrint('Push token removal skipped: $error');
    }
    await _refresh?.cancel();
    _refresh = null;
  }

  static Future<void> _upsert(String userId, String token) async {
    await supabase.from('user_push_tokens').upsert({
      'user_id': userId,
      'token': token,
      'platform': Platform.isIOS ? 'ios' : 'android',
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'token');
  }
}
