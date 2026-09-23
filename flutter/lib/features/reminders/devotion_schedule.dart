import '../../core/offline_sync.dart';
import '../../core/supabase_service.dart';
import '../focus/focus_mode.dart';
import 'devotion_reminder.dart';

class DevotionSchedule {
  static Future<void> ensure({
    bool requestPermission = false,
    bool startTomorrow = false,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    var raw = '07:00';
    try {
      final profile = await supabase
          .from('profiles')
          .select('devotion_time')
          .eq('id', userId)
          .maybeSingle();
      final stored = profile?['devotion_time'] as String?;
      if (stored == null || !stored.contains(':')) {
        await OfflineSync.saveProfile(userId, {
          'devotion_time': raw,
          'updated_at': DateTime.now().toIso8601String(),
        });
      } else {
        raw = stored;
      }
    } catch (_) {}
    final parts = raw.split(':');
    final hour = int.tryParse(parts[0]) ?? 7;
    final minute = int.tryParse(parts[1]) ?? 0;
    await DevotionReminder.instance.scheduleDaily(
      hour: hour,
      minute: minute,
      requestPermission: requestPermission,
      startTomorrow: startTomorrow,
    );
    if (await FocusMode.preference() == FocusModePreference.automatic) {
      await FocusMode.schedule(hour, minute);
    }
  }
}
