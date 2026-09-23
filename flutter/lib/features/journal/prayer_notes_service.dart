import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/content_crypto.dart';
import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';

class PrayerNote {
  const PrayerNote({
    required this.id,
    required this.content,
    required this.isAnswered,
    required this.createdAt,
    this.remoteId,
    this.pendingSync = false,
    this.audioPath,
    this.audioDurationMs,
  });

  final String id;
  final String content;
  final bool isAnswered;
  final DateTime createdAt;
  final String? remoteId;
  final bool pendingSync;
  final String? audioPath;
  final int? audioDurationMs;

  PrayerNote copyWith(
          {String? content,
          bool? isAnswered,
          String? remoteId,
          bool? pendingSync,
          String? audioPath,
          int? audioDurationMs,
          bool clearAudio = false}) =>
      PrayerNote(
        id: id,
        content: content ?? this.content,
        isAnswered: isAnswered ?? this.isAnswered,
        createdAt: createdAt,
        remoteId: remoteId ?? this.remoteId,
        pendingSync: pendingSync ?? this.pendingSync,
        audioPath: clearAudio ? null : audioPath ?? this.audioPath,
        audioDurationMs: clearAudio ? null : audioDurationMs ?? this.audioDurationMs,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'isAnswered': isAnswered,
        'createdAt': createdAt.toIso8601String(),
        'remoteId': remoteId,
        'pendingSync': pendingSync,
        'audioPath': audioPath,
        'audioDurationMs': audioDurationMs,
      };

  factory PrayerNote.fromJson(Map<String, dynamic> json) => PrayerNote(
        id: json['id'] as String,
        content: json['content'] as String,
        isAnswered: json['isAnswered'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
        remoteId: json['remoteId'] as String?,
        pendingSync: json['pendingSync'] as bool? ?? false,
        audioPath: json['audioPath'] as String?,
        audioDurationMs: json['audioDurationMs'] as int?,
      );
}

class PrayerNotesService {
  String get _key =>
      'honara_prayer_notes_${supabase.auth.currentUser?.id ?? 'guest'}';

  Future<List<PrayerNote>> load({bool refreshRemote = true}) async {
    final prefs = await SharedPreferences.getInstance();
    final local = _decode(prefs.getString(_key));
    if (!refreshRemote || supabase.auth.currentUser == null) return local;
    try {
      final rows = await supabase
          .from('prayer_notes')
          .select('id, content, is_answered, created_at')
          .eq('user_id', supabase.auth.currentUser!.id)
          .order('created_at', ascending: false);
      final remote = (rows as List).map((row) {
        final value = Map<String, dynamic>.from(row as Map);
        final id = value['id'] as String;
        return PrayerNote(
          id: id,
          remoteId: id,
          content: value['content'] as String,
          isAnswered: value['is_answered'] as bool? ?? false,
          createdAt: DateTime.parse(value['created_at'] as String),
        );
      }).toList();
      final pending = local
          .where((note) => note.pendingSync || note.remoteId == null)
          .toList();
      remote.removeWhere(
          (note) => pending.any((p) => p.remoteId == note.remoteId));
      for (var index = 0; index < remote.length; index++) {
        final match = local.where((note) => note.remoteId == remote[index].id || note.id == remote[index].id);
        if (match.isNotEmpty && match.first.audioPath != null) {
          remote[index] = remote[index].copyWith(
            audioPath: match.first.audioPath,
            audioDurationMs: match.first.audioDurationMs,
          );
        }
      }
      remote.insertAll(0, pending);
      await _write(remote);
      return _decode((await SharedPreferences.getInstance()).getString(_key));
    } catch (_) {
      return local;
    }
  }

  Future<void> syncPending() async {
    final notes = await load(refreshRemote: false);
    for (final note in notes.where((item) => item.pendingSync || item.remoteId == null)) {
      await save(note);
    }
  }

  Future<void> migrateEncryption() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final rows = await supabase
        .from('prayer_notes')
        .select('id, content')
        .eq('user_id', user.id);
    for (final row in rows as List) {
      final value = Map<String, dynamic>.from(row as Map);
      final content = (value['content'] ?? '').toString();
      if (content.isEmpty || isEncrypted(content)) continue;
      await supabase
          .from('prayer_notes')
          .update({'content': sealedText(content, user.id)})
          .eq('id', value['id']);
    }
  }

  Future<PrayerNote> save(PrayerNote note) async {
    var next = note.copyWith(pendingSync: true);
    final user = supabase.auth.currentUser;
    if (user != null) {
      try {
        final payload = {
          'user_id': user.id,
          'content': sealedText(note.content, user.id),
          'is_answered': note.isAnswered,
        };
        final row = note.remoteId == null
            ? await supabase
                .from('prayer_notes')
                .insert(payload)
                .select('id')
                .single()
            : await supabase
                .from('prayer_notes')
                .update(payload)
                .eq('id', note.remoteId!)
                .select('id')
                .single();
        next = note.copyWith(remoteId: row['id'] as String, pendingSync: false);
      } catch (_) {
        // Keep the local-first update usable when the device is offline.
      }
    }
    final notes = await load(refreshRemote: false);
    notes.removeWhere((item) => item.id == note.id);
    notes.insert(0, next);
    await _write(notes);
    return next;
  }

  Future<void> delete(PrayerNote note) async {
    final user = supabase.auth.currentUser;
    if (note.remoteId != null && user != null) {
      try {
        await supabase.from('prayer_notes').delete().eq('id', note.remoteId!);
      } catch (_) {
        await OfflineSync.queueDelete(
          kind: 'prayer-note-delete',
          userId: user.id,
          remoteId: note.remoteId!,
        );
      }
    }
    final notes = await load(refreshRemote: false)
      ..removeWhere((item) => item.id == note.id);
    await _write(notes);
  }

  List<PrayerNote> _decode(String? raw) {
    if (raw == null) return [];
    try {
      final userId = supabase.auth.currentUser?.id;
      return (jsonDecode(raw) as List)
          .map((item) {
            final note =
                PrayerNote.fromJson(Map<String, dynamic>.from(item as Map));
            if (userId == null) return note;
            return note.copyWith(content: openedText(note.content, userId));
          })
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (_) {
      return [];
    }
  }

  Future<void> _write(List<PrayerNote> notes) async {
    final userId = supabase.auth.currentUser?.id;
    final stored = notes.take(150).map((note) {
      final json = note.toJson();
      if (userId != null) json['content'] = sealedText(note.content, userId);
      return json;
    }).toList();
    await (await SharedPreferences.getInstance()).setString(_key, jsonEncode(stored));
  }
}
