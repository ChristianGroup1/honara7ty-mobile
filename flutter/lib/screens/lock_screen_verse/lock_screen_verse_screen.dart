import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/strings.dart';
import '../../core/theme.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_header.dart';

class _Verse {
  const _Verse(this.text, this.reference);
  final String text;
  final String reference;
}

class _ThemeOption {
  const _ThemeOption(this.name, this.background, this.accent);
  final String name;
  final Color background;
  final Color accent;
}

const _dailyVerses = [
  _Verse('سِرَاجٌ لِرِجْلِي كَلَامُكَ وَنُورٌ لِسَبِيلِي.', 'مزمور ١١٩: ١٠٥'),
  _Verse('لَا تَخَفْ لِأَنِّي مَعَكَ. لَا تَتَلَفَّتْ لِأَنِّي إِلَهُكَ.', 'إشعياء ٤١: ١٠'),
  _Verse('لَا تَهْتَمُّوا بِشَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلَاةِ وَالدُّعَاءِ.', 'فيلبي ٤: ٦'),
  _Verse('سَلَامًا أَتْرُكُ لَكُمْ. سَلَامِي أُعْطِيكُمْ.', 'يوحنا ١٤: ٢٧'),
  _Verse('الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ.', 'مزمور ٢٣: ١'),
  _Verse('تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ.', 'أمثال ٣: ٥'),
  _Verse('كُلَّ الْأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ.', 'رومية ٨: ٢٨'),
];

const _themes = [
  _ThemeOption('ليلة هادئة', Color(0xFF121E34), Color(0xFF78A1BD)),
  _ThemeOption('بنفسجي', Color(0xFF1A0A2E), Color(0xFFB47FFF)),
  _ThemeOption('زمردي', Color(0xFF0A2018), Color(0xFF4CAF7D)),
  _ThemeOption('عنابي', Color(0xFF1E0A0A), Color(0xFFE07070)),
  _ThemeOption('ذهبي', Color(0xFF1A1200), Color(0xFFD4AF37)),
  _ThemeOption('أزرق', Color(0xFF051B2C), Color(0xFF00C4FF)),
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
    final day = DateTime.now().difference(DateTime(DateTime.now().year)).inDays;
    _verse = _dailyVerses[day % _dailyVerses.length];
    _loadBooks();
  }

  Future<void> _loadBooks() async {
    final json = jsonDecode(await rootBundle.loadString('assets/data/bible.json'))
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

  Future<void> _shareWallpaper() async {
    final boundary = _previewKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return;
    final image = await boundary.toImage(pixelRatio: 3);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) return;
    final file = File('${Directory.systemTemp.path}/honara7ty-verse.png');
    await file.writeAsBytes(bytes.buffer.asUint8List());
    await Share.shareXFiles(
      [XFile(file.path)],
      text: '${_verse.text}\n${_verse.reference}\n\nآية اليوم من تطبيق هنا راحتي',
    );
  }

  Future<void> _pickVerse() async {
    if (_books.isEmpty) return;
    var bookIndex = 0;
    var chapter = 1;
    final picked = await showModalBottomSheet<_Verse>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheet) {
            final book = _books[bookIndex];
            return Directionality(
              textDirection: TextDirection.rtl,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButton<int>(
                        isExpanded: true,
                        value: bookIndex,
                        items: [
                          for (var i = 0; i < _books.length; i++)
                            DropdownMenuItem(value: i, child: Text(_books[i].name)),
                        ],
                        onChanged: (value) => setSheet(() {
                          bookIndex = value ?? 0;
                          chapter = 1;
                        }),
                      ),
                      DropdownButton<int>(
                        isExpanded: true,
                        value: chapter,
                        items: [
                          for (var i = 1; i <= book.chapters.length; i++)
                            DropdownMenuItem(value: i, child: Text('إصحاح $i')),
                        ],
                        onChanged: (value) => setSheet(() => chapter = value ?? 1),
                      ),
                      SizedBox(
                        height: 280,
                        child: ListView.builder(
                          itemCount: book.chapters[chapter - 1].length,
                          itemBuilder: (context, index) {
                            final text = book.chapters[chapter - 1][index];
                            return ListTile(
                              title: Text(
                                '${index + 1}. $text',
                                textDirection: TextDirection.rtl,
                              ),
                              onTap: () => Navigator.pop(
                                context,
                                _Verse(text, '${book.name} $chapter: ${index + 1}'),
                              ),
                            );
                          },
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

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isNightMode;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final text = isDark ? AppColors.darkText : AppColors.lightText;
    final muted = isDark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final theme = _themes[_theme];

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          AppHeader(
            title: AppStrings.lockScreenTitle,
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'صمّم آية يومية بخلفية هادئة واحفظها لاستخدامها كخلفية شاشة القفل.',
                  textDirection: TextDirection.rtl,
                  textAlign: TextAlign.right,
                  style: TextStyle(color: muted),
                ),
                const SizedBox(height: 16),
                RepaintBoundary(
                  key: _previewKey,
                  child: AspectRatio(
                  aspectRatio: 9 / 16,
                  child: Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: theme.background,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.auto_stories, color: theme.accent, size: 28),
                        const SizedBox(height: 20),
                        Text(
                          _verse.text,
                          textDirection: TextDirection.rtl,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            height: 1.7,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _verse.reference,
                          style: TextStyle(color: theme.accent, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                ),
                ),
                const SizedBox(height: 16),
                Text(AppStrings.lockScreenPickTheme, textDirection: TextDirection.rtl, style: TextStyle(color: text, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (var i = 0; i < _themes.length; i++)
                      ChoiceChip(
                        label: Text(_themes[i].name),
                        selected: _theme == i,
                        onSelected: (_) => setState(() => _theme = i),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _pickVerse,
                  icon: const Icon(Icons.menu_book_outlined),
                  label: const Text('اختر آية من الكتاب المقدس'),
                ),
                if (_custom)
                  TextButton(
                    onPressed: () {
                      final day = DateTime.now().difference(DateTime(DateTime.now().year)).inDays;
                      setState(() {
                        _verse = _dailyVerses[day % _dailyVerses.length];
                        _custom = false;
                      });
                    },
                    child: const Text('رجّع آية اليوم'),
                  ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: _shareWallpaper,
                  icon: const Icon(Icons.wallpaper_outlined),
                  label: const Text(AppStrings.lockScreenSave),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
