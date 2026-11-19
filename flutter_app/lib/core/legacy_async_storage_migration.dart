import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Imports data left by the React Native app after an in-place upgrade.
///
/// The native readers are read-only: Android reads React Native's `RKStorage`
/// SQLite database and iOS reads its AsyncStorage manifest.  We never remove
/// the old data, and never overwrite a Flutter cache that already exists.
class LegacyAsyncStorageMigration {
  static const _channel = MethodChannel('honara7ty/legacy_async_storage');
  static const _queueKey = 'offline_sync_queue_v1';

  static Future<void> migrate(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final flag = 'rn_async_storage_migrated_v1_$userId';
    if (prefs.getBool(flag) == true) return;

    Object? raw;
    try {
      raw = await _channel.invokeMethod<Object?>('readAll');
    } on PlatformException {
      // Web/desktop builds have no React Native store to import. More
      // importantly, a missing native bridge must never block authentication.
      return;
    } on MissingPluginException {
      return;
    }
    if (raw is! Map) return;
    final storage = {
      for (final entry in raw.entries)
        if (entry.key is String && entry.value is String)
          entry.key as String: entry.value as String,
    };

    await _importDevotions(prefs, userId, storage);
    await _importNotes(prefs, userId, storage);
    await _importReflections(prefs, userId, storage);
    await _importProfileAndQueue(prefs, userId, storage);
    // Set the flag only after every write succeeds. A platform/read failure is
    // retried next time the account is opened.
    await prefs.setBool(flag, true);
  }

  static dynamic _json(String? raw, dynamic fallback) {
    if (raw == null) return fallback;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return fallback;
    }
  }

  static Future<void> _importDevotions(
    SharedPreferences prefs,
    String userId,
    Map<String, String> storage,
  ) async {
    final target = 'devotion_completed_$userId';
    if (prefs.containsKey(target)) return;
    final values = _json(storage['offline_devotion_logs:$userId'], const {});
    if (values is! Map) return;
    final completed = <Map<String, dynamic>>[];
    for (final entry in values.entries) {
      if (entry.value is! Map) continue;
      final row = Map<String, dynamic>.from(entry.value as Map);
      if (row['completed'] != true) continue;
      row['date'] ??= entry.key.toString();
      completed.add(row);
    }
    if (completed.isNotEmpty) {
      await prefs.setString(target, jsonEncode(completed));
    }
  }

  static Future<void> _importNotes(
    SharedPreferences prefs,
    String userId,
    Map<String, String> storage,
  ) async {
    final target = 'honara_prayer_notes_$userId';
    if (prefs.containsKey(target)) return;
    final values = _json(storage['offline_prayer_notes:$userId'], const []);
    if (values is! List || values.isEmpty) return;
    final notes = <Map<String, dynamic>>[];
    for (final value in values) {
      if (value is! Map || value['id'] == null || value['content'] == null) {
        continue;
      }
      notes.add({
        'id': value['id'].toString(),
        'content': value['content'].toString(),
        'isAnswered': value['is_answered'] == true,
        'createdAt':
            value['created_at']?.toString() ?? DateTime.now().toIso8601String(),
        'remoteId': value['id'].toString().startsWith('local-')
            ? null
            : value['id'].toString(),
        'pendingSync': value['pendingSync'] == true,
        'audioPath': value['audio_uri']?.toString(),
        'audioDurationMs': value['audio_duration_ms'],
      });
    }
    if (notes.isNotEmpty) await prefs.setString(target, jsonEncode(notes));
  }

  static Future<void> _importReflections(
    SharedPreferences prefs,
    String userId,
    Map<String, String> storage,
  ) async {
    final target = 'honara_reflections_$userId';
    if (prefs.containsKey(target)) return;
    final values = _json(storage['offline_reflections:$userId'], const []);
    if (values is! List || values.isEmpty) return;
    final reflections = <Map<String, dynamic>>[];
    for (final value in values) {
      if (value is! Map ||
          value['id'] == null ||
          value['content'] == null ||
          value['date'] == null) {
        continue;
      }
      reflections.add({
        'id': value['id'].toString(),
        'content': value['content'].toString(),
        'date': value['date'].toString(),
        'createdAt':
            value['created_at']?.toString() ?? DateTime.now().toIso8601String(),
        'remoteId': value['id'].toString().startsWith('local-')
            ? null
            : value['id'].toString(),
        'pendingSync': value['pendingSync'] == true,
        'audioPath': value['audio_uri']?.toString(),
        'audioDurationMs': value['audio_duration_ms'],
      });
    }
    if (reflections.isNotEmpty) {
      await prefs.setString(target, jsonEncode(reflections));
    }
  }

  static Future<void> _importProfileAndQueue(
    SharedPreferences prefs,
    String userId,
    Map<String, String> storage,
  ) async {
    final queue = _json(prefs.getString(_queueKey), const []);
    final next = <Map<String, dynamic>>[
      if (queue is List)
        for (final value in queue)
          if (value is Map) Map<String, dynamic>.from(value),
    ];

    final profile = _json(storage['offline_profile_record:$userId'], const {});
    if (profile is Map && profile.isNotEmpty) {
      final value = Map<String, dynamic>.from(profile)..['id'] = userId;
      final xp = value['xp'];
      if (xp is num) await prefs.setInt('profile_xp_$userId', xp.toInt());
      _appendOnce(next, {
        'kind': 'profile-upsert',
        'userId': userId,
        'profile': value,
      });
    }

    final legacyQueue = _json(storage[_queueKey], const []);
    if (legacyQueue is List) {
      for (final item in legacyQueue) {
        if (item is! Map || item['userId']?.toString() != userId) continue;
        final nextItem = Map<String, dynamic>.from(item);
        switch (nextItem['kind']) {
          case 'devotion-log-upsert':
            if (nextItem['payload'] is Map) {
              final payload =
                  Map<String, dynamic>.from(nextItem['payload'] as Map)
                    ..['user_id'] = userId
                    ..['date'] = nextItem['date'];
              nextItem['payload'] = payload;
            }
          case 'profile-upsert':
            if (nextItem['profile'] is Map) {
              nextItem['profile'] = Map<String, dynamic>.from(
                nextItem['profile'] as Map,
              )..['id'] = userId;
            }
          case 'memorization-log-upsert':
            final payload = nextItem['payload'];
            nextItem['attemptId'] = nextItem['attemptId'] ??
                (payload is Map ? payload['id'] : null) ??
                nextItem['id'];
        }
        _appendOnce(next, nextItem);
      }
    }
    if (next.isNotEmpty) await prefs.setString(_queueKey, jsonEncode(next));
  }

  static void _appendOnce(
    List<Map<String, dynamic>> queue,
    Map<String, dynamic> item,
  ) {
    final kind = item['kind'];
    final id = item['id'];
    final exists = queue.any((current) =>
        (id != null && current['id'] == id) ||
        (id == null &&
            current['kind'] == kind &&
            current['userId'] == item['userId'] &&
            current['date'] == item['date']));
    if (!exists) queue.add(item);
  }
}
