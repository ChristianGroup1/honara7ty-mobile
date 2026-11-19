import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../core/theme.dart';
import '../core/voice_storage.dart';

class VoiceMemoField extends StatefulWidget {
  const VoiceMemoField({
    super.key,
    this.path,
    this.durationMs,
    required this.onChanged,
    this.readOnly = false,
    this.autoStart = false,
    this.studioMode = false,
    this.accentColor,
    this.gradientColors,
  });

  final String? path;
  final int? durationMs;
  final void Function(String? path, int? durationMs) onChanged;
  final bool readOnly;
  final bool autoStart;

  /// Full Stitch live-recording studio layout (timer, equalizer, controls).
  final bool studioMode;
  final Color? accentColor;
  final List<Color>? gradientColors;

  @override
  State<VoiceMemoField> createState() => _VoiceMemoFieldState();
}

class _VoiceMemoFieldState extends State<VoiceMemoField>
    with TickerProviderStateMixin {
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  Timer? _timer;
  late final AnimationController _eqController;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<void>? _completeSub;
  var _recording = false;
  var _paused = false;
  var _playing = false;
  var _elapsed = 0;
  String? _error;
  Duration _position = Duration.zero;
  var _didAutoStart = false;
  var _emitting = false;

  Color get _accent => widget.accentColor ?? AppColors.prayerStart;
  List<Color> get _gradient =>
      widget.gradientColors ?? AppColors.prayerGradient;

  @override
  void initState() {
    super.initState();
    _eqController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
    _positionSub = _player.onPositionChanged.listen((position) {
      if (mounted) setState(() => _position = position);
    });
    _completeSub = _player.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _playing = false;
          _position = Duration.zero;
        });
      }
    });
    if (widget.autoStart && !widget.readOnly) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_didAutoStart && mounted) {
          _didAutoStart = true;
          _startRecording();
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _positionSub?.cancel();
    _completeSub?.cancel();
    // Stop tickers before detaching from TickerMode — otherwise Flutter
    // asserts `_dependents.isEmpty` while the modal route tears down.
    if (_eqController.isAnimating) {
      _eqController.stop();
    }
    _eqController.dispose();
    unawaited(_recorder.dispose());
    unawaited(_player.dispose());
    super.dispose();
  }

  void _emitChanged(String? path, int? durationMs) {
    if (_emitting) return;
    _emitting = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onChanged(path, durationMs);
      _emitting = false;
    });
  }

  String _clock(int ms) {
    final total = ms ~/ 1000;
    final minutes = (total ~/ 60).toString().padLeft(2, '0');
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Future<void> _startRecording() async {
    if (!mounted) return;
    setState(() => _error = null);
    try {
      if (!await _recorder.hasPermission()) {
        if (!mounted) return;
        setState(() => _error = 'يحتاج التطبيق إذن الميكروفون لتسجيل الصوت.');
        return;
      }
      final dir = await getApplicationDocumentsDirectory();
      final path =
          '${dir.path}/memo-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(const RecordConfig(), path: path);
      if (!mounted) return;
      setState(() {
        _recording = true;
        _paused = false;
        _elapsed = 0;
      });
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted && !_paused) setState(() => _elapsed += 1000);
      });
      if (!_eqController.isAnimating) _eqController.repeat(reverse: true);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'تعذر التعامل مع التسجيل الصوتي.');
    }
  }

  Future<void> _stopAndSave() async {
    try {
      _timer?.cancel();
      final path = await _recorder.stop();
      final ms = _elapsed;
      if (!mounted) return;
      setState(() {
        _recording = false;
        _paused = false;
      });
      _emitChanged(path, ms);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'تعذر حفظ التسجيل الصوتي.');
    }
  }

  Future<void> _discard() async {
    try {
      _timer?.cancel();
      await _recorder.stop();
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _recording = false;
      _paused = false;
      _elapsed = 0;
    });
    _emitChanged(null, null);
  }

  Future<void> _togglePause() async {
    try {
      if (_paused) {
        await _recorder.resume();
        if (!mounted) return;
        setState(() => _paused = false);
        if (!_eqController.isAnimating) _eqController.repeat(reverse: true);
      } else {
        await _recorder.pause();
        if (!mounted) return;
        setState(() => _paused = true);
        _eqController.stop();
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'تعذر إيقاف/استئناف التسجيل.');
    }
  }

  Future<void> _toggleRecord() async {
    if (_recording) {
      await _stopAndSave();
      return;
    }
    await _startRecording();
  }

  Future<void> _togglePlay() async {
    final path = widget.path;
    if (path == null) return;
    if (_playing) {
      await _player.stop();
      if (!mounted) return;
      setState(() => _playing = false);
      return;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      await _player.play(UrlSource(path));
    } else if (File(path).existsSync()) {
      await _player.play(DeviceFileSource(path));
    } else {
      try {
        final url = await resolveVoicePlaybackUrl(path);
        if (url == null) {
          if (!mounted) return;
          setState(() => _error = 'ملف التسجيل غير موجود على هذا الجهاز.');
          return;
        }
        await _player.play(UrlSource(url));
      } catch (error) {
        if (!mounted) return;
        setState(() => _error = 'تعذر تشغيل التسجيل الصوتي.');
        return;
      }
    }
    if (!mounted) return;
    setState(() => _playing = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_recording || (widget.studioMode && widget.path == null)) {
      return _buildStudio(context);
    }
    final hasAudio = widget.path != null;
    if (hasAudio) return _buildPlayback(context);
    return _buildIdleStart(context);
  }

  Widget _buildIdleStart(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          onPressed: widget.readOnly ? null : _startRecording,
          icon: const Icon(Icons.mic_none_rounded),
          label: const Text('تسجيل صوتي'),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(
            _error!,
            textDirection: TextDirection.rtl,
            style: const TextStyle(color: Color(0xFFB42318), fontSize: 12),
          ),
        ],
      ],
    );
  }

  Widget _buildStudio(BuildContext context) {
    final bars = const [
      (0.1, Color(0xFFFDA4AF)),
      (0.3, Color(0xFFFB7185)),
      (0.5, Color(0xFFF43F5E)),
      (0.2, Color(0xFFEC4899)),
      (0.6, Color(0xFFE11D48)),
      (0.35, Color(0xFFF43F5E)),
      (0.7, Color(0xFFF472B6)),
      (0.25, Color(0xFFF43F5E)),
      (0.45, Color(0xFFFDA4AF)),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                if (_recording && !_paused)
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _accent.withValues(alpha: 0.35),
                    ),
                  ),
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _accent,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'تسجيل صوتي',
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: _accent,
                ),
              ),
            ),
            if (!_recording)
              Material(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: () => _emitChanged(null, null),
                  borderRadius: BorderRadius.circular(12),
                  child: const SizedBox(
                    width: 32,
                    height: 32,
                    child: Icon(
                      Icons.close_rounded,
                      size: 16,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        const Divider(height: 1, color: Color(0xFFF1F5F9)),
        const SizedBox(height: 20),
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                colors: [Color(0xFFFFF1F2), Color(0xFFFDF2F8)],
              ),
              border: Border.all(color: const Color(0xFFFFE4E6)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _clock(_elapsed),
                  textDirection: TextDirection.ltr,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: _accent,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFFE4E6)),
                  ),
                  child: Text(
                    _paused ? 'PAUSE' : 'LIVE',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: _paused
                          ? const Color(0xFF64748B)
                          : _accent,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC).withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: AnimatedBuilder(
            animation: _eqController,
            builder: (context, _) {
              return Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  for (var i = 0; i < bars.length; i++) ...[
                    if (i > 0) const SizedBox(width: 6),
                    _EqBar(
                      delay: bars[i].$1,
                      color: bars[i].$2,
                      t: _recording && !_paused ? _eqController.value : 0.15,
                    ),
                  ],
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'تحدث بكل ما في قلبك، الرب يسمع صلاتك في كل حين.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 22),
        if (!_recording)
          SizedBox(
            height: 48,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: _gradient),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: _accent.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: FilledButton.icon(
                onPressed: widget.readOnly ? null : _startRecording,
                icon: const Icon(Icons.mic_rounded, size: 20),
                label: const Text(
                  'ابدأ التسجيل',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          )
        else
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _StudioControl(
                icon: Icons.delete_rounded,
                label: 'إلغاء',
                onTap: _discard,
                size: 48,
              ),
              const SizedBox(width: 24),
              Column(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(24),
                          gradient: LinearGradient(
                            colors: [
                              _accent.withValues(alpha: 0.4),
                              _gradient.last.withValues(alpha: 0.4),
                            ],
                          ),
                        ),
                      ),
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _stopAndSave,
                          borderRadius: BorderRadius.circular(24),
                          child: Ink(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(24),
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: _gradient,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: _accent.withValues(alpha: 0.35),
                                  blurRadius: 16,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.stop_rounded,
                              color: Colors.white,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'إنهاء وحفظ',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: _accent,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 24),
              _StudioControl(
                icon: _paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                label: _paused ? 'استئناف' : 'إيقاف مؤقت',
                onTap: _togglePause,
                size: 48,
                iconColor: const Color(0xFF334155),
              ),
            ],
          ),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(
            _error!,
            textAlign: TextAlign.center,
            textDirection: TextDirection.rtl,
            style: const TextStyle(color: Color(0xFFB42318), fontSize: 12),
          ),
        ],
      ],
    );
  }

  Widget _buildPlayback(BuildContext context) {
    final theme = Theme.of(context);
    final totalMs = widget.durationMs ?? 0;
    final currentMs = _playing ? _position.inMilliseconds : 0;
    final progress = totalMs > 0 ? (currentMs / totalMs).clamp(0.0, 1.0) : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Material(
                color: _accent,
                shape: const CircleBorder(),
                child: IconButton(
                  onPressed: _togglePlay,
                  color: Colors.white,
                  icon: Icon(
                    _playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                  ),
                  tooltip: _playing ? 'إيقاف التشغيل' : 'تشغيل التسجيل',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.graphic_eq_rounded,
                          size: 18,
                          color: _accent,
                        ),
                        const SizedBox(width: 6),
                        const Expanded(
                          child: Text(
                            'تسجيل صوتي',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Text(
                          '${_clock(currentMs)} / ${_clock(totalMs)}',
                          textDirection: TextDirection.ltr,
                          style: theme.textTheme.labelMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 5,
                        backgroundColor:
                            const Color(0xFFE2E8F0).withValues(alpha: 0.8),
                        color: _accent,
                      ),
                    ),
                  ],
                ),
              ),
              if (!widget.readOnly)
                IconButton(
                  onPressed: () => _emitChanged(null, null),
                  icon: const Icon(
                    Icons.delete_outline_rounded,
                    color: Color(0xFFF43F5E),
                  ),
                  tooltip: 'حذف التسجيل',
                ),
            ],
          ),
        ),
        if (!widget.readOnly) ...[
          const SizedBox(height: 10),
          TextButton.icon(
            onPressed: _toggleRecord,
            icon: const Icon(Icons.mic_rounded, size: 18),
            label: const Text('تسجيل جديد'),
          ),
        ],
        if (_error != null)
          Text(
            _error!,
            textDirection: TextDirection.rtl,
            style: const TextStyle(color: Color(0xFFB42318)),
          ),
      ],
    );
  }
}

class _EqBar extends StatelessWidget {
  const _EqBar({
    required this.delay,
    required this.color,
    required this.t,
  });

  final double delay;
  final Color color;
  final double t;

  @override
  Widget build(BuildContext context) {
    final phase = (t + delay) % 1.0;
    final wave = math.sin(phase * math.pi);
    final height = 10.0 + (wave * 36.0);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 80),
      width: 6,
      height: height.clamp(8.0, 46.0),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.4 + wave * 0.6),
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}

class _StudioControl extends StatelessWidget {
  const _StudioControl({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.size,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final double size;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Material(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              width: size,
              height: size,
              child: Icon(
                icon,
                size: 26,
                color: iconColor ?? const Color(0xFF64748B),
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontFamily: AppFonts.ui,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }
}
