import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/content_crypto.dart';
import '../../core/journal_remote.dart';
import '../../core/offline_sync.dart';
import '../../core/supabase_retry.dart';
import '../../core/supabase_service.dart';
import '../../core/voice_storage.dart';
import '../reading/verse_annotations.dart';

class ReflectionEntry {
  const ReflectionEntry({
    required this.id,
    required this.content,
    required this.date,
    required this.createdAt,
    this.title,
    this.passage,
    this.remoteId,
    this.pendingSync = false,
    this.audioPath,
    this.audioDurationMs,
  });

  final bool pendingSync;
  final String id, content, date;
  final String? title;
  final String? passage;
  final DateTime createdAt;
  final String? remoteId;
  final String? audioPath;
  final int? audioDurationMs;

  String get displayTitle {
    final t = title?.trim();
    if (t != null && t.isNotEmpty) return t;
    final body = content.trim();
    if (body.isEmpty) {
      return audioPath != null ? 'مذكرة صوتية' : 'تأمل روحي';
    }
    final firstLine = body.split('\n').first.trim();
    if (firstLine.length <= 42) return firstLine;
    return '${firstLine.substring(0, 42)}…';
  }

  ReflectionEntry copyWith({
    String? content,
    String? date,
    String? title,
    String? passage,
    String? remoteId,
    bool? pendingSync,
    String? audioPath,
    int? audioDurationMs,
    bool clearAudio = false,
    bool clearTitle = false,
    bool clearPassage = false,
  }) =>
      ReflectionEntry(
        id: id,
        content: content ?? this.content,
        date: date ?? this.date,
        createdAt: createdAt,
        title: clearTitle ? null : title ?? this.title,
        passage: clearPassage ? null : passage ?? this.passage,
        remoteId: remoteId ?? this.remoteId,
        pendingSync: pendingSync ?? this.pendingSync,
        audioPath: clearAudio ? null : audioPath ?? this.audioPath,
        audioDurationMs:
            clearAudio ? null : audioDurationMs ?? this.audioDurationMs,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'date': date,
        'title': title,
        'passage': passage,
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
        title: value['title'] as String?,
        passage: value['passage'] as String?,
        createdAt: DateTime.parse(value['createdAt'] as String),
        remoteId: value['remoteId'] as String?,
        pendingSync: value['pendingSync'] as bool? ?? false,
        audioPath: value['audioPath'] as String?,
        audioDurationMs: value['audioDurationMs'] as int?,
      );
}

class ReflectionsService {
  String get _key =>
      'honara_reflections_${supabase.auth.currentUser?.id ?? 'guest'}';

