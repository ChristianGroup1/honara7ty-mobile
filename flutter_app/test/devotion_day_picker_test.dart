import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/reading/bible_catalog.dart';
import 'package:honara7ty/providers/theme_provider.dart';
import 'package:honara7ty/screens/home/home_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

typedef ReadingResult = ({
  bool completed,
  List<({String book, List<int> chapters})> readings
});

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final captureKey = GlobalKey();

  setUpAll(() async {
    await loadBibleCatalog();
    final loader = FontLoader('Tajawal');
    for (final weight in ['Regular', 'Medium', 'Bold', 'ExtraBold', 'Black']) {
      loader
          .addFont(rootBundle.load('assets/fonts/tajawal/Tajawal-$weight.ttf'));
    }
    await loader.load();
    final icons = FontLoader('MaterialIcons');
    icons.addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });

  Future<void> openPicker(
    WidgetTester tester, {
    double bottomInset = 24,
    double width = 390,
    double textScale = 1,
    bool dark = false,
    ValueChanged<ReadingResult?>? onResult,
  }) async {
    SharedPreferences.setMockInitialValues({'app_night_mode_enabled': dark});
    tester.view.physicalSize = Size(width, 800);
    tester.view.devicePixelRatio = 1;
    tester.view.viewPadding = FakeViewPadding(bottom: bottomInset);
    tester.view.padding = FakeViewPadding(bottom: bottomInset);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: RepaintBoundary(
        key: captureKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
              useMaterial3: true,
              bottomSheetTheme:
                  const BottomSheetThemeData(showDragHandle: true)),
          builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(textScale)),
              child: child!),
          home: Builder(
              builder: (context) => Scaffold(
                    body: Center(
                        child: TextButton(
                            onPressed: () async {
                              onResult
                                  ?.call(await showDevotionDayPicker(context));
                            },
                            child: const Text('افتح'))),
                  )),
        ),
      ),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('افتح'));
    await tester.runAsync(() async {
      // Let the catalog asset finish decoding on its background isolate.
      await Future<void>.delayed(const Duration(milliseconds: 150));
    });
    await tester.pumpAndSettle();
    expect(find.text('أين قرأت اليوم؟'), findsOneWidget);
  }

  Future<void> selectChapter(WidgetTester tester, int chapter) async {
    final list = find.byKey(const ValueKey('reading-chapters'));
    await tester.scrollUntilVisible(
        find.byKey(ValueKey('reading-chapter-$chapter')), 120,
        scrollable:
            find.descendant(of: list, matching: find.byType(Scrollable)));
    await tester.tap(find.byKey(ValueKey('reading-chapter-$chapter')));
    await tester.pumpAndSettle();
  }

  testWidgets(
      'reference text, RTL tabs, selection summary, and save with Android inset',
      (tester) async {
    ReadingResult? saved;
    await openPicker(tester,
        bottomInset: 48, onResult: (result) => saved = result);
    expect(tester.getCenter(find.text('العهد القديم (٣٩ سفراً)')).dx,
        greaterThan(tester.getCenter(find.text('العهد الجديد (٢٧ سفراً)')).dx));
    expect(find.byType(RangeSlider), findsNothing);
    await tester.tap(find.text('العهد الجديد (٢٧ سفراً)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('يوحنا'));
    await tester.pumpAndSettle();
    expect(find.text('إنجيل يوحنا'), findsOneWidget);
    for (final chapter in [15, 16, 17]) {
      await selectChapter(tester, chapter);
    }
    expect(find.text('من ١٥ إلى ١٧ (٣ أصحاحات)'), findsOneWidget);
    expect(find.text('المقروء: إنجيل يوحنا — الأصحاحات ١٥، ١٦، ١٧'),
        findsOneWidget);
    expect(tester.widget<Text>(find.text('إنجيل يوحنا')).style!.fontFamily,
        'Tajawal');
    expect(
        find.byWidgetPredicate((widget) =>
            widget is Material && widget.color == const Color(0xFF0EA5E9)),
        findsOneWidget);
    expect(
        find.byWidgetPredicate((widget) =>
            widget is Material && widget.color == const Color(0xFFF59E0B)),
        findsOneWidget);
    final save = find.widgetWithText(FilledButton, 'تأكيد وحفظ القراءة');
    expect(
        tester.widget<FilledButton>(save).style!.backgroundColor!.resolve({}),
        const Color(0xFF0F172A));
    expect(tester.getBottomLeft(save).dy, lessThanOrEqualTo(800 - 48 - 12));
    expect(tester.takeException(), isNull);

    // Optional actual Flutter render for visual review, without a device build.
    const previewPath = String.fromEnvironment('READING_PREVIEW_PATH');
    if (previewPath.isNotEmpty) {
      tester.view.physicalSize = const Size(390, 920);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('هل أتممت خلوتك اليوم؟'));
      final chapterScroll = tester.state<ScrollableState>(find.descendant(
          of: find.byKey(const ValueKey('reading-chapters')),
          matching: find.byType(Scrollable)));
      chapterScroll.position.jumpTo(13 * 56);
      final booksScroll = tester.state<ScrollableState>(find.descendant(
          of: find.byKey(const ValueKey('reading-books')),
          matching: find.byType(Scrollable)));
      booksScroll.position.jumpTo(0);
      await tester.pumpAndSettle();
      await tester.runAsync(() async {
        final boundary = captureKey.currentContext!.findRenderObject()!
            as RenderRepaintBoundary;
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await File(previewPath).writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }
    await tester.tap(save);
    await tester.pumpAndSettle();
    expect(saved?.completed, true);
    expect(saved?.readings.map((r) => {r.book: r.chapters}).toList(), [
      {
        'يوحنا': [15, 16, 17]
      }
    ]);
  });

  testWidgets(
      'changing books preserves readings and supports noncontiguous chapters',
      (tester) async {
    ReadingResult? saved;
    await openPicker(tester, onResult: (result) => saved = result);
    await selectChapter(tester, 1);
    await selectChapter(tester, 3);
    expect(find.text('٢ أصحاحات محددة'), findsOneWidget);
    await tester.tap(find.text('العهد الجديد (٢٧ سفراً)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('مرقس'));
    await tester.pumpAndSettle();
    await selectChapter(tester, 2);
    await tester.tap(find.text('العهد القديم (٣٩ سفراً)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('خروج'));
    await tester.pumpAndSettle();
    await selectChapter(tester, 1);
    await tester.tap(find.widgetWithText(FilledButton, 'تأكيد وحفظ القراءة'));
    await tester.pumpAndSettle();
    expect(saved?.readings.map((r) => {r.book: r.chapters}).toList(), [
      {
        'مرقس': [2]
      },
      {
        'تكوين': [1, 3]
      },
      {
        'خروج': [1]
      }
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('small screen and enlarged text allow clearing and saving no',
      (tester) async {
    ReadingResult? saved;
    await openPicker(tester,
        width: 320,
        textScale: 1.3,
        bottomInset: 32,
        dark: true,
        onResult: (result) => saved = result);
    await selectChapter(tester, 1);
    await tester.tap(find.text('مسح الكل'));
    await tester.pumpAndSettle();
    expect(find.text('لم تحدد أصحاحات'), findsOneWidget);
    await tester.ensureVisible(find.text('لا'));
    await tester.tap(find.text('لا'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'تأكيد وحفظ القراءة'));
    await tester.pumpAndSettle();
    expect(saved?.completed, false);
    expect(saved?.readings, isEmpty);
    expect(tester.takeException(), isNull);
  });
}
