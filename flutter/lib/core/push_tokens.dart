import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../features/reminders/devotion_reminder.dart';
import 'supabase_service.dart';

class PushTokens {
  static StreamSubscription<String>? _refresh;
  static var _listening = false;

  static Future<void> register(String? userId) async {
    if (userId == null || (!Platform.isAndroid && !Platform.isIOS)) return;
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      if (Platform.isIOS) {
        await messaging.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
      }
      final token = await messaging.getToken();
      if (token != null) await _upsert(userId, token);
      await _refresh?.cancel();
      _refresh = messaging.onTokenRefresh.listen((next) => _upsert(userId, next));
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
