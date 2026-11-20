import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'offline_sync.dart';
import 'supabase_service.dart';

/// Local calendar day sent with an app-open, matching the device clock.
String appOpenDay(DateTime now) {
  final local = now.toLocal();
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');
  return '${local.year}-$month-$day';
}

String appOpenPlatform() {
  if (kIsWeb) return 'other';
  if (Platform.isIOS) return 'ios';
  if (Platform.isAndroid) return 'android';
  return 'other';
}

/// Records that a signed-in user opened the app.
///
/// One successful call increments today's count for this version. Repeats
/// inside 30 minutes are ignored so switching away and back does not inflate
/// the number. Guests are skipped because the row is tied to their account.
class AppOpenLog {
  static String? _userId;
  static DateTime? _lastSent;
  static const _gap = Duration(minutes: 30);

  static Future<void> record() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final now = DateTime.now();
    if (_userId == user.id &&
        _lastSent != null &&
        now.difference(_lastSent!) < _gap) {
      return;
    }
    _userId = user.id;
    _lastSent = now;

    final info = await _packageInfo();
    final openedOn = appOpenDay(now);
    final platform = appOpenPlatform();
    final payload = {
      'p_app_version': info.version,
      'p_build_number': info.buildNumber,
      'p_platform': platform,
      'p_opened_on': openedOn,
      'p_count': 1,
    };
    try {
      await supabase.rpc('record_app_open', params: payload);
    } catch (error) {
      debugPrint('App open kept locally: $error');
      await OfflineSync.queueAppOpen(
        userId: user.id,
        openedOn: openedOn,
        appVersion: info.version,
        buildNumber: info.buildNumber,
        platform: platform,
        count: 1,
      );
    }
  }

  static Future<PackageInfo> _packageInfo() async {
    try {
      return await PackageInfo.fromPlatform();
    } catch (_) {
      return PackageInfo(
        appName: 'honara7ty',
        packageName: 'com.honara7ty.app',
        version: 'unknown',
        buildNumber: '',
      );
    }
  }
}
