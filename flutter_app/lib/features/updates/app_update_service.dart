import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/remote_timeout.dart';
import '../../core/supabase_service.dart';

class AppUpdateOffer {
  const AppUpdateOffer({
    required this.latestVersion,
    required this.storeUrl,
    required this.message,
  });

  final String latestVersion;
  final String storeUrl;
  final String message;
}

/// Soft / optional updates only — never blocks the user.
class AppUpdateService {
  AppUpdateService._();

  static const _snoozeKey = 'soft_update_snooze_until_ms';
  static const _skippedVersionKey = 'soft_update_skipped_version';
  static const _snoozeDuration = Duration(days: 3);

  static Future<AppUpdateOffer?> checkOptionalUpdate() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final snoozeUntil = prefs.getInt(_snoozeKey) ?? 0;
      if (DateTime.now().millisecondsSinceEpoch < snoozeUntil) {
        return null;
      }

      final row = await tryRemote(() => supabase
          .from('app_update_config')
          .select(
            'latest_version, android_store_url, ios_store_url, message_ar, enabled',
          )
          .eq('id', 1)
          .maybeSingle());

      if (row == null) return null;
      if (row['enabled'] != true) return null;

      final latest = (row['latest_version'] as String?)?.trim() ?? '';
      if (latest.isEmpty) return null;

      final info = await PackageInfo.fromPlatform();
      final current = info.version.trim();
      if (!_isNewer(latest, current)) return null;

      final skipped = prefs.getString(_skippedVersionKey);
      if (skipped == latest) return null;

      final storeUrl = Platform.isIOS
          ? (row['ios_store_url'] as String? ?? '')
          : (row['android_store_url'] as String? ?? '');
      if (storeUrl.isEmpty) return null;

      final message = (row['message_ar'] as String?)?.trim();
      return AppUpdateOffer(
        latestVersion: latest,
        storeUrl: storeUrl,
        message: (message == null || message.isEmpty)
            ? 'فيه نسخة أحدث من التطبيق — حدّث وقت ما تحب.'
            : message,
      );
    } catch (error, stack) {
      debugPrint('Soft update check skipped: $error\n$stack');
      return null;
    }
  }

  static Future<void> snooze() async {
    final prefs = await SharedPreferences.getInstance();
    final until = DateTime.now().add(_snoozeDuration).millisecondsSinceEpoch;
    await prefs.setInt(_snoozeKey, until);
  }

  static Future<void> skipVersion(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_skippedVersionKey, version);
  }

  static Future<void> openStore(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  /// Returns true when [candidate] is a higher semver than [current].
  static bool _isNewer(String candidate, String current) {
    final a = _parts(candidate);
    final b = _parts(current);
    final len = a.length > b.length ? a.length : b.length;
    for (var i = 0; i < len; i++) {
      final left = i < a.length ? a[i] : 0;
      final right = i < b.length ? b[i] : 0;
      if (left > right) return true;
      if (left < right) return false;
    }
    return false;
  }

  static List<int> _parts(String version) {
    final core = version.split(RegExp(r'[-+]')).first;
    return core
        .split('.')
        .map((part) => int.tryParse(part.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0)
        .toList();
  }
}
