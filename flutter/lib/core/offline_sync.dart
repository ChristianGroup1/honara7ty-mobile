import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/journal/prayer_notes_service.dart';
import '../features/journal/reflections_service.dart';
import 'content_crypto.dart';
import 'supabase_service.dart';

const _queueKey = 'offline_sync_queue_v1';
const offlineSavedMessage =
    'تم حفظ التغيير على الجهاز، وسيتم إرساله تلقائياً عند عودة الإنترنت.';

class OfflineSync {
  static Future<void> flush() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    await PrayerNotesService().syncPending();
    await ReflectionsService().syncPending();
    final prefs = await SharedPreferences.getInstance();
    final queue = _read(prefs.getString(_queueKey));
    final remaining = <Map<String, dynamic>>[];
    for (final item in queue) {
      if (item['userId'] != user.id) {
        remaining.add(item);
        continue;
      }
      final synced = await _apply(item);
      if (!synced) remaining.add(item);
    }
    await prefs.setString(_queueKey, jsonEncode(remaining));
  }

  static Future<void> migrateEncryption() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final prefs = await SharedPreferences.getInstance();
    final flag = 'encryption_migrated_v1_${user.id}';
    if (prefs.getBool(flag) == true) return;
    try {
      await PrayerNotesService().migrateEncryption();
      await ReflectionsService().migrateEncryption();
      await prefs.setBool(flag, true);
    } catch (error) {
      debugPrint('Encryption migration skipped: $error');
    }
  }

  static Future<bool> saveDevotion(Map<String, dynamic> payload) async {
    final userId = payload['user_id']?.toString();
    if (userId == null) return false;
    try {
      await supabase.from('devotion_log').upsert(payload, onConflict: 'user_id,date');
      await _drop('devotion-log-upsert', userId, date: payload['date']?.toString());
      return true;
    } catch (_) {
      await _enqueue({
        'kind': 'devotion-log-upsert',
        'userId': userId,
        'date': payload['date'],
        'payload': payload,
      });
      return false;
    }
  }

  static Future<Map<String, Map<String, dynamic>>> pendingDevotion(String userId) async {
    final queue = _read((await SharedPreferences.getInstance()).getString(_queueKey));
    return {
      for (final item in queue)
        if (item['kind'] == 'devotion-log-upsert' && item['userId'] == userId)
          item['date'].toString(): Map<String, dynamic>.from(item['payload'] as Map)
    };
  }

  static Future<bool> saveProfile(String userId, Map<String, dynamic> profile) async {
    final payload = {...profile, 'id': userId};
    try {
      await supabase.from('profiles').upsert(payload);
      await _drop('profile-upsert', userId);
      return true;
    } catch (_) {
      await _enqueue({
        'kind': 'profile-upsert',
        'userId': userId,
        'profile': payload,
      });
      return false;
    }
  }

  static Future<bool> saveAuthMetadata(
    String userId,
    Map<String, dynamic> metadata,
  ) async {
    try {
      await supabase.auth.updateUser(UserAttributes(data: metadata));
      await _drop('auth-metadata-update', userId);
      return true;
    } catch (_) {
      await _enqueue({
        'kind': 'auth-metadata-update',
        'userId': userId,
        'metadata': metadata,
      });
      return false;
    }
  }

  static Future<void> queueReading({
    required String userId,
    required String bookId,
    required int chapter,
    required String date,
    required bool completed,
  }) =>
      _enqueue({
        'kind': completed ? 'reading-log-upsert' : 'reading-log-delete',
        'userId': userId,
        'bookId': bookId,
        'chapter': chapter,
        'date': date,
      });

  static Future<void> queueMemorization(String userId, String attemptId, Map<String, dynamic> payload) =>
      _enqueue({
        'kind': 'memorization-log-upsert',
        'userId': userId,
        'attemptId': attemptId,
        'payload': payload,
      });

  static Future<void> queueMemorizationGoal(String userId, int target) => _enqueue({
        'kind': 'memorization-goal-upsert',
        'userId': userId,
        'target': target,
      });

  static bool _sameReading(Map<String, dynamic> item, Map<String, dynamic> next) {
    const kinds = {'reading-log-upsert', 'reading-log-delete'};
    if (!kinds.contains(item['kind']) || !kinds.contains(next['kind'])) return false;
    return item['bookId'] == next['bookId'] &&
        item['chapter'] == next['chapter'] &&
        item['date'] == next['date'];
  }

  static Future<void> queueDelete({
    required String kind,
    required String userId,
    required String remoteId,
  }) =>
      _enqueue({
        'kind': kind,
        'userId': userId,
        'remoteId': remoteId,
      });

  static Future<bool> _apply(Map<String, dynamic> item) async {
    try {
      switch (item['kind']) {
        case 'devotion-log-upsert':
          await supabase.from('devotion_log').upsert(
                Map<String, dynamic>.from(item['payload'] as Map),
                onConflict: 'user_id,date',
              );
          return true;
        case 'profile-upsert':
          await supabase.from('profiles').upsert(
                Map<String, dynamic>.from(item['profile'] as Map),
              );
          return true;
        case 'auth-metadata-update':
          await supabase.auth.updateUser(UserAttributes(
            data: Map<String, dynamic>.from(item['metadata'] as Map),
          ));
          return true;
        case 'prayer-note-delete':
          await supabase.from('prayer_notes').delete().eq('id', item['remoteId']);
          return true;
        case 'reflection-delete':
          await supabase.from('reflections').delete().eq('id', item['remoteId']);
          return true;
        case 'reading-log-upsert':
          await supabase.from('reading_log').upsert({
            'user_id': item['userId'],
            'book_id': item['bookId'],
            'chapter': item['chapter'],
            'date': item['date'],
          });
          return true;
        case 'reading-log-delete':
          await supabase
              .from('reading_log')
              .delete()
              .eq('user_id', item['userId'])
              .eq('book_id', item['bookId'])
              .eq('chapter', item['chapter'])
              .eq('date', item['date']);
          return true;
        case 'memorization-log-upsert':
          await supabase.from('memorization_log').insert(
                Map<String, dynamic>.from(item['payload'] as Map),
              );
          return true;
        case 'memorization-goal-upsert':
          await supabase.from('memorization_goals').upsert({
            'user_id': item['userId'],
            'target_per_week': item['target'],
            'updated_at': DateTime.now().toIso8601String(),
          });
          return true;
      }
    } catch (error) {
      debugPrint('Offline sync kept ${item['kind']}: $error');
    }
    return false;
  }

  static Future<void> _enqueue(Map<String, dynamic> next) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = _read(prefs.getString(_queueKey)).where((item) {
      if (item['userId'] != next['userId']) return true;
      if (_sameReading(item, next)) return false;
      if (item['kind'] != next['kind']) return true;
      if (next['kind'] == 'devotion-log-upsert') return item['date'] != next['date'];
      if (next['kind'] == 'prayer-note-delete' || next['kind'] == 'reflection-delete') {
        return item['remoteId'] != next['remoteId'];
      }
      if (next['kind'] == 'memorization-log-upsert') {
        return item['attemptId'] != next['attemptId'];
      }
      return false;
    }).toList();
    queue.add(next);
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  static Future<void> _drop(String kind, String userId, {String? date}) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = _read(prefs.getString(_queueKey)).where((item) {
      if (item['kind'] != kind || item['userId'] != userId) return true;
      if (date != null) return item['date'] != date;
      return false;
    }).toList();
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  static List<Map<String, dynamic>> _read(String? raw) {
    if (raw == null) return [];
    try {
      return [
        for (final item in jsonDecode(raw) as List)
          Map<String, dynamic>.from(item as Map)
      ];
    } catch (_) {
      return [];
    }
  }
}

String sealedText(String value, String userId) {
  if (isEncrypted(value)) return value;
  return encryptText(value, deriveKey(userId));
}

String openedText(String value, String userId) =>
    decryptText(value, deriveKey(userId));
