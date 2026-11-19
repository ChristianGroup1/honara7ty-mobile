import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../focus/focus_mode.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

const devotionVerses = [
  '"نَصِيبِي هُوَ الرَّبُّ، قَالَتْ نَفْسِي، مِنْ أَجْلِ ذلِكَ أَرْجُوهُ" (مراثي ارميا 3 : 24)',
  '"تَحْتَ ظِلِّهِ اشْتَهَيْتُ أَنْ أَجْلِسَ، وَثَمَرَتُهُ حُلْوَةٌ لِحَلْقِي" (نشيد الانشاد 2 : 3)',
  '"كَمَا يَشْتَاقُ الإِيَّلُ إِلَى جَدَاوِلِ الْمِيَاهِ، هكَذَا تَشْتَاقُ نَفْسِي إِلَيْكَ يَا اللهُ" (المزامير 42 : 1)',
  '"تَشْتَاقُ بَلْ تَتُوقُ نَفْسِي إِلَى دِيَارِ الرَّبِّ" (المزامير 84 : 2)',
  '"حَبِيبِي لِي وَأَنَا لَهُ" (نشيد الانشاد 2 : 16)',
  '"ذُوقُوا وَانْظُرُوا مَا أَطْيَبَ الرَّبَّ" (المزامير 34 : 8)',
  '"عَطِشَتْ نَفْسِي إِلَى اللهِ، إِلَى الإِلهِ الْحَيِّ" (المزامير 42 : 2)',
  '"يَا اللهُ، إِلهِي أَنْتَ. إِلَيْكَ أُبَكِّرُ. عَطِشَتْ إِلَيْكَ نَفْسِي" (المزامير 63 : 1)',
  '"فَغَرْتُ فَمِي وَلَهَثْتُ، لأَنِّي إِلَى وَصَايَاكَ اشْتَقْتُ" (المزامير 119 : 131)',
  '"إِنْ أَحَبَّنِي أَحَدٌ يَحْفَظْ كَلاَمِي" (يوحنا 14 : 23)',
  '"تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ وَأَنَا أُرِيحُكُمْ" (متى 11 : 28)',
  '"تُعَرِّفُنِي سَبِيلَ الْحَيَاةِ. أَمَامَكَ شَبَعُ سُرُورٍ" (المزامير 16 : 11)',
  '"وَكَانَ الرَّبُّ يُكَلِّمُ مُوسَى وَجْهًا لِوَجْهٍ كَمَا يُكَلِّمُ الرَّجُلُ صَاحِبَهُ" (خروج 33 : 11)',
  '"ادْخُلْ إِلَى مِخْدَعِكَ وَأَغْلِقْ بَابَكَ وَصَلِّ إِلَى أَبِيكَ الَّذِي فِي الْخَفَاءِ" (متى 6 : 6)',
  '"وَفِي الصُّبْحِ بَاكِرًا جِدًّا قَامَ وَخَرَجَ وَمَضَى إِلَى مَوْضِعٍ خَلَاءٍ وَكَانَ يُصَلِّي هُنَاكَ" (مرقس 1 : 35)',
  '"أَمَّا هُوَ فَكَانَ يَعْتَزِلُ فِي الْبَرَارِي وَيُصَلِّي" (لوقا 5 : 16)',
  '" وَفِي ٱلصُّبْحِ بَاكِرًا جِدًّا قَامَ وَخَرَجَ وَمَضَى إِلَى مَوْضِعٍ خَلَاءٍ، وَكَانَ يُصَلِّي هُنَاكَ،" (مرقس 1 : 35)',
  '"اثْبُتُوا فِيَّ وَأَنَا فِيكُمْ" (يوحنا 15 : 4)',
  '"اقْتَرِبُوا إِلَى اللهِ فَيَقْتَرِبَ إِلَيْكُمْ" ( رسالة يعقوب 4 : 8)',
  '"مُبَارَكٌ الرَّجُلُ الَّذِي يَتَّكِلُ عَلَى الرَّبِّ وَكَانَ الرَّبُّ مُتَّكَلَهُ" (إرميا 17 : 7)',
  '"اُطْلُبُوا الرَّبَّ مَا دَامَ يُوجَدُ" (إشعياء 55 : 6)',
  '"انْتَظِرِ الرَّبَّ. لِيَتَشَدَّدْ وَلْيَتَشَجَّعْ قَلْبُكَ" (المزامير 27 : 14)',
  '"كُفُّوا وَاعْلَمُوا أَنِّي أَنَا اللهُ" (المزامير 46 : 10)',
  '"أَمَّا مُنْتَظِرُو الرَّبِّ فَيُجَدِّدُونَ قُوَّةً" (إشعياء 40 : 31)',
  '"لأَنَّكَ أَنْتَ رَجَائِي يَا سَيِّدِي الرَّبُّ، مُتَّكَلِي مُنْذُ صِبَايَ" (المزامير 71 : 5)',
  '"أُحِبُّكَ يَا رَبُّ يَا قُوَّتِي" (المزامير 18 : 1)',
  '"أُرِيدُ أَنْ أَسْكُنَ فِي بَيْتِ الرَّبِّ كُلَّ أَيَّامِ حَيَاتِي" (المزامير 27 : 4)',
  '"يَوْمٌ وَاحِدٌ فِي دِيَارِكَ خَيْرٌ مِنْ أَلْفٍ" (المزامير 84 : 10)',
  '"أَمَّا أَنَا فَالاِقْتِرَابُ إِلَى اللهِ حَسَنٌ لِي" (المزامير 73 : 28)',
  '"اِلْتَصَقَتْ نَفْسِي بِكَ" (المزامير 63 : 8)',
  '"بِظِلِّ جَنَاحَيْكَ اسْتُرْنِي" (المزامير 17 : 8)',
  '"أَنَا مَعَكُمْ كُلَّ الأَيَّامِ إِلَى انْقِضَاءِ الدَّهْرِ" (متى 28 : 20)',
  '"مَنْ يَثْبُتْ فِيَّ وَأَنَا فِيهِ يَأْتِي بِثَمَرٍ كَثِيرٍ" (يوحنا 15 : 5)',
  '"هُوَ يَدْعُونِي أَبِي أَنْتَ. إِلَهِي وَصَخْرَةُ خَلاَصِي" (المزامير 89 : 26)',
];