  Future<List<ReflectionEntry>> load({bool refreshRemote = true}) async {
    final local =
        _decode((await SharedPreferences.getInstance()).getString(_key));
    if (!refreshRemote || supabase.auth.currentUser == null) return local;
    try {
      Object rows;
      try {
        rows = await withExpiredJwtRetry(() => supabase
            .from('reflections')
            .select(reflectionsSelectWithAudio)
            .eq('user_id', supabase.auth.currentUser!.id)
            .order('date', ascending: false));
      } catch (error) {
        if (!isMissingAudioColumnError(error)) rethrow;
        rows = await withExpiredJwtRetry(() => supabase
            .from('reflections')
            .select(reflectionsSelectBasic)
            .eq('user_id', supabase.auth.currentUser!.id)
            .order('date', ascending: false));
      }
      final remote = (rows as List)
          .map((item) {
            final row = Map<String, dynamic>.from(item as Map);
            final date = (row['date'] ?? '').toString();
            // Hidden sync payload for bible annotations — never show in UI.
            if (date == VerseAnnotationStore.syncDateKey) return null;
            final id = row['id'] as String;
            final localMatch =
                local.where((e) => e.remoteId == id || e.id == id);
            final extras = localMatch.isEmpty ? null : localMatch.first;
            return ReflectionEntry(
              id: id,
              remoteId: id,
              content: openedText(
                (row['content'] ?? '').toString(),
                supabase.auth.currentUser!.id,
              ),
              date: date,
              title: extras?.title,
              passage: extras?.passage,
              createdAt:
                  DateTime.tryParse((row['created_at'] ?? '').toString()) ??
                      DateTime.now(),
              audioPath: row['audio_uri'] as String?,
              audioDurationMs: row['audio_duration_ms'] as int?,
            );
          })
          .whereType<ReflectionEntry>()
          .toList();
      // Remote is source of truth for synced rows. Only keep local creates
      // that never got a remoteId — never resurrect deleted remote notes.
      final pending = local.where((entry) => entry.remoteId == null).toList();
      for (var index = 0; index < remote.length; index++) {
        final match = local.where((entry) =>
            entry.remoteId == remote[index].id ||
            entry.id == remote[index].id);
        if (match.isEmpty) continue;
        final extras = match.first;
        remote[index] = remote[index].copyWith(
          title: extras.title,
          passage: extras.passage,
          audioPath: extras.audioPath ?? remote[index].audioPath,
          audioDurationMs:
              extras.audioDurationMs ?? remote[index].audioDurationMs,
          pendingSync: extras.pendingSync,
        );
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
    for (final entry
        in entries.where((item) => item.pendingSync || item.remoteId == null)) {
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
      await supabase.from('reflections').update(
          {'content': sealedText(content, user.id)}).eq('id', value['id']);
    }
  }

  Future<String?> _resolveAudioUri(ReflectionEntry entry, String userId) async {
    final path = entry.audioPath;
    if (path == null || path.isEmpty) return null;
    try {
      return await uploadVoiceRecording(path, userId);
    } catch (error, stackTrace) {
      debugPrint('reflection voice upload failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (path.startsWith('http') || !path.contains('/')) return path;
      return null;
    }
  }

  Future<ReflectionEntry> save(ReflectionEntry entry) async {
    var saved = entry.copyWith(pendingSync: true);
    final user = supabase.auth.currentUser;
    if (user != null) {
      final audioUri = await _resolveAudioUri(entry, user.id);
      final audioStillLocal = entry.audioPath != null &&
          entry.audioPath!.isNotEmpty &&
          audioUri == null;
      try {
        final payload = <String, dynamic>{
          'user_id': user.id,
          'content': sealedText(entry.content, user.id),
          'date': entry.date,
          'audio_uri': audioUri,
          'audio_duration_ms': entry.audioDurationMs,
        };
        Map<String, dynamic> row;
        try {
          row = await withExpiredJwtRetry(() async {
            if (entry.remoteId == null) {
              return Map<String, dynamic>.from(
                await supabase
                    .from('reflections')
                    .insert(payload)
                    .select('id')
                    .single(),
              );
            }
            return Map<String, dynamic>.from(
              await supabase
                  .from('reflections')
                  .update(payload)
                  .eq('id', entry.remoteId!)
                  .select('id')
                  .single(),
            );
          });
        } catch (error) {
          if (!isMissingAudioColumnError(error)) rethrow;
          final basicPayload = {
            'user_id': user.id,
            'content': sealedText(entry.content, user.id),
            'date': entry.date,
          };
          row = await withExpiredJwtRetry(() async {
            if (entry.remoteId == null) {
              return Map<String, dynamic>.from(
                await supabase
                    .from('reflections')
                    .insert(basicPayload)
                    .select('id')
                    .single(),
              );
            }
            return Map<String, dynamic>.from(
              await supabase
                  .from('reflections')
                  .update(basicPayload)
                  .eq('id', entry.remoteId!)
                  .select('id')
                  .single(),
            );
          });
        }
        saved = entry.copyWith(
          remoteId: row['id'].toString(),
          pendingSync: audioStillLocal,
          audioPath: audioUri ?? entry.audioPath,
        );
      } catch (error, stackTrace) {
        debugPrint('reflections save failed: $error');
        debugPrintStack(stackTrace: stackTrace);
        unawaited(OfflineSync.flush());
      }
    }
    final all = await load(refreshRemote: false)
      ..removeWhere((item) => item.id == entry.id);
    all.insert(0, saved);
    await _write(all);
    notifyJournalCountsChanged();
    return saved;
  }

  Future<void> delete(ReflectionEntry entry) async {
    final user = supabase.auth.currentUser;
    if (entry.remoteId != null && user != null) {
      try {
        await withExpiredJwtRetry(() =>
            supabase.from('reflections').delete().eq('id', entry.remoteId!));
      } catch (_) {
        await OfflineSync.queueDelete(
          kind: 'reflection-delete',
          userId: user.id,
          remoteId: entry.remoteId!,
        );
      }
    }
    final all = await load(refreshRemote: false)
      ..removeWhere((item) =>
          item.id == entry.id ||
          (entry.remoteId != null && item.remoteId == entry.remoteId));
    await _write(all);
    notifyJournalCountsChanged();
  }

  List<ReflectionEntry> _decode(String? raw) {
    if (raw == null) return [];
    try {
      final userId = supabase.auth.currentUser?.id;
      return (jsonDecode(raw) as List)
          .map((item) {
            final entry = ReflectionEntry.fromJson(
              Map<String, dynamic>.from(item as Map),
            );
            if (entry.date == VerseAnnotationStore.syncDateKey) return null;
            if (userId == null) return entry;
            return entry.copyWith(content: openedText(entry.content, userId));
          })
          .whereType<ReflectionEntry>()
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
