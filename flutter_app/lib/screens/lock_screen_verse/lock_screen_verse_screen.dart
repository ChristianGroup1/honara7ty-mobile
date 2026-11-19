import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:gal/gal.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';

class _Verse {
  const _Verse(this.text, this.reference);
  final String text;
  final String reference;
}

class _Wallpaper {
  const _Wallpaper({
    required this.name,
    required this.c1,
    required this.c2,
    required this.icon,
    required this.accent,
  });
  final String name;
  final Color c1;
  final Color c2;
  final IconData icon;
  final Color accent;
}

const _dailyVerses = [
  _Verse('سِرَاجٌ لِرِجْلِي كَلَامُكَ وَنُورٌ لِسَبِيلِي.', 'مزمور ١١٩: ١٠٥'),
  _Verse(
    'لاَ تَخَفْ لأَنِّي مَعَكَ. لاَ تَتَلَفَّتْ لأَنِّي إِلهُكَ.',
    'إشعياء ٤١ : ١٠',
  ),
  _Verse(
    'لَا تَهْتَمُّوا بِشَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلَاةِ وَالدُّعَاءِ.',
    'فيلبي ٤: ٦',
  ),
  _Verse('سَلَامًا أَتْرُكُ لَكُمْ. سَلَامِي أُعْطِيكُمْ.', 'يوحنا ١٤: ٢٧'),
  _Verse('الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ.', 'مزمور ٢٣: ١'),
  _Verse('تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ.', 'أمثال ٣: ٥'),
  _Verse(
    'كُلَّ الْأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ.',
    'رومية ٨: ٢٨',
  ),
];

const _wallpapers = [
  _Wallpaper(
    name: 'ليلة هادئة',
    c1: Color(0xFF0F172A),
    c2: Color(0xFF1E293B),
    icon: Icons.nights_stay_rounded,
    accent: Color(0xFFFBBF24),
  ),
  _Wallpaper(
    name: 'بنفسجي',
    c1: Color(0xFF2E1065),
    c2: Color(0xFF4C1D95),
    icon: Icons.auto_awesome_rounded,
    accent: Color(0xFFC4B5FD),
  ),
  _Wallpaper(
    name: 'زمردي',
    c1: Color(0xFF064E3B),
    c2: Color(0xFF065F46),
    icon: Icons.park_rounded,
    accent: Color(0xFF6EE7B7),
  ),
  _Wallpaper(
    name: 'عنابي',
    c1: Color(0xFF4C0519),
    c2: Color(0xFF881337),
    icon: Icons.favorite_rounded,
    accent: Color(0xFFFDA4AF),
  ),
  _Wallpaper(
    name: 'ذهبي',
    c1: Color(0xFF1C1917),
    c2: Color(0xFF78350F),
    icon: Icons.wb_twilight_rounded,
    accent: Color(0xFFFCD34D),
  ),
  _Wallpaper(
    name: 'سماوي',
    c1: Color(0xFF0C4A6E),
    c2: Color(0xFF0369A1),
    icon: Icons.water_rounded,
    accent: Color(0xFF7DD3FC),
  ),
  _Wallpaper(
    name: 'فجر',
    c1: Color(0xFF431407),
    c2: Color(0xFFC2410C),
    icon: Icons.wb_sunny_rounded,
    accent: Color(0xFFFDBA74),
  ),
  _Wallpaper(
    name: 'رمادي ناعم',
    c1: Color(0xFF18181B),
    c2: Color(0xFF3F3F46),
    icon: Icons.blur_on_rounded,
    accent: Color(0xFFD4D4D8),
  ),
];

class LockScreenVerseScreen extends StatefulWidget {
  const LockScreenVerseScreen({super.key});

  @override
  State<LockScreenVerseScreen> createState() => _LockScreenVerseScreenState();
}

class _LockScreenVerseScreenState extends State<LockScreenVerseScreen> {
  final _previewKey = GlobalKey();
  late _Verse _verse;
  var _custom = false;
  var _theme = 0;
  List<({String name, List<List<String>> chapters})> _books = [];

  @override
  void initState() {
    super.initState();
    _resetDailyVerse();
    _loadBooks();
  }

