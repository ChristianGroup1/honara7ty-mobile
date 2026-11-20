import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_service.dart';
import '../../core/theme.dart';
import '../../features/support/support_service.dart';

class SupportTicketScreen extends StatefulWidget {
  const SupportTicketScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  State<SupportTicketScreen> createState() => _SupportTicketScreenState();
}

class _SupportTicketScreenState extends State<SupportTicketScreen> {
  final _service = const SupportService();
  final _reply = TextEditingController();
  final _scroll = ScrollController();
  SupportTicket? _ticket;
  List<SupportMessage> _messages = [];
  var _loading = true;
  var _sending = false;
  String? _error;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _load();
    _channel = supabase
        .channel('support-${widget.ticketId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'support_messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'ticket_id',
            value: widget.ticketId,
          ),
          callback: (_) => _load(silent: true),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'support_tickets',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: widget.ticketId,
          ),
          callback: (_) => _load(silent: true),
        )
        .subscribe();
  }

  @override
  void dispose() {
    final channel = _channel;
    if (channel != null) supabase.removeChannel(channel);
    _reply.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final ticket = await _service.ticket(widget.ticketId);
      final messages = await _service.messages(widget.ticketId);
      if (!mounted) return;
      setState(() {
        _ticket = ticket;
        _messages = messages;
        _loading = false;
      });
      _follow();
    } catch (_) {
      if (!mounted || silent) return;
      setState(() {
        _loading = false;
        _error = 'مش قادرين نفتح التذكرة.';
      });
    }
  }

  void _follow() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _reply.text.trim();
    if (text.isEmpty || _sending || _ticket?.isClosed == true) return;
    setState(() => _sending = true);
    try {
      await _service.reply(ticketId: widget.ticketId, message: text);
      _reply.clear();
      await _load(silent: true);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'الرسالة ماتبعَتش. جرّب تاني.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background = dark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final card = dark ? AppColors.darkCard : Colors.white;
    final text = dark ? AppColors.darkText : AppColors.navy;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final mineId = supabase.auth.currentUser?.id;
    final ticket = _ticket;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: background,
        appBar: AppBar(
          backgroundColor: card,
          foregroundColor: text,
          elevation: 0,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                ticket?.subject ?? 'التذكرة',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: _font(16, text, FontWeight.w900),
              ),
              if (ticket != null)
                Text(
                  supportStatusLabel(ticket.status),
                  style: _font(12, AppColors.steelDark, FontWeight.w800),
                ),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(_error!, style: _font(13, AppColors.danger, FontWeight.w700)),
                    ),
                  Expanded(
                    child: ListView(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                      children: [
                        for (final message in _messages)
                          _Bubble(
                            message: message,
                            mine: message.authorId == null || message.authorId == mineId,
                            text: text,
                            muted: muted,
                          ),
                      ],
                    ),
                  ),
                  if (ticket?.isClosed == true)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'التذكرة اتقفلت. لو المشكلة لسه موجودة، افتح تذكرة جديدة.',
                        style: _font(13, muted, FontWeight.w700),
                      ),
                    )
                  else
                    Material(
                      color: card,
                      child: SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _reply,
                                  minLines: 1,
                                  maxLines: 4,
                                  maxLength: 2000,
                                  style: _font(14, text, FontWeight.w600),
                                  decoration: const InputDecoration(
                                    hintText: 'اكتب رد',
                                    counterText: '',
                                    border: InputBorder.none,
                                  ),
                                  onSubmitted: (_) => _send(),
                                ),
                              ),
                              IconButton(
                                onPressed: _sending ? null : _send,
                                icon: Icon(
                                  Icons.send_rounded,
                                  color: _sending ? muted : AppColors.steelDark,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.message,
    required this.mine,
    required this.text,
    required this.muted,
  });

  final SupportMessage message;
  final bool mine;
  final Color text;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    final local = message.createdAt.toLocal();
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        constraints: const BoxConstraints(maxWidth: 320),
        decoration: BoxDecoration(
          color: mine ? AppColors.steelDark : AppColors.steelLight,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              mine ? 'أنت' : 'الدعم',
              style: _font(11, mine ? Colors.white70 : AppColors.steelDark, FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              message.body,
              style: _font(14, mine ? Colors.white : text, FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              '$hour:$minute',
              style: _font(10, mine ? Colors.white70 : muted, FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

TextStyle _font(double size, Color color, [FontWeight weight = FontWeight.w600]) {
  return TextStyle(
    fontFamily: AppFonts.ui,
    fontSize: size,
    color: color,
    fontWeight: weight,
  );
}
