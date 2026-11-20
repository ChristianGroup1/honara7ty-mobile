import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/offline_sync.dart';
import '../../core/remote_timeout.dart';
import '../../core/supabase_service.dart';

class VerseAnnotation {
  const VerseAnnotation({this.highlight, this.favorite = false, this.note});

  final String? highlight;
  final bool favorite;
  final String? note;

  bool get isEmpty =>
      highlight == null && !favorite && (note == null || note!.isEmpty);

  VerseAnnotation copyWith({
    String? highlight,
    bool? favorite,
    String? note,
    bool clearHighlight = false,
    bool clearNote = false,
  }) =>
      VerseAnnotation(
        highlight: clearHighlight ? null : highlight ?? this.highlight,
        favorite: favorite ?? this.favorite,
        note: clearNote ? null : note ?? this.note,
      );

  Map<String, dynamic> toJson() => {
        'highlight': highlight,
        'favorite': favorite,
        'note': note,
      };

  factory VerseAnnotation.fromJson(Map<String, dynamic> json) =>
      VerseAnnotation(
        highlight: json['highlight'] as String?,
        favorite: json['favorite'] == true,
        note: json['note'] as String?,
      );
}

class VerseAnnotationStore {
  /// Hidden reflections row used until `verse_annotations` table is available.
  static const syncDateKey = '__verse_annotations__';
  static const _legacyKey = 'honara7ty:bible-reader:annotations';

  String get _key =>
      'honara7ty:bible-reader:annotations:${supabase.auth.currentUser?.id ?? 'guest'}';

  Future<Map<String, VerseAnnotation>> load({bool refreshRemote = true}) async {
    var local = await _readLocal();
    if (!refreshRemote) return local;

    final user = supabase.auth.currentUser;
    if (user == null) return local;

    final fromTable = await tryRemote(() => _loadFromTable(user.id));
    if (fromTable != null) {
      await _writeLocal(fromTable);
      return fromTable;
    }

    final fromBlob = await tryRemote(() => _loadFromReflectionBlob(user.id));
    if (fromBlob != null) {
      await _writeLocal(fromBlob);
      return fromBlob;
    }

    return local;
  }

  Future<void> save(Map<String, VerseAnnotation> annotations) async {
    final kept = {
      for (final entry in annotations.entries)
        if (!entry.value.isEmpty) entry.key: entry.value,
    };
    await _writeLocal(kept);

    final user = supabase.auth.currentUser;
    if (user == null) return;

    final uploaded = await pushRemote(kept);
    if (!uploaded) {
      await OfflineSync.queueVerseAnnotations(user.id, {
        for (final entry in kept.entries) entry.key: entry.value.toJson(),
      });
    }
  }

  Future<void> syncPending() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final local = await _readLocal();
    final uploaded = await pushRemote(local);
    if (!uploaded) {
      await OfflineSync.queueVerseAnnotations(user.id, {
        for (final entry in local.entries) entry.key: entry.value.toJson(),
      });
    }
  }

  /// Upload only — does not re-queue on failure (used by OfflineSync.flush).
  Future<bool> pushRemote([Map<String, VerseAnnotation>? annotations]) async {
    final user = supabase.auth.currentUser;
    if (user == null) return false;
    final kept = annotations ?? await _readLocal();
    return _upload(user.id, kept);
  }

  Future<bool> _upload(String userId, Map<String, VerseAnnotation> kept) async {
    try {
      if (await _uploadToTable(userId, kept)) return true;
    } catch (_) {}
    try {
      return await _uploadToReflectionBlob(userId, kept);
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, VerseAnnotation>?> _loadFromTable(String userId) async {
    final rows = await supabase
        .from('verse_annotations')
        .select('verse_key, highlight, favorite, note')
        .eq('user_id', userId);
    final map = <String, VerseAnnotation>{};
    for (final row in rows as List) {
      final value = Map<String, dynamic>.from(row as Map);
      final key = value['verse_key'] as String?;
      if (key == null) continue;
      final note = openedText((value['note'] ?? '').toString(), userId);
      map[key] = VerseAnnotation(
        highlight: value['highlight'] as String?,
        favorite: value['favorite'] == true,
        note: note.isEmpty ? null : note,
      );
    }
    return map;
  }

  Future<bool> _uploadToTable(
    String userId,
    Map<String, VerseAnnotation> kept,
  ) async {
    final existing = await supabase
        .from('verse_annotations')
        .select('verse_key')
        .eq('user_id', userId);
    final existingKeys = {
      for (final row in existing as List)
        (row as Map)['verse_key']?.toString(),
    }.whereType<String>().toSet();

    if (kept.isNotEmpty) {
      await supabase.from('verse_annotations').upsert([
        for (final entry in kept.entries)
          {
            'user_id': userId,
            'verse_key': entry.key,
            'highlight': entry.value.highlight,
            'favorite': entry.value.favorite,
            'note': entry.value.note == null || entry.value.note!.isEmpty
                ? null
                : sealedText(entry.value.note!, userId),
            'updated_at': DateTime.now().toIso8601String(),
          },
      ]);
    }

    final removed = existingKeys.difference(kept.keys.toSet()).toList();
    if (removed.isNotEmpty) {
      await supabase
          .from('verse_annotations')
          .delete()
          .eq('user_id', userId)
          .inFilter('verse_key', removed);
    }
    return true;
  }

  Future<Map<String, VerseAnnotation>?> _loadFromReflectionBlob(
    String userId,
  ) async {
    final row = await supabase
        .from('reflections')
        .select('content')
        .eq('user_id', userId)
        .eq('date', syncDateKey)
        .maybeSingle();
    final raw = openedText((row?['content'] ?? '').toString(), userId);
    if (raw.isEmpty) return null;
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return {
      for (final entry in decoded.entries)
        entry.key: VerseAnnotation.fromJson(
          Map<String, dynamic>.from(entry.value as Map),
        ),
    };
  }

  Future<bool> _uploadToReflectionBlob(
    String userId,
    Map<String, VerseAnnotation> kept,
  ) async {
    final payload = {
      'user_id': userId,
      'date': syncDateKey,
      'content': sealedText(
        jsonEncode({
          for (final entry in kept.entries) entry.key: entry.value.toJson(),
        }),
        userId,
      ),
    };
    final existing = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', userId)
        .eq('date', syncDateKey)
        .maybeSingle();
    if (existing == null) {
      await supabase.from('reflections').insert(payload);
    } else {
      await supabase
          .from('reflections')
          .update(payload)
          .eq('id', existing['id']);
    }
    return true;
  }

  Future<Map<String, VerseAnnotation>> _readLocal() async {
    final prefs = await SharedPreferences.getInstance();
    var raw = prefs.getString(_key);
    if (raw == null) {
      raw = prefs.getString(_legacyKey);
      if (raw != null) {
        await prefs.setString(_key, raw);
        await prefs.remove(_legacyKey);
      }
    }
    if (raw == null) return {};
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return {
        for (final entry in decoded.entries)
          entry.key: VerseAnnotation.fromJson(
            Map<String, dynamic>.from(entry.value as Map),
          ),
      };
    } catch (_) {
      return {};
    }
  }

  Future<void> _writeLocal(Map<String, VerseAnnotation> annotations) async {
    final kept = {
      for (final entry in annotations.entries)
        if (!entry.value.isEmpty) entry.key: entry.value.toJson(),
    };
    await (await SharedPreferences.getInstance())
        .setString(_key, jsonEncode(kept));
  }
}
