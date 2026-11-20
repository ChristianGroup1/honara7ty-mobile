import '../../core/supabase_service.dart';

const supportStatuses = [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
];

String supportStatusLabel(String status) => switch (status) {
      'open' => 'وصلت',
      'in_progress' => 'بنشتغل عليها',
      'waiting' => 'مستنيين ردك',
      'resolved' => 'اتحلت',
      'closed' => 'اتقفلت',
      _ => 'وصلت',
    };

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.subject,
    required this.status,
    required this.source,
    required this.updatedAt,
    this.contactEmail,
  });

  final String id;
  final String subject;
  final String status;
  final String source;
  final DateTime updatedAt;
  final String? contactEmail;

  bool get isClosed => status == 'closed';

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id'].toString(),
      subject: json['subject']?.toString() ?? '',
      status: json['status']?.toString() ?? 'open',
      source: json['source']?.toString() ?? 'app',
      contactEmail: json['contact_email']?.toString(),
      updatedAt: DateTime.tryParse(json['updated_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class SupportMessage {
  const SupportMessage({
    required this.id,
    required this.body,
    required this.createdAt,
    this.authorId,
  });

  final String id;
  final String? authorId;
  final String body;
  final DateTime createdAt;

  factory SupportMessage.fromJson(Map<String, dynamic> json) {
    return SupportMessage(
      id: json['id'].toString(),
      authorId: json['author_id']?.toString(),
      body: json['body']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class SupportService {
  const SupportService();

  Future<void> claimOwnReports() async {
    await supabase.rpc('claim_support_tickets');
  }

  Future<List<SupportTicket>> listMine() async {
    await claimOwnReports();
    final rows = await supabase
        .from('support_tickets')
        .select('id, subject, status, source, contact_email, updated_at')
        .order('updated_at', ascending: false);
    return [
      for (final row in rows as List)
        SupportTicket.fromJson(Map<String, dynamic>.from(row as Map)),
    ];
  }

  Future<SupportTicket?> ticket(String id) async {
    final row = await supabase
        .from('support_tickets')
        .select('id, subject, status, source, contact_email, updated_at')
        .eq('id', id)
        .maybeSingle();
    if (row == null) return null;
    return SupportTicket.fromJson(row);
  }

  Future<List<SupportMessage>> messages(String ticketId) async {
    final rows = await supabase
        .from('support_messages')
        .select('id, author_id, body, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at');
    return [
      for (final row in rows as List)
        SupportMessage.fromJson(Map<String, dynamic>.from(row as Map)),
    ];
  }

  Future<String> openTicket({
    required String subject,
    required String message,
  }) async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      throw StateError('missing user');
    }
    final created = await supabase
        .from('support_tickets')
        .insert({
          'user_id': user.id,
          'contact_email': user.email,
          'subject': subject.trim(),
          'status': 'open',
          'source': 'app',
        })
        .select('id')
        .single();
    final id = created['id'].toString();
    await supabase.from('support_messages').insert({
      'ticket_id': id,
      'author_id': user.id,
      'body': message.trim(),
    });
    return id;
  }

  Future<void> reply({
    required String ticketId,
    required String message,
  }) async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      throw StateError('missing user');
    }
    await supabase.from('support_messages').insert({
      'ticket_id': ticketId,
      'author_id': user.id,
      'body': message.trim(),
    });
  }

  Future<void> reportLoginProblem({
    required String email,
    required String message,
  }) async {
    await supabase.rpc('submit_login_report', params: {
      'p_email': email.trim(),
      'p_message': message.trim(),
    });
  }
}
