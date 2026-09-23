// ─── App Entry Point ─────────────────────────────────────────────────────────

import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'core/deep_links.dart';
import 'core/offline_sync.dart';
import 'core/supabase_service.dart';
import 'core/telemetry.dart';
import 'features/focus/focus_mode.dart';
import 'features/reminders/devotion_reminder.dart';
import 'core/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await startTelemetry(() async {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    await initSupabase();
    await DeepLinks.captureInitial();
    await DevotionReminder.instance.init();
    await DevotionReminder.instance.restore();
    await initFirebase();

    runApp(
      wrapClarity(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => ThemeProvider()),
            ChangeNotifierProvider(create: (_) => AuthProvider()),
          ],
          child: const HonaraApp(),
        ),
      ),
    );
  });
}

class HonaraApp extends StatefulWidget {
  const HonaraApp({super.key});

  @override
  State<HonaraApp> createState() => _HonaraAppState();
}

class _HonaraAppState extends State<HonaraApp> with WidgetsBindingObserver {
  late final _router = buildRouter(context);
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  var _isAppActive = true;
  String? _trackedUser;
  String? _trackedScreen;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(
          _handleConnectivityChange,
        );
    _router.routerDelegate.addListener(_trackRoute);
    FocusMode.pendingGuide.addListener(_openFocusGuide);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _connectivitySubscription?.cancel();
    _router.routerDelegate.removeListener(_trackRoute);
    FocusMode.pendingGuide.removeListener(_openFocusGuide);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _isAppActive = state == AppLifecycleState.resumed;
    if (_isAppActive) _flushOfflineChanges();
  }

  void _handleConnectivityChange(List<ConnectivityResult> results) {
    if (_isAppActive && !results.contains(ConnectivityResult.none)) {
      _flushOfflineChanges();
    }
  }

  void _flushOfflineChanges() {
    // A transport becoming available does not guarantee the internet works;
    // OfflineSync safely retains any operation that still cannot reach Supabase.
    OfflineSync.flush().catchError((Object error, StackTrace stackTrace) {
      debugPrint('Offline sync skipped: $error');
    });
  }

  void _openFocusGuide() {
    if (!FocusMode.pendingGuide.value) return;
    FocusMode.pendingGuide.value = false;
    final navContext = rootNavigatorKey.currentContext;
    if (navContext == null) return;
    showIosFocusGuide(navContext, automatic: true);
  }

  void _trackRoute() {
    final location = _router.routeInformationProvider.value.uri.toString();
    if (location == _trackedScreen) return;
    _trackedScreen = location;
    trackScreen(location);
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final userId = context.watch<AuthProvider>().user?.id;
    if (userId != null && userId != _trackedUser) {
      _trackedUser = userId;
      setTelemetryUser(userId);
    }

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
