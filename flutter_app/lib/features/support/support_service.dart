import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/offline_sync.dart';
import '../../core/remote_timeout.dart';
import '../../core/supabase_service.dart';

const supportStatuses = [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
];

const _cacheKey = 'support_cache_v1';

String supportStatusLabel(String status) => switch (status) {
      'open' => 'وصلت',
      'in_progress' => 'بنشتغل عليها',
      'waiting' => 'مستنيين ردك',
      'resolved' => 'اتحلت',
      'closed' => 'اتقفلت',
      _ => 'وصلت',
    };

class SupportSave {
  const SupportSave({required this.id, required this.queued});

  final String id;
  final bool queued;
}

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.subject,
    required this.status,
    required this.source,
    required this.updatedAt,
    this.contactEmail,
    this.pending = false,
  });

  final String id;
  final String subject;
  final String status;
  final String source;
  final DateTime updatedAt;
  final String? contactEmail;
  final bool pending;

  bool get isClosed => status == 'closed';

  SupportTicket copyWith({bool? pending, String? status, DateTime? updatedAt}) {
    return SupportTicket(
      id: id,
      subject: subject,
      status: status ?? this.status,
      source: source,
      updatedAt: updatedAt ?? this.updatedAt,
      contactEmail: contactEmail,
      pending: pending ?? this.pending,
    );
  }

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id'].toString(),
      subject: json['subject']?.toString() ?? '',
      status: json['status']?.toString() ?? 'open',
      source: json['source']?.toString() ?? 'app',
      contactEmail: json['contact_email']?.toString(),
      updatedAt: DateTime.tryParse(json['updated_at']?.toString() ?? '') ??
          DateTime.now(),
      pending: json['pending'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'subject': subject,
        'status': status,
        'source': source,
        'contact_email': contactEmail,
        'updated_at': updatedAt.toIso8601String(),
        'pending': pending,
      };
}

class SupportMessage {
  const SupportMessage({
    required this.id,
    required this.body,
    required this.createdAt,
    this.authorId,
    this.pending = false,
  });

  final String id;
  final String? authorId;
  final String body;
  final DateTime createdAt;
  final bool pending;

  factory SupportMessage.fromJson(Map<String, dynamic> json) {
    return SupportMessage(
      id: json['id'].toString(),
      authorId: json['author_id']?.toString(),
      body: json['body']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.now(),
      pending: json['pending'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'author_id': authorId,
        'body': body,
        'created_at': createdAt.toIso8601String(),
        'pending': pending,
      };
}

class SupportService {
  const SupportService();

  Future<List<SupportTicket>> listMine() async {
    final local = await _ticketsForCurrentUser();
    final remote = await tryRemote(() async {
      await supabase.rpc('claim_support_tickets');
      final rows = await supabase
          .from('support_tickets')
          .select('id, subject, status, source, contact_email, updated_at')
          .order('updated_at', ascending: false);
      return [
        for (final row in rows as List)
          SupportTicket.fromJson(Map<String, dynamic>.from(row as Map)),
      ];
    });
    if (remote == null) return local;
    final merged = _mergeTickets(remote, local);
    await _writeUserTickets(merged);
    return merged;
  }

  Future<SupportTicket?> ticket(String id) async {
    final local = await _ticketById(id);
    final remote = await tryRemote(() async {
      final row = await supabase
          .from('support_tickets')
          .select('id, subject, status, source, contact_email, updated_at')
          .eq('id', id)
          .maybeSingle();
      if (row == null) return null;
      return SupportTicket.fromJson(row);
    });
    return remote ?? local;
  }

  Future<List<SupportMessage>> messages(String ticketId) async {
    final local = await _messages(ticketId);
    final remote = await tryRemote(() async {
      final rows = await supabase
          .from('support_messages')
          .select('id, author_id, body, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at');
      return [
        for (final row in rows as List)
          SupportMessage.fromJson(Map<String, dynamic>.from(row as Map)),
      ];
    });
    if (remote == null) return local;
    final merged = _mergeMessages(remote, local);
    await _writeMessages(ticketId, merged);
    return merged;
  }

  Future<SupportSave> openTicket({
    required String subject,
    required String message,
  }) async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      throw StateError('missing user');
    }
    final now = DateTime.now();
    final ticketId = _newId();
    final messageId = _newId();
    final ticket = SupportTicket(
      id: ticketId,
      subject: subject.trim(),
      status: 'open',
      source: 'app',
      contactEmail: user.email,
      updatedAt: now,
      pending: true,
    );
    final note = SupportMessage(
      id: messageId,
      authorId: user.id,
      body: message.trim(),
      createdAt: now,
      pending: true,
    );
    await _upsertTicket(ticket);
    await _upsertMessage(ticketId, note);
    final sent = await tryRemote(() async {
      await supabase.from('support_tickets').insert({
        'id': ticketId,
        'user_id': user.id,
        'contact_email': user.email,
        'subject': ticket.subject,
        'status': 'open',
        'source': 'app',
      });
      await supabase.from('support_messages').insert({
        'id': messageId,
        'ticket_id': ticketId,
        'author_id': user.id,
        'body': note.body,
      });
      return true;
    });
    if (sent == null) {
      await OfflineSync.queueSupportTicket(
        userId: user.id,
        ticketId: ticketId,
        messageId: messageId,
        subject: ticket.subject,
        email: user.email,
        body: note.body,
      );
      return SupportSave(id: ticketId, queued: true);
    }
    await _upsertTicket(ticket.copyWith(pending: false));
    await _upsertMessage(ticketId, SupportMessage(
      id: note.id,
      authorId: note.authorId,
      body: note.body,
      createdAt: note.createdAt,
    ));
    return SupportSave(id: ticketId, queued: false);
  }