const _timeKey = 'devotion_reminder_time';
const _title = '📖 وقت كلمة الله';
const _action = 'اضغط لتبدأ خلوتك مع الله 🙏';

int devotionScheduleDays({required bool includeFollowUp, required bool android}) {
  if (!android || !includeFollowUp) return 30;
  return 50 ~/ 2;
}

DateTime? followUpTime(DateTime primary, int hour, int minute) {
  final minimum = primary.add(const Duration(minutes: 30));
  if (hour < 12) {
    return DateTime(primary.year, primary.month, primary.day, hour + 12, minute);
  }
  final dayEnd = DateTime(primary.year, primary.month, primary.day, 23, 59);
  if (dayEnd.difference(primary) < const Duration(minutes: 30)) return null;
  final half = primary.add(Duration(milliseconds: dayEnd.difference(primary).inMilliseconds ~/ 2));
  return half.isBefore(minimum) ? minimum : half;
}

List<String> devotionVersePlan(DateTime start, int count) {
  if (devotionVerses.isEmpty || count <= 0) return [];
  final utc = start.toUtc();
  final seed = _hash(
    '${utc.year.toString().padLeft(4, '0')}-${utc.month.toString().padLeft(2, '0')}-${utc.day.toString().padLeft(2, '0')}',
  );
  final plan = <String>[];
  var cycle = 0;
  while (plan.length < count) {
    plan.addAll(_shuffle(devotionVerses, seed + cycle));
    cycle++;
  }
  return plan.take(count).toList();
}

int _hash(String value) {
  var hash = 0;
  for (final code in value.codeUnits) {
    hash = (hash * 31 + code) & 0xFFFFFFFF;
  }
  return hash;
}

List<String> _shuffle(List<String> verses, int seed) {
  final shuffled = [...verses];
  var value = seed == 0 ? 1 : seed;
  double next() {
    value = (value * 1664525 + 1013904223) & 0xFFFFFFFF;
    return value / 0x100000000;
  }

  for (var index = shuffled.length - 1; index > 0; index--) {
    final swap = (next() * (index + 1)).floor();
    final item = shuffled[index];
    shuffled[index] = shuffled[swap];
    shuffled[swap] = item;
  }
  return shuffled;
}

class DevotionReminder {
  DevotionReminder._();
  static final instance = DevotionReminder._();
  final _plugin = FlutterLocalNotificationsPlugin();
  var _ready = false;

