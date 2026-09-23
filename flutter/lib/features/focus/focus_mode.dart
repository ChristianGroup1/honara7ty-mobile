import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

enum FocusModePreference { disabled, manual, automatic }

class FocusMode {
  static const _channel = MethodChannel('honara7ty/focus_mode');
  static const _key = 'honara7ty_focus_mode_preference';
  static final pendingGuide = ValueNotifier(false);

  static Future<void> openIosFocusSettings() async {
    const urls = ['App-prefs:FOCUS', 'prefs:root=FOCUS', 'app-settings:'];
    for (final url in urls) {
      try {
        final opened = await launchUrl(
          Uri.parse(url),
          mode: LaunchMode.externalApplication,
        );
        if (opened) return;
      } catch (_) {}
    }
  }

  static Future<void> openShortcuts() async {
    try {
      await launchUrl(
        Uri.parse('shortcuts://'),
        mode: LaunchMode.externalApplication,
      );
    } catch (_) {}
  }

  static bool get supported => Platform.isAndroid;

  static Future<FocusModePreference> preference() async {
    final value = (await SharedPreferences.getInstance()).getString(_key);
    return switch (value) {
      'manual' => FocusModePreference.manual,
      'automatic' => FocusModePreference.automatic,
      _ => FocusModePreference.disabled,
    };
  }

  static Future<void> setPreference(FocusModePreference value) async {
    await (await SharedPreferences.getInstance()).setString(
      _key,
      switch (value) {
        FocusModePreference.manual => 'manual',
        FocusModePreference.automatic => 'automatic',
        FocusModePreference.disabled => 'disabled',
      },
    );
    if (value == FocusModePreference.disabled) await cancel();
  }

  static Future<bool> isActive() async {
    if (!supported) return false;
    return await _channel.invokeMethod<bool>('isActive') ?? false;
  }

  static Future<bool> hasPermission() async {
    if (!supported) return false;
    return await _channel.invokeMethod<bool>('hasPermission') ?? false;
  }

  static Future<void> requestPermission() async {
    if (!supported) return;
    await _channel.invokeMethod('requestPermission');
  }

  static Future<bool> enable() async {
    if (!supported) return false;
    return await _channel.invokeMethod<bool>('enable') ?? false;
  }

  static Future<bool> disable() async {
    if (!supported) return false;
    return await _channel.invokeMethod<bool>('disable') ?? false;
  }

  static Future<void> schedule(int hour, int minute) async {
    if (!supported) return;
    await _channel.invokeMethod('schedule', {'hour': hour, 'minute': minute});
  }

  static Future<void> cancel() async {
    if (!supported) return;
    await _channel.invokeMethod('cancel');
  }
}

Future<void> showIosFocusGuide(
  BuildContext context, {
  required bool automatic,
}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) {
      return Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'فعّل التركيز وقت الخلوة',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                automatic
                    ? 'آيفون مش بيسمح للتطبيق يشغّل التركيز لوحده. في معاد الخلوة هيظهر زر «تفعيل التركيز» على الإشعار ويفتح الإعدادات. ولو عايزه يشتغل من غير ما تضغط: الاختصارات، ثم الأتمتة، ثم وقت اليوم، ثم ضبط التركيز، ثم عدم الإزعاج.'
                    : 'آيفون مش بيسمح للتطبيق يشغّل التركيز لوحده. افتح إعدادات التركيز وفعّل عدم الإزعاج لمدة الخلوة.',
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () async {
                  Navigator.pop(context);
                  await FocusMode.openIosFocusSettings();
                },
                child: const Text('افتح إعدادات التركيز'),
              ),
              if (automatic) ...[
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    await FocusMode.openShortcuts();
                  },
                  child: const Text('افتح تطبيق الاختصارات'),
                ),
              ],
            ],
          ),
        ),
      );
    },
  );
}
