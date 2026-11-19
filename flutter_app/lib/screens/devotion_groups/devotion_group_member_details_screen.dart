import 'package:flutter/material.dart';

import '../devotion_calendar/devotion_calendar_screen.dart';

class DevotionGroupMemberDetailsScreen extends StatelessWidget {
  const DevotionGroupMemberDetailsScreen({
    super.key,
    required this.groupId,
    required this.userId,
    this.displayName,
  });

  final String groupId;
  final String userId;
  final String? displayName;

  @override
  Widget build(BuildContext context) {
    return DevotionCalendarScreen(
      key: ValueKey('$groupId:$userId'),
      subjectUserId: userId,
      subjectName: displayName,
    );
  }
}
