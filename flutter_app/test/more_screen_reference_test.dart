import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/providers/theme_provider.dart';
import 'package:honara7ty/screens/more/more_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final captureKey = GlobalKey();

  setUpAll(() async {
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

  Future<void> openScreen(WidgetTester tester, VoidCallback onHome,
      {double width = 390, double textScale = 1}) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = Size(width, 920);
    tester.view.devicePixelRatio = 1;
    tester.view.viewPadding = const FakeViewPadding(top: 24, bottom: 24);
    tester.view.padding = const FakeViewPadding(top: 24, bottom: 24);
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: RepaintBoundary(
        key: captureKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(textScale)),
              child: child!),
          home: MoreScreen(onHome: onHome),
        ),
      ),
    ));
    // SVG files and preferences resolve asynchronously outside fake time.
    await tester.runAsync(
        () async => Future<void>.delayed(const Duration(milliseconds: 150)));
    await tester.pumpAndSettle();
  }

  testWidgets(
      'reference SVGs, distinct colors, RTL card order, and home action',
      (tester) async {
    var homeTapped = false;
    await openScreen(tester, () => homeTapped = true);
    final svgAssets = tester
        .widgetList<SvgPicture>(find.byType(SvgPicture))
        .map((svg) => (svg.bytesLoader as SvgAssetLoader).assetName)
        .toSet();
    expect(
        svgAssets,
        containsAll([
          'assets/icons/more/menu_book.svg',
          'assets/icons/more/psychology.svg',
          'assets/icons/more/palette.svg',
          'assets/icons/more/military_tech.svg',
          'assets/icons/more/leaderboard.svg',
          'assets/icons/more/notifications_off.svg',
        ]));
    final gradients = tester
        .widgetList<Container>(find.byType(Container))
        .map((c) => c.decoration)
        .whereType<BoxDecoration>()
        .map((d) => d.gradient)
        .whereType<LinearGradient>()
        .map((g) => g.colors.first)
        .toSet();
    expect(
        gradients,
        containsAll([
          const Color(0xFF14B8A6),
          const Color(0xFFF59E0B),
          const Color(0xFF7C3AED),
          const Color(0xFFF43F5E),
          const Color(0xFF06B6D4),
          const Color(0xFF4F46E5),
          const Color(0xFF0EA5E9),
        ]));
    expect(tester.getCenter(find.text('وضع الخلوة (لا تزعجني)')).dx,
        greaterThan(tester.getCenter(find.text('شرح الخلوة')).dx));
    expect(find.text('معطل (إيقاف)'), findsOneWidget);
    expect(tester.takeException(), isNull);

    const previewPath = String.fromEnvironment('MORE_PREVIEW_PATH');
    if (previewPath.isNotEmpty) {
      await tester.runAsync(() async {
        final boundary = captureKey.currentContext!.findRenderObject()!
            as RenderRepaintBoundary;
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await File(previewPath).writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }
    await tester.tap(find.text('الرئيسية'));
    expect(homeTapped, isTrue);
    await tester.tap(find.text('وضع الخلوة (لا تزعجني)'));
    await tester.pumpAndSettle();
    expect(find.text('إيقاف'), findsOneWidget);
    expect(find.text('الآن'), findsOneWidget);
    expect(find.text('تلقائي'), findsOneWidget);
    expect(tester.getBottomLeft(find.text('تلقائي')).dy, lessThan(920 - 24));
    // Dismiss without changing the device's focus setting.
    Navigator.of(tester.element(find.text('تلقائي'))).pop();
    await tester.pumpAndSettle();
    expect(find.text('معطل (إيقاف)'), findsOneWidget);
  });

  testWidgets('narrow layout, large Arabic text, and night toggle',
      (tester) async {
    await openScreen(tester, () {}, width: 320, textScale: 1.3);
    expect(tester.takeException(), isNull);
    final toggle = find.byType(Switch);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    expect(tester.widget<Switch>(toggle).value, isTrue);
    await tester.scrollUntilVisible(find.text('سياسة الخصوصية'), 200);
    expect(tester.takeException(), isNull);
  });
}
