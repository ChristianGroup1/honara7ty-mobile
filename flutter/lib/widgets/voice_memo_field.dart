import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class VoiceMemoField extends StatefulWidget {
  const VoiceMemoField({
    super.key,
    this.path,
    this.durationMs,
    required this.onChanged,
  });

  final String? path;
  final int? durationMs;
  final void Function(String? path, int? durationMs) onChanged;

  @override
  State<VoiceMemoField> createState() => _VoiceMemoFieldState();
}

class _VoiceMemoFieldState extends State<VoiceMemoField> {
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  Timer? _timer;
  var _recording = false;
  var _playing = false;
  var _elapsed = 0;
  String? _error;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }

  String _clock(int ms) {
    final total = ms ~/ 1000;
    final minutes = (total ~/ 60).toString().padLeft(2, '0');
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Future<void> _toggleRecord() async {
    setState(() => _error = null);
    try {
      if (_recording) {
        _timer?.cancel();
        final path = await _recorder.stop();
        final ms = _elapsed;
        setState(() => _recording = false);
        widget.onChanged(path, ms);
        return;
      }
      if (!await _recorder.hasPermission()) {
        setState(() => _error = 'يحتاج التطبيق إذن الميكروفون لتسجيل الصوت.');
        return;
      }
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/memo-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(const RecordConfig(), path: path);
      setState(() {
        _recording = true;
        _elapsed = 0;
      });
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsed += 1000);
      });
    } catch (_) {
      setState(() => _error = 'تعذر التعامل مع التسجيل الصوتي.');
    }
  }

  Future<void> _togglePlay() async {
    final path = widget.path;
    if (path == null || !File(path).existsSync()) return;
    if (_playing) {
      await _player.stop();
      setState(() => _playing = false);
      return;
    }
    await _player.play(DeviceFileSource(path));
    setState(() => _playing = true);
    _player.onPlayerComplete.first.then((_) {
      if (mounted) setState(() => _playing = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasAudio = widget.path != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          textDirection: TextDirection.rtl,
          children: [
            FilledButton.icon(
              onPressed: _toggleRecord,
              icon: Icon(_recording ? Icons.stop : Icons.mic_none),
              label: Text(_recording ? 'جاري التسجيل' : 'تسجيل صوتي'),
            ),
            if (_recording) ...[
              const SizedBox(width: 8),
              Text(_clock(_elapsed)),
            ],
            if (hasAudio && !_recording) ...[
              const SizedBox(width: 8),
              Text(_clock(widget.durationMs ?? 0)),
              IconButton(
                onPressed: _togglePlay,
                icon: Icon(_playing ? Icons.stop : Icons.play_arrow),
                tooltip: _playing ? 'إيقاف' : 'تشغيل التسجيل',
              ),
              IconButton(
                onPressed: () => widget.onChanged(null, null),
                icon: const Icon(Icons.delete_outline),
                tooltip: 'حذف',
              ),
            ],
          ],
        ),
        if (_error != null)
          Text(_error!, textDirection: TextDirection.rtl, style: const TextStyle(color: Color(0xFFB42318))),
      ],
    );
  }
}
