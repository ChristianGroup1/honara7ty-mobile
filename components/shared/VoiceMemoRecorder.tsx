import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sound, { RecordBackType } from 'react-native-nitro-sound';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface VoiceMemoRecorderProps {
  audioUri?: string | null;
  durationMs?: number | null;
  onChange: (audioUri: string | null, durationMs: number | null) => void;
  labels: {
    add: string;
    recording: string;
    play: string;
    stop: string;
    delete: string;
    permissionDenied: string;
    error: string;
  };
  disabled?: boolean;
  readOnly?: boolean;
}

const formatDuration = (durationMs?: number | null) => {
  const totalSeconds = Math.max(0, Math.floor((durationMs ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

async function requestRecordPermission(labels: VoiceMemoRecorderProps['labels']) {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: labels.add,
      message: labels.permissionDenied,
      buttonPositive: 'OK',
      buttonNegative: labels.delete,
    },
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

const VoiceMemoRecorder = ({
  audioUri,
  durationMs,
  onChange,
  labels,
  disabled,
  readOnly,
}: VoiceMemoRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayDuration = useMemo(
    () => formatDuration(recording ? recordingMs : durationMs),
    [durationMs, recording, recordingMs],
  );

  useEffect(
    () => () => {
      Sound.removeRecordBackListener();
      Sound.removePlayBackListener();
      Sound.removePlaybackEndListener();
      Sound.stopPlayer().catch(() => undefined);
      if (recording) {
        Sound.stopRecorder().catch(() => undefined);
      }
    },
    [recording],
  );

  const startRecording = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const granted = await requestRecordPermission(labels);
      if (!granted) {
        setError(labels.permissionDenied);
        return;
      }

      await Sound.stopPlayer().catch(() => undefined);
      setPlaying(false);
      setRecordingMs(0);
      Sound.addRecordBackListener((event: RecordBackType) => {
        setRecordingMs(event.currentPosition);
      });
      await Sound.startRecorder(undefined, {
        AudioChannels: 1,
        AudioSamplingRate: 44100,
        AudioEncodingBitRate: 128000,
      });
      setRecording(true);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }, [labels]);

  const stopRecording = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const uri = await Sound.stopRecorder();
      Sound.removeRecordBackListener();
      setRecording(false);
      onChange(uri, recordingMs);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }, [labels.error, onChange, recordingMs]);

  const stopPlayback = useCallback(async () => {
    setBusy(true);
    try {
      await Sound.stopPlayer();
    } catch {
      // Ignore stop errors so the UI can recover.
    } finally {
      Sound.removePlayBackListener();
      Sound.removePlaybackEndListener();
      setPlaying(false);
      setBusy(false);
    }
  }, []);

  const startPlayback = useCallback(async () => {
    if (!audioUri) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await Sound.startPlayer(audioUri);
      Sound.addPlaybackEndListener(() => {
        Sound.removePlayBackListener();
        Sound.removePlaybackEndListener();
        setPlaying(false);
      });
      setPlaying(true);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }, [audioUri, labels.error]);

  const removeRecording = useCallback(async () => {
    if (playing) {
      await stopPlayback();
    }
    onChange(null, null);
    setRecordingMs(0);
    setError(null);
  }, [onChange, playing, stopPlayback]);

  const primaryAction = readOnly && !audioUri
    ? () => undefined
    : recording
    ? stopRecording
    : audioUri
      ? playing
        ? stopPlayback
        : startPlayback
      : startRecording;
  const primaryLabel = readOnly && !audioUri
    ? labels.play
    : recording
    ? labels.stop
    : audioUri
      ? playing
        ? labels.stop
        : labels.play
      : labels.add;
  const primaryIcon = readOnly && !audioUri
    ? 'microphone-off'
    : recording
    ? 'stop'
    : audioUri
      ? playing
        ? 'stop'
        : 'play'
      : 'microphone';

  return (
    <View style={voiceStyles.wrap}>
      <View style={voiceStyles.row}>
        <TouchableOpacity
          style={[voiceStyles.primaryButton, disabled && voiceStyles.disabled]}
          onPress={primaryAction}
          disabled={disabled || busy || (readOnly && !audioUri)}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <MaterialCommunityIcons name={primaryIcon} size={18} color="#FFF" />
          )}
          <Text style={voiceStyles.primaryText}>
            {recording ? labels.recording : primaryLabel}
          </Text>
        </TouchableOpacity>

        {(recording || audioUri) && (
          <Text style={voiceStyles.duration}>{displayDuration}</Text>
        )}

        {audioUri && !readOnly ? (
          <TouchableOpacity
            style={voiceStyles.deleteButton}
            onPress={removeRecording}
            disabled={disabled || busy}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={voiceStyles.error}>{error}</Text> : null}
    </View>
  );
};

export default VoiceMemoRecorder;

const voiceStyles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: '#0A1124',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  duration: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  error: {
    marginTop: 8,
    color: '#FF3B30',
    fontSize: 12,
    textAlign: 'left',
  },
});
