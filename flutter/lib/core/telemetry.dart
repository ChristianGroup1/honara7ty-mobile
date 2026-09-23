import 'dart:io';

import 'package:clarity_flutter/clarity_flutter.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

const sentryDsn =
    'https://7048b94c71a6d883a2cfd0aff6c6ac75@o4511268451254272.ingest.de.sentry.io/4511268453875792';
const clarityProjectId = 'wgoxraerys';

Future<void> startTelemetry(Future<void> Function() appRunner) async {
  await SentryFlutter.init((options) {
    options.dsn = sentryDsn;
    options.environment = kReleaseMode ? 'production' : 'development';
    options.tracesSampleRate = kReleaseMode ? 0.2 : 1;
    options.beforeSend = (event, hint) {
      final message = '${event.message ?? ''} ${event.throwable}'.toLowerCase();
      if (message.contains('abort')) return null;
      return event;
    };
  }, appRunner: appRunner);
}

Future<void> initFirebase() async {
  try {
    await Firebase.initializeApp(
      options: Platform.isIOS
          ? const FirebaseOptions(
              apiKey: 'AIzaSyDfMqJONr1ZEEDy15lvf_T_iNBqUpuNklU',
              appId: '1:1027705052109:ios:a224cb3b3ba583224c8284',
              messagingSenderId: '1027705052109',
              projectId: 'honara7ty',
              storageBucket: 'honara7ty.firebasestorage.app',
              iosBundleId: 'com.honara7ty.app',
            )
          : const FirebaseOptions(
              apiKey: 'AIzaSyCxHQKl1wGOztrxxv7vW3eMXtk34_XOFE8',
              appId: '1:1027705052109:android:f0bea8081f79d7b64c8284',
              messagingSenderId: '1027705052109',
              projectId: 'honara7ty',
              storageBucket: 'honara7ty.firebasestorage.app',
            ),
    );
    await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(true);
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
  } catch (error, stack) {
    debugPrint('Firebase init skipped: $error\n$stack');
  }
}

Widget wrapClarity(Widget app) {
  return ClarityWidget(
    clarityConfig: ClarityConfig(projectId: clarityProjectId),
    app: app,
  );
}

Future<void> setTelemetryUser(String? userId) async {
  if (userId == null) return;
  try {
    await Sentry.configureScope((scope) => scope.setUser(SentryUser(id: userId)));
    Clarity.setCustomUserId(userId);
    await FirebaseAnalytics.instance.setUserId(id: userId);
    await FirebaseCrashlytics.instance.setUserIdentifier(userId);
  } catch (_) {}
}

Future<void> clearTelemetryUser() async {
  try {
    await Sentry.configureScope((scope) => scope.setUser(null));
    Clarity.startNewSession((_) {});
    await FirebaseAnalytics.instance.setUserId(id: null);
    await FirebaseCrashlytics.instance.setUserIdentifier('');
  } catch (_) {}
}

Future<void> trackScreen(String name) async {
  try {
    Clarity.setCurrentScreenName(name);
    await FirebaseAnalytics.instance.logScreenView(screenName: name);
  } catch (_) {}
}
