import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/content_crypto.dart';
import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';

class ReflectionEntry {
  const ReflectionEntry(
      {required this.id,
      required this.content,
      required this.date,
      required this.createdAt,
      this.remoteId,
      this.pendingSync = false,
      this.audioPath,
      this.audioDurationMs});
  final bool pendingSync;
  final String id, content, date;
  final DateTime createdAt;
  final String? remoteId;
  final String? audioPath;
  final int? audioDurationMs;
  ReflectionEntry copyWith(
          {String? content,
          String? date,
          String? remoteId,
          bool? pendingSync,
          String? audioPath,
          int? audioDurationMs,
          bool clearAudio = false}) =>
      ReflectionEntry(
          id: id,
          content: content ?? this.content,
          date: date ?? this.date,
          createdAt: createdAt,
          remoteId: remoteId ?? this.remoteId,
          pendingSync: pendingSync ?? this.pendingSync,
          audioPath: clearAudio ? null : audioPath ?? this.audioPath,
          audioDurationMs: clearAudio ? null : audioDurationMs ?? this.audioDurationMs);
  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'date': date,
        'createdAt': createdAt.toIso8601String(),
        'remoteId': remoteId,
        'pendingSync': pendingSync,
        'audioPath': audioPath,
        'audioDurationMs': audioDurationMs,
      };
  factory ReflectionEntry.fromJson(Map<String, dynamic> value) =>
      ReflectionEntry(
          id: value['id'] as String,
          content: value['content'] as String,
          date: value['date'] as String,
          createdAt: DateTime.parse(value['createdAt'] as String),
          remoteId: value['remoteId'] as String?,
          pendingSync: value['pendingSync'] as bool? ?? false,
          audioPath: value['audioPath'] as String?,
          audioDurationMs: value['audioDurationMs'] as int?);
}

class ReflectionsService {
  String get _key =>
      'honara_reflections_${supabase.auth.currentUser?.id ?? 'guest'}';
  Future<List<ReflectionEntry>> load({bool refreshRemote = true}) async {
    final local =
        _decode((await SharedPreferences.getInstance()).getString(_key));
    if (!refreshRemote || supabase.auth.currentUser == null) return local;
    try {
      final rows = await supabase
          .from('reflections')
          .select('id, content, date, created_at')
          .eq('user_id', supabase.auth.currentUser!.id)
          .order('date', ascending: false);
      final remote = (rows as List).map((item) {
        final row = Map<String, dynamic>.from(item as Map);
        final id = row['id'] as String;
        return ReflectionEntry(
            id: id,
            remoteId: id,
            content: row['content'] as String,
            date: row['date'] as String,
            createdAt: DateTime.parse(row['created_at'] as String));
      }).toList();
      final pending = local
          .where((entry) => entry.pendingSync || entry.remoteId == null)
          .toList();
      remote.removeWhere(
          (entry) => pending.any((p) => p.remoteId == entry.remoteId));
      for (var index = 0; index < remote.length; index++) {
        final match = local.where((entry) => entry.remoteId == remote[index].id || entry.id == remote[index].id);
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
    final entries = await load(refreshRemote: false);
    for (final entry in entries.where((item) => item.pendingSync || item.remoteId == null)) {
      await save(entry);
    }
  }

  Future<void> migrateEncryption() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    final rows = await supabase
        .from('reflections')
        .select('id, content')
        .eq('user_id', user.id);
    for (final row in rows as List) {
      final value = Map<String, dynamic>.from(row as Map);
      final content = (value['content'] ?? '').toString();
      if (content.isEmpty || isEncrypted(content)) continue;
      await supabase
          .from('reflections')
          .update({'content': sealedText(content, user.id)})
          .eq('id', value['id']);
    }
  }

  Future<ReflectionEntry> save(ReflectionEntry entry) async {
    var saved = entry.copyWith(pendingSync: true);
    final user = supabase.auth.currentUser;
    if (user != null) {
      try {
        final payload = {
          'user_id': user.id,
          'content': sealedText(entry.content, user.id),
          'date': entry.date
        };
        final row = entry.remoteId == null
            ? await supabase
                .from('reflections')
                .insert(payload)
                .select('id')
                .single()
            : await supabase
                .from('reflections')
                .update(payload)
                .eq('id', entry.remoteId!)
                .select('id')
                .single();
        saved =
            entry.copyWith(remoteId: row['id'] as String, pendingSync: false);
      } catch (_) {}
    }
    final all = await load(refreshRemote: false)
      ..removeWhere((item) => item.id == entry.id);
    all.insert(0, saved);
    await _write(all);
    return saved;
  }

  Future<void> delete(ReflectionEntry entry) async {
    final user = supabase.auth.currentUser;
    if (entry.remoteId != null && user != null) {
      try {
        await supabase.from('reflections').delete().eq('id', entry.remoteId!);
      } catch (_) {
        await OfflineSync.queueDelete(
          kind: 'reflection-delete',
          userId: user.id,
          remoteId: entry.remoteId!,
        );
      }
    }
    final all = await load(refreshRemote: false)
      ..removeWhere((item) => item.id == entry.id);
    await _write(all);
  }

  List<ReflectionEntry> _decode(String? raw) {
    if (raw == null) return [];
    try {
      final userId = supabase.auth.currentUser?.id;
      return (jsonDecode(raw) as List)
          .map((item) {
            final entry =
                ReflectionEntry.fromJson(Map<String, dynamic>.from(item as Map));
            if (userId == null) return entry;
            return entry.copyWith(content: openedText(entry.content, userId));
          })
          .toList()
        ..sort((a, b) => b.date.compareTo(a.date));
    } catch (_) {
      return [];
    }
  }

  Future<void> _write(List<ReflectionEntry> values) async {
    final userId = supabase.auth.currentUser?.id;
    final stored = values.take(150).map((item) {
      final json = item.toJson();
      if (userId != null) json['content'] = sealedText(item.content, userId);
      return json;
    }).toList();
    await (await SharedPreferences.getInstance())
        .setString(_key, jsonEncode(stored));
  }
}
