// ─── App Entry Point ─────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'core/supabase_service.dart';
import 'core/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation to portrait.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialise Supabase.
  await initSupabase();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const HonaraApp(),
    ),
  );
}

class HonaraApp extends StatefulWidget {
  const HonaraApp({super.key});

  @override
  State<HonaraApp> createState() => _HonaraAppState();
}

class _HonaraAppState extends State<HonaraApp> {
  late final _router = buildRouter(context);

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return MaterialApp.router(
      title: 'هنا راحتي',
      debugShowCheckedModeBanner: false,

      // RTL – the app is Arabic.
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // Theming.
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: themeProvider.themeMode,

      // Routing.
      routerConfig: _router,
    );
  }
}
