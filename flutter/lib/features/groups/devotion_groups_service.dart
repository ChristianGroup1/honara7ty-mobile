import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/supabase_service.dart';
import '../../core/supabase_retry.dart';

class DevotionGroup {
  const DevotionGroup({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.inviteCode,
    required this.createdAt,
    this.sharedBook,
    this.sharedChapters = const [],
    this.targetDays,
  });

  final String id;
  final String ownerId;
  final String name;
  final String inviteCode;
  final String createdAt;
  final String? sharedBook;
  final List<int> sharedChapters;
  final int? targetDays;

  factory DevotionGroup.fromJson(Map<String, dynamic> json) => DevotionGroup(
        id: json['id'].toString(),
        ownerId: (json['owner_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        inviteCode: (json['invite_code'] ?? '').toString(),
        createdAt: (json['created_at'] ?? '').toString(),
        sharedBook: json['shared_reading_book'] as String?,
        sharedChapters: [
          for (final chapter
              in (json['shared_selected_chapters'] as List? ?? []))
            if (chapter is num) chapter.toInt()
        ],
        targetDays: (json['shared_target_days'] as num?)?.toInt(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'owner_id': ownerId,
        'name': name,
        'invite_code': inviteCode,
        'created_at': createdAt,
        'shared_reading_book': sharedBook,
        'shared_selected_chapters': sharedChapters,
        'shared_target_days': targetDays,
      };
}

class GroupMemberStatus {
  const GroupMemberStatus({
    required this.userId,
    required this.role,
    required this.displayName,
    required this.completedToday,
  });

  final String userId;
  final String role;
  final String displayName;
  final bool completedToday;

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'role': role,
        'displayName': displayName,
        'completedToday': completedToday,
      };

  factory GroupMemberStatus.fromJson(Map<String, dynamic> json) =>
      GroupMemberStatus(
        userId: json['userId'].toString(),
        role: (json['role'] ?? 'member').toString(),
        displayName: (json['displayName'] ?? 'عضو').toString(),
        completedToday: json['completedToday'] == true,
      );
}

class GroupPrayerRequest {
  const GroupPrayerRequest({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String authorId;
  final String authorName;
  final String content;
  final String createdAt;

  factory GroupPrayerRequest.fromJson(Map<String, dynamic> json) =>
      GroupPrayerRequest(
        id: json['id'].toString(),
        authorId: json['author_id'].toString(),
        authorName: (json['author_display_name'] ?? '').toString(),
        content: (json['content'] ?? '').toString(),
        createdAt: (json['created_at'] ?? '').toString(),
      );
}

class DevotionGroupsService {
  String get userId {
    final id = supabase.auth.currentUser?.id;
    if (id == null) throw StateError('يرجى تسجيل الدخول أولًا');
    return id;
  }

  String get displayName {
    final meta = supabase.auth.currentUser?.userMetadata ?? {};
    final name = (meta['full_name'] as String?)?.trim() ?? '';
    if (name.isNotEmpty) return name;
    return supabase.auth.currentUser?.email?.split('@').first ?? 'مستخدم';
  }

  Map<String, dynamic> _map(dynamic data) {
    if (data is Map) return Map<String, dynamic>.from(data);
    if (data is List && data.isNotEmpty && data.first is Map) {
      return Map<String, dynamic>.from(data.first as Map);
    }
    throw StateError('تعذر قراءة بيانات المجموعة');
  }

  Future<List<DevotionGroup>> mine() async {
    final key = 'groups_mine_$userId';
    final prefs = await SharedPreferences.getInstance();
    try {
      final data = await withExpiredJwtRetry(
        () => supabase.rpc('my_devotion_groups'),
      );
      final rows = data is List ? data : [data];
      final groups = [
        for (final row in rows)
          if (row is Map) DevotionGroup.fromJson(Map<String, dynamic>.from(row))
      ];
      await prefs.setString(
          key, jsonEncode([for (final group in groups) group.toJson()]));
      return groups;
    } catch (_) {
      final raw = prefs.getString(key);
      if (raw == null) rethrow;
      final decoded = jsonDecode(raw) as List;
      return [
        for (final row in decoded)
          DevotionGroup.fromJson(Map<String, dynamic>.from(row as Map))
      ];
    }
  }

  Future<DevotionGroup> create(String name) async {
    final data = await withExpiredJwtRetry(() => supabase.rpc(
          'create_devotion_group',
          params: {
            'group_name': name.trim(),
            'owner_display_name': displayName,
          },
        ));
    return DevotionGroup.fromJson(_map(data));
  }

  Future<DevotionGroup> join(String code) async {
    final data = await withExpiredJwtRetry(() => supabase.rpc(
          'join_devotion_group',
          params: {
            'invite_code_input': code.replaceAll(RegExp(r'\s+'), ''),
            'member_display_name': displayName,
          },
        ));
    final group = DevotionGroup.fromJson(_map(data));
    // The React Native app notifies the owner after a successful join. Keep the
    // join successful if a notification fails, just as the original does.
    try {
      await withExpiredJwtRetry(() => supabase.functions
              .invoke('notify-devotion-group-member-joined', body: {
            'groupId': group.id,
            'displayName': displayName,
          }));
    } catch (_) {}
    return group;
  }

  Future<DevotionGroup> byId(String groupId) async {
    final key = 'groups_by_$groupId';
    final prefs = await SharedPreferences.getInstance();
    try {
      final data = await withExpiredJwtRetry(() => supabase
          .from('devotion_groups')
          .select(
              'id, owner_id, name, invite_code, created_at, shared_reading_book, shared_selected_chapters, shared_target_days')
          .eq('id', groupId)
          .single());
      final group = DevotionGroup.fromJson(Map<String, dynamic>.from(data));
      await prefs.setString(key, jsonEncode(group.toJson()));
      return group;
    } catch (_) {
      final raw = prefs.getString(key);
      if (raw == null) rethrow;
      return DevotionGroup.fromJson(
          Map<String, dynamic>.from(jsonDecode(raw) as Map));
    }
  }

  Future<void> leave(String groupId) async {
    await withExpiredJwtRetry(() => supabase
        .from('devotion_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId));
  }

  Future<void> removeMember({
    required String groupId,
    required String memberId,
  }) async {
    await withExpiredJwtRetry(() => supabase.rpc(
          'remove_devotion_group_member',
          params: {
            'target_group_id': groupId,
            'target_user_id': memberId,
          },
        ));
  }

  Future<List<Map<String, dynamic>>> reminderHistory(String groupId) async {
    final rows = await withExpiredJwtRetry(() => supabase
        .from('devotion_group_reminders')
        .select(
            'id, group_id, sender_id, recipient_id, message, created_at, read_at')
        .eq('group_id', groupId)
        .order('created_at', ascending: false)
        .limit(10));
    return [
      for (final row in rows as List) Map<String, dynamic>.from(row as Map),
    ];
  }

  Future<void> deleteGroup(String groupId) async {
    await withExpiredJwtRetry(
      () => supabase.from('devotion_groups').delete().eq('id', groupId),
    );
  }

  Future<List<GroupMemberStatus>> membersToday(
      String groupId, String date) async {
    final key = 'groups_members_${groupId}_$date';
    final prefs = await SharedPreferences.getInstance();
    try {
      final members = await _membersTodayRemote(groupId, date);
      await prefs.setString(
          key, jsonEncode([for (final member in members) member.toJson()]));
      return members;
    } catch (_) {
      final raw = prefs.getString(key);
      if (raw == null) rethrow;
      final decoded = jsonDecode(raw) as List;
      return [
        for (final row in decoded)
          GroupMemberStatus.fromJson(Map<String, dynamic>.from(row as Map))
      ];
    }
  }

  Future<List<GroupMemberStatus>> _membersTodayRemote(
      String groupId, String date) async {
    final members = await withExpiredJwtRetry(() => supabase
        .from('devotion_group_members')
        .select('user_id, role, display_name')
        .eq('group_id', groupId)
        .order('joined_at'));
    final rows = [
      for (final row in members as List) Map<String, dynamic>.from(row as Map)
    ];
    if (rows.isEmpty) return [];
    final logs = await withExpiredJwtRetry(() => supabase
        .from('devotion_log')
        .select('user_id, completed')
        .eq('date', date)
        .inFilter('user_id', rows.map((row) => row['user_id']).toList()));
    final done = {
      for (final log in logs as List)
        if ((log as Map)['completed'] == true) log['user_id'].toString(): true
    };
    return [
      for (final row in rows)
        GroupMemberStatus(
          userId: row['user_id'].toString(),
          role: (row['role'] ?? 'member').toString(),
          displayName: (row['display_name'] ?? 'عضو').toString(),
          completedToday: done[row['user_id'].toString()] == true,
        )
    ];
  }

  Future<List<Map<String, dynamic>>> memberHistory(String userId) async {
    final rows = await withExpiredJwtRetry(() => supabase
        .from('devotion_log')
        .select('date, completed, reading_book, reading_chapter')
        .eq('user_id', userId)
        .order('date', ascending: false)
        .limit(40));
    return [
      for (final row in rows as List) Map<String, dynamic>.from(row as Map)
    ];
  }

  Future<List<GroupPrayerRequest>> prayers(String groupId) async {
    final rows = await withExpiredJwtRetry(() => supabase
        .from('devotion_group_prayer_requests')
        .select('id, author_id, author_display_name, content, created_at')
        .eq('group_id', groupId)
        .order('created_at', ascending: false)
        .limit(20));
    return [
      for (final row in rows as List)
        GroupPrayerRequest.fromJson(Map<String, dynamic>.from(row as Map))
    ];
  }

  Future<void> addPrayer(String groupId, String content) async {
    await withExpiredJwtRetry(
        () => supabase.from('devotion_group_prayer_requests').insert({
              'group_id': groupId,
              'author_id': userId,
              'author_display_name': displayName,
              'content': content.trim(),
            }));
  }

  Future<void> deletePrayer(String requestId) async {
    await withExpiredJwtRetry(() => supabase
        .from('devotion_group_prayer_requests')
        .delete()
        .eq('id', requestId));
  }

  Future<void> setSharedReading({
    required String groupId,
    required String? book,
    required List<int> chapters,
    required int? days,
  }) async {
    await withExpiredJwtRetry(() => supabase.rpc(
          'set_devotion_group_shared_reading',
          params: {
            'target_group_id': groupId,
            'reading_book_input': book,
            'selected_chapters_input': chapters,
            'target_days_input': days,
          },
        ));
  }

  Future<void> remindPending(String groupId) async {
    await withExpiredJwtRetry(
        () => supabase.functions.invoke('send-devotion-group-reminders', body: {
              'groupId': groupId,
              'message': 'لسه فاضل تسجّل خلوتك النهاردة. مستنيينك في المجموعة.',
            }));
  }

  Future<void> setRole({
    required String groupId,
    required String userId,
    required String role,
  }) async {
    await withExpiredJwtRetry(() => supabase.rpc(
          'set_devotion_group_member_role',
          params: {
            'target_group_id': groupId,
            'target_user_id': userId,
            'target_role': role,
          },
        ));
  }
}

String groupRoleLabel(String role) {
  return switch (role) {
    'owner' => 'قائد',
    'leader' => 'مشرف',
    _ => 'عضو',
  };
}