  Future<SupportSave> reply({
    required String ticketId,
    required String message,
  }) async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      throw StateError('missing user');
    }
    final note = SupportMessage(
      id: _newId(),
      authorId: user.id,
      body: message.trim(),
      createdAt: DateTime.now(),
      pending: true,
    );
    await _upsertMessage(ticketId, note);
    final sent = await tryRemote(() async {
      await supabase.from('support_messages').insert({
        'id': note.id,
        'ticket_id': ticketId,
        'author_id': user.id,
        'body': note.body,
      });
      return true;
    });
    if (sent == null) {
      await OfflineSync.queueSupportMessage(
        userId: user.id,
        ticketId: ticketId,
        messageId: note.id,
        body: note.body,
      );
      return SupportSave(id: note.id, queued: true);
    }
    await _upsertMessage(
      ticketId,
      SupportMessage(
        id: note.id,
        authorId: note.authorId,
        body: note.body,
        createdAt: note.createdAt,
      ),
    );
    return SupportSave(id: note.id, queued: false);
  }

  Future<SupportSave> reportLoginProblem({
    required String email,
    required String message,
  }) async {
    final reportId = _newId();
    final cleanEmail = email.trim();
    final cleanMessage = message.trim();
    await _rememberLoginReport(
      id: reportId,
      email: cleanEmail,
      message: cleanMessage,
      pending: true,
    );
    final sent = await tryRemote(() async {
      await supabase.rpc('submit_login_report', params: {
        'p_email': cleanEmail,
        'p_message': cleanMessage,
        'p_id': reportId,
      });
      return true;
    });
    if (sent == null) {
      await OfflineSync.queueLoginReport(
        reportId: reportId,
        email: cleanEmail,
        body: cleanMessage,
      );
      return SupportSave(id: reportId, queued: true);
    }
    await _rememberLoginReport(
      id: reportId,
      email: cleanEmail,
      message: cleanMessage,
      pending: false,
    );
    return SupportSave(id: reportId, queued: false);
  }

  Future<List<SupportTicket>> _ticketsForCurrentUser() async {
    final user = supabase.auth.currentUser;
    if (user == null) return [];
    final cache = await _readCache();
    final stored = _ticketList(cache, user.id);
    final email = user.email?.toLowerCase();
    final reports = _loginReports(cache).where((report) {
      return report['pending'] == true &&
          email != null &&
          report['email']?.toString().toLowerCase() == email;
    });
    final reportTickets = [
      for (final report in reports)
        SupportTicket(
          id: report['id'].toString(),
          subject: 'مشكلة في تسجيل الدخول',
          status: 'open',
          source: 'login',
          contactEmail: report['email']?.toString(),
          updatedAt: DateTime.tryParse(report['created_at']?.toString() ?? '') ??
              DateTime.now(),
          pending: true,
        ),
    ];
    return _mergeTickets(stored, reportTickets);
  }

  Future<SupportTicket?> _ticketById(String id) async {
    final tickets = await _ticketsForCurrentUser();
    for (final ticket in tickets) {
      if (ticket.id == id) return ticket;
    }
    return null;
  }

  Future<void> _upsertTicket(SupportTicket ticket) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    final cache = await _readCache();
    final tickets = _ticketList(cache, userId);
    final next = [
      ticket,
      for (final item in tickets)
        if (item.id != ticket.id) item,
    ];
    _ticketBucket(cache)[userId] = [for (final item in next) item.toJson()];
    await _writeCache(cache);
  }

  Future<void> _writeUserTickets(List<SupportTicket> tickets) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    final cache = await _readCache();
    _ticketBucket(cache)[userId] = [for (final item in tickets) item.toJson()];
    await _writeCache(cache);
  }

  Future<List<SupportMessage>> _messages(String ticketId) async {
    final cache = await _readCache();
    final raw = _messageBucket(cache)[ticketId];
    if (raw is List && raw.isNotEmpty) {
      return [
        for (final item in raw)
          SupportMessage.fromJson(Map<String, dynamic>.from(item as Map)),
      ];
    }
    for (final report in _loginReports(cache)) {
      if (report['id']?.toString() != ticketId) continue;
      return [
        SupportMessage(
          id: ticketId,
          body: report['message']?.toString() ?? '',
          createdAt: DateTime.tryParse(report['created_at']?.toString() ?? '') ??
              DateTime.now(),
          pending: report['pending'] == true,
        ),
      ];
    }
    return [];
  }

  Future<void> _upsertMessage(String ticketId, SupportMessage message) async {
    final cache = await _readCache();
    final current = await _messages(ticketId);
    final next = [
      for (final item in current)
        if (item.id != message.id) item,
      message,
    ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    _messageBucket(cache)[ticketId] = [for (final item in next) item.toJson()];
    await _writeCache(cache);
  }

  Future<void> _writeMessages(String ticketId, List<SupportMessage> messages) async {
    final cache = await _readCache();
    _messageBucket(cache)[ticketId] = [for (final item in messages) item.toJson()];
    await _writeCache(cache);
  }

  Future<void> _rememberLoginReport({
    required String id,
    required String email,
    required String message,
    required bool pending,
  }) async {
    final cache = await _readCache();
    final reports = _loginReports(cache).where((item) => item['id'] != id).toList();
    reports.add({
      'id': id,
      'email': email,
      'message': message,
      'created_at': DateTime.now().toIso8601String(),
      'pending': pending,
    });
    cache['loginReports'] = reports;
    await _writeCache(cache);
    if (supabase.auth.currentUser != null) {
      await _upsertTicket(SupportTicket(
        id: id,
        subject: 'مشكلة في تسجيل الدخول',
        status: 'open',
        source: 'login',
        contactEmail: email,
        updatedAt: DateTime.now(),
        pending: pending,
      ));
      await _upsertMessage(
        id,
        SupportMessage(
          id: id,
          body: message,
          createdAt: DateTime.now(),
          pending: pending,
        ),
      );
    }
  }

  List<SupportTicket> _mergeTickets(
    List<SupportTicket> primary,
    List<SupportTicket> extra,
  ) {
    final byId = {for (final ticket in primary) ticket.id: ticket};
    for (final ticket in extra) {
      byId.putIfAbsent(ticket.id, () => ticket);
    }
    final merged = byId.values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return merged;
  }

  List<SupportMessage> _mergeMessages(
    List<SupportMessage> remote,
    List<SupportMessage> local,
  ) {
    final ids = remote.map((message) => message.id).toSet();
    final merged = [
      ...remote,
      for (final message in local)
        if (message.pending && !ids.contains(message.id)) message,
    ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return merged;
  }

  List<SupportTicket> _ticketList(Map<String, dynamic> cache, String userId) {
    final raw = _ticketBucket(cache)[userId];
    if (raw is! List) return [];
    return [
      for (final item in raw)
        SupportTicket.fromJson(Map<String, dynamic>.from(item as Map)),
    ];
  }

  Map<String, dynamic> _ticketBucket(Map<String, dynamic> cache) {
    final bucket = cache['tickets'];
    if (bucket is Map<String, dynamic>) return bucket;
    final created = <String, dynamic>{};
    cache['tickets'] = created;
    return created;
  }

  Map<String, dynamic> _messageBucket(Map<String, dynamic> cache) {
    final bucket = cache['messages'];
    if (bucket is Map<String, dynamic>) return bucket;
    final created = <String, dynamic>{};
    cache['messages'] = created;
    return created;
  }

  List<Map<String, dynamic>> _loginReports(Map<String, dynamic> cache) {
    final raw = cache['loginReports'];
    if (raw is! List) return [];
    return [
      for (final item in raw) Map<String, dynamic>.from(item as Map),
    ];
  }

  Future<Map<String, dynamic>> _readCache() async {
    try {
      final raw = (await SharedPreferences.getInstance()).getString(_cacheKey);
      if (raw == null) return {};
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {}
    return {};
  }

  Future<void> _writeCache(Map<String, dynamic> cache) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(cache));
    } catch (_) {}
  }

  String _newId() {
    final bytes = List<int>.generate(16, (_) => Random.secure().nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }
}