  void _resetDailyVerse() {
    final day =
        DateTime.now().difference(DateTime(DateTime.now().year)).inDays;
    _verse = _dailyVerses[day % _dailyVerses.length];
    _custom = false;
  }

  Future<void> _loadBooks() async {
    final json =
        jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
            as Map<String, dynamic>;
    final books = (json['books'] as List).map((raw) {
      final book = raw as Map<String, dynamic>;
      final chapters = (book['chapters'] as List).map((chapter) {
        return ((chapter as Map<String, dynamic>)['verses'] as List)
            .map((verse) => (verse as Map<String, dynamic>)['text'] as String)
            .toList();
      }).toList();
      return (name: book['name'] as String, chapters: chapters);
    }).toList();
    if (mounted) setState(() => _books = books);
  }

  Future<Uint8List?> _captureWallpaperBytes() async {
    final boundary =
        _previewKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return null;
    final image = await boundary.toImage(pixelRatio: 3);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return bytes?.buffer.asUint8List();
  }

  Future<void> _downloadWallpaper() async {
    final pngBytes = await _captureWallpaperBytes();
    if (pngBytes == null || !mounted) return;
    try {
      final hasAccess = await Gal.hasPermission(toAlbum: true);
      if (!hasAccess) {
        final granted = await Gal.requestPermission(toAlbum: true);
        if (!granted) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('لازم تسمح بحفظ الصور عشان ننزّل الخلفية.'),
            ),
          );
          return;
        }
      }
      final stamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      await Gal.putImageBytes(
        pngBytes,
        name: 'honara7ty_verse_$stamp',
        album: 'هنا راحتي',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('اتحفظت الخلفية في الصور ✅'),
        ),
      );
    } on GalException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذّر التحميل: ${error.type.name}')),
      );
    } on Object catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذّر التحميل: $error')),
      );
    }
  }

  Future<void> _shareWallpaper() async {
    final pngBytes = await _captureWallpaperBytes();
    if (pngBytes == null) return;
    final file = File('${Directory.systemTemp.path}/honara7ty-verse.png');
    await file.writeAsBytes(pngBytes);
    await Share.shareXFiles(
      [XFile(file.path)],
      text:
          '${_verse.text}\n${_verse.reference}\n\nآية اليوم من تطبيق هنا راحتي',
    );
  }

  Future<void> _shareVerseText() async {
    await Share.share(
      '${_verse.text}\n${_verse.reference}\n\nآية اليوم من تطبيق هنا راحتي',
    );
  }

  /// Builds a reference like «إشعياء 41: 10-12» or «إشعياء 41: 10، 12».
  String _formatVerseRef(String book, int chapter, List<int> nums) {
    final sorted = [...nums]..sort();
    if (sorted.isEmpty) return '$book $chapter';
    if (sorted.length == 1) return '$book $chapter: ${sorted.first}';

    var isRange = true;
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i] != sorted[i - 1] + 1) {
        isRange = false;
        break;
      }
    }
    final numsLabel = isRange
        ? '${sorted.first}-${sorted.last}'
        : sorted.join('، ');
    return '$book $chapter: $numsLabel';
  }

  Future<void> _pickVerse() async {
    if (_books.isEmpty) return;
    var bookIndex = 0;
    var chapter = 1;
    final selected = <int>{}; // 1-based verse numbers

    final picked = await showModalBottomSheet<_Verse>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheet) {
            final book = _books[bookIndex];
            final verses = book.chapters[chapter - 1];

            void confirm() {
              if (selected.isEmpty) return;
              final nums = selected.toList()..sort();
              final text = nums.map((n) => verses[n - 1]).join(' ');
              Navigator.pop(
                context,
                _Verse(
                  text,
                  _formatVerseRef(book.name, chapter, nums),
                ),
              );
            }

            return Directionality(
              textDirection: ui.TextDirection.rtl,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 48,
                        height: 5,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'اختر آية أو أكثر من الكتاب المقدس',
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        selected.isEmpty
                            ? 'اضغط على الأعداد لاختيار أكثر من آية'
                            : 'تم اختيار ${selected.length} آية',
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 14),
                      DropdownButtonFormField<int>(
                        // ignore: deprecated_member_use
                        value: bookIndex,
                        decoration: _sheetFieldDecoration('السفر'),
                        items: [
                          for (var i = 0; i < _books.length; i++)
                            DropdownMenuItem(
                              value: i,
                              child: Text(_books[i].name),
                            ),
                        ],
                        onChanged: (value) => setSheet(() {
                          bookIndex = value ?? 0;
                          chapter = 1;
                          selected.clear();
                        }),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<int>(
                        key: ValueKey('ch-$bookIndex-$chapter'),
                        // ignore: deprecated_member_use
                        value: chapter,
                        decoration: _sheetFieldDecoration('الأصحاح'),
                        items: [
                          for (var i = 1; i <= book.chapters.length; i++)
                            DropdownMenuItem(
                              value: i,
                              child: Text('إصحاح $i'),
                            ),
                        ],
                        onChanged: (value) => setSheet(() {
                          chapter = value ?? 1;
                          selected.clear();
                        }),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: MediaQuery.sizeOf(context).height * 0.38,
                        child: ListView.builder(
                          itemCount: verses.length,
                          itemBuilder: (context, index) {
                            final num = index + 1;
                            final text = verses[index];
                            final isOn = selected.contains(num);
                            return Material(
                              color: isOn
                                  ? const Color(0xFFFFFBEB)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: () => setSheet(() {
                                  if (isOn) {
                                    selected.remove(num);
                                  } else {
                                    selected.add(num);
                                  }
                                }),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 10,
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Icon(
                                        isOn
                                            ? Icons.check_box_rounded
                                            : Icons.check_box_outline_blank_rounded,
                                        size: 22,
                                        color: isOn
                                            ? const Color(0xFFD97706)
                                            : const Color(0xFF94A3B8),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          '$num. $text',
                                          textDirection: ui.TextDirection.rtl,
                                          style: TextStyle(
                                            fontFamily: AppFonts.ui,
                                            fontSize: 13,
                                            height: 1.45,
                                            fontWeight: isOn
                                                ? FontWeight.w700
                                                : FontWeight.w500,
                                            color: const Color(0xFF0F172A),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: selected.isEmpty ? null : confirm,
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF0F172A),
                            disabledBackgroundColor: const Color(0xFFE2E8F0),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(
                            selected.isEmpty
                                ? 'اختر آية واحدة على الأقل'
                                : selected.length == 1
                                    ? 'استخدم الآية'
                                    : 'استخدم الآيات المختارة (${selected.length})',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
    if (picked != null) {
      setState(() {
        _verse = picked;
        _custom = true;
      });
    }
  }

  InputDecoration _sheetFieldDecoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final wallpaper = _wallpapers[_theme];
    final now = DateTime.now();
    final dateLabel = DateFormat('EEEE، d MMMM', 'ar').format(now);
    final timeLabel = DateFormat('HH:mm').format(now);

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          _LockHeader(
            dark: isDark,
            onBack: () => Navigator.of(context).maybePop(),
            onReset: () => setState(_resetDailyVerse),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              children: [
                const Text(
                  'صمم آية يومية بخلفية هادئة واحفظها لاستخدامها كخلفية شاشة القفل.',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                // Phone preview
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 280),
                    child: AspectRatio(
                      aspectRatio: 9 / 18.5,
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(40),
                          border: Border.all(color: const Color(0xFF1E293B)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0F172A)
                                  .withValues(alpha: 0.35),
                              blurRadius: 28,
                              offset: const Offset(0, 14),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(30),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              // Export capture: clean wallpaper only
                              // (no date/time, no torch/camera chrome).
                              RepaintBoundary(
                                key: _previewKey,
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: RadialGradient(
                                      center: const Alignment(0, -0.55),
                                      radius: 1.15,
                                      colors: [wallpaper.c2, wallpaper.c1],
                                    ),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      18,
                                      28,
                                      18,
                                      34,
                                    ),
                                    child: Column(
                                      children: [
                                        Container(
                                          width: 72,
                                          height: 5,
                                          decoration: BoxDecoration(
                                            color: Colors.white
                                                .withValues(alpha: 0.26),
                                            borderRadius:
                                                BorderRadius.circular(99),
                                          ),
                                        ),
                                        const Spacer(),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.white
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(99),
                                            border: Border.all(
                                              color: Colors.white
                                                  .withValues(alpha: 0.15),
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                Icons.auto_awesome_rounded,
                                                size: 12,
                                                color: wallpaper.accent,
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                'هنا راحتي',
                                                style: TextStyle(
                                                  fontFamily: AppFonts.ui,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: wallpaper.accent,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 14),
                                        Text(
                                          _verse.text,
                                          textAlign: TextAlign.center,
                                          textDirection: ui.TextDirection.rtl,
                                          style: const TextStyle(
                                            fontFamily: AppFonts.verse,
                                            fontSize: 18,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.white,
                                            height: 1.7,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.white
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(99),
                                            border: Border.all(
                                              color: Colors.white
                                                  .withValues(alpha: 0.15),
                                            ),
                                          ),
                                          child: Text(
                                            _verse.reference,
                                            style: TextStyle(
                                              fontFamily: AppFonts.ui,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white
                                                  .withValues(alpha: 0.85),
                                            ),
                                          ),
                                        ),
                                        const Spacer(),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              // Preview-only lock chrome — not exported.
                              Positioned(
                                top: 18,
                                left: 18,
                                right: 18,
                                child: Column(
                                  children: [
                                    const SizedBox(height: 22),
                                    Text(
                                      dateLabel,
                                      style: TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white
                                            .withValues(alpha: 0.7),
                                      ),
                                    ),
                                    Text(
                                      timeLabel,
                                      style: const TextStyle(
                                        fontFamily: AppFonts.ui,
                                        fontSize: 40,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                        letterSpacing: 1.5,
                                        height: 1.1,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Positioned(
                                left: 18,
                                right: 18,
                                bottom: 14,
                                child: Row(
                                  children: [
                                    _lockShortcut(Icons.flashlight_on),
                                    const Spacer(),
                                    Container(
                                      width: 48,
                                      height: 4,
                                      decoration: BoxDecoration(
                                        color: Colors.white
                                            .withValues(alpha: 0.3),
                                        borderRadius:
                                            BorderRadius.circular(99),
                                      ),
                                    ),
                                    const Spacer(),
                                    _lockShortcut(
                                      Icons.photo_camera_outlined,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Wallpaper palette
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.palette_rounded,
                              size: 18, color: Color(0xFFD97706)),
                          const SizedBox(width: 6),
                          const Text(
                            'اختر الخلفية',
                            style: TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${_wallpapers.length} درجات هادئة',
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _wallpapers.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 0.58,
                        ),
                        itemBuilder: (context, i) {
                          return _WallpaperSwatch(
                            wallpaper: _wallpapers[i],
                            selected: _theme == i,
                            onTap: () => setState(() => _theme = i),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                // Pick verse
                Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    onTap: _pickVerse,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFFE2E8F0).withValues(alpha: 0.9),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.menu_book_rounded,
                              size: 18, color: Color(0xFFD97706)),
                          SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'اختر آية من الكتاب المقدس (سفر، أصحاح، أعداد)',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_custom) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => setState(_resetDailyVerse),
                    child: const Text(
                      'رجّع آية اليوم',
                      style: TextStyle(
                        fontFamily: AppFonts.ui,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                // Download wallpaper to gallery
                SizedBox(
                  width: double.infinity,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0EA5E9), Color(0xFF4F46E5)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color:
                              const Color(0xFF0EA5E9).withValues(alpha: 0.25),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _downloadWallpaper,
                        borderRadius: BorderRadius.circular(16),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.download_rounded,
                                  color: Colors.white, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'تحميل الخلفية',
                                style: TextStyle(
                                  fontFamily: AppFonts.ui,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: Material(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: _shareWallpaper,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color:
                                const Color(0xFFE2E8F0).withValues(alpha: 0.7),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.wallpaper_rounded,
                                size: 18, color: Color(0xFF334155)),
                            SizedBox(width: 8),
                            Text(
                              'مشاركة كصورة',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: Material(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: _shareVerseText,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color:
                                const Color(0xFFE2E8F0).withValues(alpha: 0.7),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.share_rounded,
                                size: 18, color: Color(0xFF334155)),
                            SizedBox(width: 8),
                            Text(
                              'مشاركة الآية',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                // How to use
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9).withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: const Color(0xFFE2E8F0).withValues(alpha: 0.7),
                    ),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _InfoIcon(),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'طريقة الاستخدام',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'بعد الضغط على الزر، احفظ الصورة من قائمة المشاركة ثم اخترها كخلفية شاشة القفل من تطبيق الصور أو إعدادات الجهاز.',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF64748B),
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _AppTabBar(
        isDark: isDark,
        currentIndex: -1,
        onTap: (index) => context.go('${Routes.mainTabs}?tab=$index'),
      ),
    );
  }

  Widget _lockShortcut(IconData icon) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 16, color: Colors.white),
    );
  }
}

class _InfoIcon extends StatelessWidget {
  const _InfoIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
          ),
        ],
      ),
      child: const Icon(Icons.info_outline_rounded,
          size: 16, color: Color(0xFF334155)),
    );
  }
}

class _WallpaperSwatch extends StatelessWidget {
  const _WallpaperSwatch({
    required this.wallpaper,
    required this.selected,
    required this.onTap,
  });

  final _Wallpaper wallpaper;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? const Color(0xFFFFFBEB).withValues(alpha: 0.35)
          : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.fromLTRB(6, 6, 6, 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? const Color(0xFFF59E0B)
                  : const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [wallpaper.c2, wallpaper.c1],
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      selected ? Icons.check_circle_rounded : wallpaper.icon,
                      size: 16,
                      color: wallpaper.accent,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                wallpaper.name,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: AppFonts.ui,
                  fontSize: 10,
                  height: 1.1,
                  fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                  color: selected
                      ? const Color(0xFF0F172A)
                      : const Color(0xFF475569),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LockHeader extends StatelessWidget {
  const _LockHeader({
    required this.dark,
    required this.onBack,
    required this.onReset,
  });

  final bool dark;
  final VoidCallback onBack;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final surface = dark ? AppColors.darkCard : Colors.white;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    final titleColor = dark ? AppColors.darkText : const Color(0xFF0F172A);
    final chipBg = dark ? AppColors.darkCardMuted : const Color(0xFFF8FAFC);

    Widget action(IconData icon, VoidCallback onTap) {
      return Material(
        color: chipBg,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Icon(icon, size: 20, color: titleColor),
          ),
        ),
      );
    }

    return Container(
      padding: EdgeInsets.fromLTRB(20, top + 12, 20, 16),
      decoration: BoxDecoration(
        color: surface.withValues(alpha: 0.95),
        border: Border(bottom: BorderSide(color: border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          action(Icons.arrow_back_rounded, onBack),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'تصميم الخلفيات',
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFD97706),
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  AppStrings.lockScreenTitle,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: titleColor,
                  ),
                ),
              ],
            ),
          ),
          action(Icons.refresh_rounded, onReset),
        ],
      ),
    );
  }
}

/// Same 5-tab bar as the rest of the app.
class _AppTabBar extends StatelessWidget {
  const _AppTabBar({
    required this.isDark,
    required this.currentIndex,
    required this.onTap,
  });

  final bool isDark;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final color = isDark ? AppColors.darkCard : AppColors.lightCard;
    final inactive =
        isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    Widget item(int index, IconData active, IconData idle, String label) {
      final selected = currentIndex == index;
      final tint =
          selected ? (isDark ? AppColors.gold : AppColors.navy) : inactive;
      return Expanded(
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => onTap(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: selected
                    ? (isDark
                        ? AppColors.darkCardMuted
                        : AppColors.lightCardMuted)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(selected ? active : idle, color: tint, size: 21),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      color: tint,
                      fontSize: 10,
                      height: 1.25,
                      fontWeight:
                          selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(color: border),
            boxShadow: AppShadows.card,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
          child: Row(
            textDirection: ui.TextDirection.rtl,
            children: [
                                          item(0, Icons.home_rounded, Icons.home_outlined,
                  AppStrings.navHome),
              item(1, Icons.menu_book_rounded, Icons.menu_book_outlined,
                  AppStrings.navBible),
              item(
                2,
                Icons.notifications_active_rounded,
                Icons.notifications_none_rounded,
                AppStrings.navSettings,
              ),
              item(3, Icons.more_horiz_rounded, Icons.more_horiz_rounded,
                  AppStrings.navMore),
            ],
          ),
        ),
      ),
    );
  }
}