  Future<void> init() async {
    if (_ready) return;
    tzdata.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Africa/Cairo'));
    await _plugin.initialize(
      InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          notificationCategories: [
            DarwinNotificationCategory(
              'devotion_focus',
              actions: [
                DarwinNotificationAction.plain('enable_focus', 'تفعيل التركيز'),
              ],
            ),
          ],
        ),
      ),
      onDidReceiveNotificationResponse: (response) {
        if (response.actionId == 'enable_focus') {
          FocusMode.pendingGuide.value = true;
        }
      },
    );
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          'devotion_reminder',
          'تذكير الخلوة اليومية',
          importance: Importance.high,
        ));
    _ready = true;
  }

  Future<void> restore() async {
    final raw = (await SharedPreferences.getInstance()).getString(_timeKey);
    if (raw == null || !raw.contains(':')) return;
    final parts = raw.split(':');
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return;
    await scheduleDaily(hour: hour, minute: minute, requestPermission: false);
  }

  Future<void> showNow(String title, String body) async {
    await init();
    await _plugin.show(
      42,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'devotion_reminder',
          'تذكير الخلوة اليومية',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }

  Future<bool> notificationsEnabled() async {
    await init();
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) return await android.areNotificationsEnabled() ?? false;
    final ios = _plugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    final options = await ios?.checkPermissions();
    return options?.isEnabled ?? true;
  }

  Future<void> openSystemSettings() async {
    if (Platform.isIOS) {
      await launchUrl(Uri.parse('app-settings:'), mode: LaunchMode.externalApplication);
      return;
    }
    await const MethodChannel('honara7ty/settings').invokeMethod('openNotificationSettings');
  }

  Future<void> requestPermission() async {
    await init();
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    await _plugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  Future<void> cancel() async {
    await init();
    await (await SharedPreferences.getInstance()).remove(_timeKey);
    await _plugin.cancel(41);
    for (var day = 0; day < 30; day++) {
      await _plugin.cancel(1000 + day);
      await _plugin.cancel(2000 + day);
    }
  }

  Future<void> scheduleDaily({
    required int hour,
    required int minute,
    bool requestPermission = true,
    bool startTomorrow = false,
  }) async {
    await init();
    await (await SharedPreferences.getInstance())
        .setString(_timeKey, '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}');
    if (requestPermission) {
      await this.requestPermission();
    } else if (!await notificationsEnabled()) {
      return;
    }
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestExactAlarmsPermission();
    await _plugin.cancel(41);
    for (var day = 0; day < 30; day++) {
      await _plugin.cancel(1000 + day);
      await _plugin.cancel(2000 + day);
    }
    final android = Platform.isAndroid;
    final days = devotionScheduleDays(includeFollowUp: true, android: android);
    final first = _primary(hour, minute, 0, startTomorrow: startTomorrow);
    final plan = devotionVersePlan(first, days);
    for (var day = 0; day < days; day++) {
      final when = _primary(hour, minute, day, startTomorrow: startTomorrow);
      await _schedule(1000 + day, plan[day], when);
      final follow = followUpTime(when, hour, minute);
      if (follow == null) continue;
      await _schedule(
        2000 + day,
        plan[day],
        tz.TZDateTime.from(follow, tz.local),
      );
    }
  }

  tz.TZDateTime _primary(
    int hour,
    int minute,
    int dayOffset, {
    bool startTomorrow = false,
  }) {
    final now = tz.TZDateTime.now(tz.local);
    var when = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (startTomorrow) {
      when = when.add(const Duration(days: 1));
    } else if (!when.isAfter(now)) {
      when = when.add(const Duration(days: 1));
    }
    return when.add(Duration(days: dayOffset));
  }

  Future<void> _schedule(int id, String verse, tz.TZDateTime when) async {
    final offerFocus = Platform.isIOS &&
        await FocusMode.preference() != FocusModePreference.disabled;
    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        'devotion_reminder',
        'تذكير الخلوة اليومية',
        importance: Importance.high,
        priority: Priority.high,
        styleInformation: BigTextStyleInformation('📖 $verse\n\n$_action'),
      ),
      iOS: DarwinNotificationDetails(
        categoryIdentifier: offerFocus ? 'devotion_focus' : null,
      ),
    );
    try {
      await _plugin.zonedSchedule(
        id,
        _title,
        '$verse\n$_action',
        when,
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    } catch (_) {
      await _plugin.zonedSchedule(
        id,
        _title,
        '$verse\n$_action',
        when,
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    }
  }
}
