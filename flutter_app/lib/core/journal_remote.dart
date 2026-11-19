import 'package:flutter/foundation.dart';

bool isMissingAudioColumnError(Object error) {
  final message = error.toString().toLowerCase();
  return message.contains('audio_uri') &&
      (message.contains('does not exist') || message.contains('42703'));
}

/// Bumped after prayer/reflection save or delete so Home can refresh badges.
final ValueNotifier<int> journalCountsTick = ValueNotifier<int>(0);

void notifyJournalCountsChanged() {
  journalCountsTick.value++;
}

const prayerNotesSelectWithAudio =
    'id, content, is_answered, created_at, audio_uri, audio_duration_ms';
const prayerNotesSelectBasic = 'id, content, is_answered, created_at';

const reflectionsSelectWithAudio =
    'id, content, date, created_at, audio_uri, audio_duration_ms';
const reflectionsSelectBasic = 'id, content, date, created_at';
