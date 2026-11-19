import 'dart:convert';
import 'dart:io';

import 'supabase_service.dart';

const voiceRecordingsBucket = 'voice-recordings';

/// Uploads a local recording to Cloudflare R2 through the `voice-r2-sign`
/// Edge Function (server-side PUT). No Supabase Storage fallback.
Future<String?> uploadVoiceRecording(String? localPath, String userId) async {
  if (localPath == null || localPath.startsWith('http')) return localPath;
  final file = File(localPath);
  // A non-local path is an existing object key; preserve it on edits.
  if (!await file.exists()) return localPath;

  final bytes = await file.readAsBytes();
  if (bytes.length > 8 * 1024 * 1024) {
    throw StateError('Voice recording is larger than 8 MB');
  }

  final dot = localPath.lastIndexOf('.');
  final slash = localPath.lastIndexOf('/');
  final extension = dot > slash ? localPath.substring(dot) : '.m4a';
  final objectPath =
      '$userId/${DateTime.now().microsecondsSinceEpoch}$extension';

  final response = await supabase.functions.invoke(
    'voice-r2-sign',
    body: {
      'action': 'put',
      'key': objectPath,
      'contentType': 'audio/mp4',
      'data': base64Encode(bytes),
    },
  );

  final data = _asMap(response.data);
  if (response.status != 200 || data['error'] != null || data['ok'] != true) {
    throw StateError(
      'R2 upload failed (HTTP ${response.status}): $data',
    );
  }
  final key = data['key'] as String? ?? objectPath;
  return key;
}

/// Resolves a stored object key (or local/http path) to a playable URL.
Future<String?> resolveVoicePlaybackUrl(String? path) async {
  if (path == null || path.isEmpty) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (await File(path).exists()) return path;

  final response = await supabase.functions.invoke(
    'voice-r2-sign',
    body: {
      'action': 'download',
      'key': path,
    },
  );
  final data = _asMap(response.data);
  if (response.status != 200 || data['error'] != null) {
    throw StateError(
      'R2 download sign failed (HTTP ${response.status}): $data',
    );
  }
  final downloadUrl = data['downloadUrl'] as String?;
  if (downloadUrl == null || downloadUrl.isEmpty) {
    throw StateError('Missing R2 download URL: $data');
  }
  return downloadUrl;
}

Map<String, dynamic> _asMap(dynamic data) {
  if (data is Map<String, dynamic>) return data;
  if (data is Map) return Map<String, dynamic>.from(data);
  if (data is String) {
    final decoded = jsonDecode(data);
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
  }
  throw StateError('Invalid voice-r2-sign response: $data');
}
