import 'package:shared_preferences/shared_preferences.dart';

const _prefix = 'notification_permission_seen:';

Future<bool> hasSeenNotificationPermissionPrompt(String? userId) async {
  if (userId == null || userId.isEmpty) return false;
  return (await SharedPreferences.getInstance()).getBool('$_prefix$userId') ??
      false;
}

Future<void> markNotificationPermissionPromptSeen(String? userId) async {
  if (userId == null || userId.isEmpty) return;
  await (await SharedPreferences.getInstance()).setBool('$_prefix$userId', true);
}
