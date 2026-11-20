import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/offline_sync.dart';
import '../../core/theme.dart';
import '../../features/support/support_service.dart';
import '../../routing/app_router.dart';

class SupportTicketsScreen extends StatefulWidget {
  const SupportTicketsScreen({super.key});

  @override
  State<SupportTicketsScreen> createState() => _SupportTicketsScreenState();
}

class _SupportTicketsScreenState extends State<SupportTicketsScreen> {
  final _service = const SupportService();
  List<SupportTicket> _tickets = [];
  var _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tickets = await _service.listMine();
      if (!mounted) return;
      setState(() {
        _tickets = tickets;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _openNew() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _NewTicketSheet(),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background = dark ? AppColors.darkBackground : const Color(0xFFF8FAFC);
    final card = dark ? AppColors.darkCard : Colors.white;
    final text = dark ? AppColors.darkText : AppColors.navy;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final border = dark ? AppColors.darkBorder : const Color(0xFFE2E8F0);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: background,
        appBar: AppBar(
          backgroundColor: card,
          foregroundColor: text,
          elevation: 0,
          title: Text('المساعدة', style: _font(18, text, FontWeight.w900)),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _openNew,
          backgroundColor: AppColors.steelDark,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.add_comment_outlined),
          label: Text('تذكرة جديدة', style: _font(14, Colors.white, FontWeight.w800)),
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 96),
                  children: [
                    if (_error != null)
                      Text(_error!, style: _font(14, AppColors.danger, FontWeight.w700)),
                    if (_error == null && _tickets.isEmpty)
                      _EmptyTickets(card: card, border: border, text: text, muted: muted),
                    for (final ticket in _tickets) ...[
                      Material(
                        color: card,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.xxl),
                          side: BorderSide(color: border),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(AppRadius.xxl),
                          onTap: () async {
                            await context.push('${Routes.supportTickets}/${ticket.id}');
                            if (mounted) _load();
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Expanded(
                                    child: Text(
                                      ticket.subject,
                                      style: _font(15, text, FontWeight.w900),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  _StatusChip(status: ticket.status),
                                ]),
                                const SizedBox(height: 8),
                                Text(
                                  ticket.pending
                                      ? 'هتتبعت لما النت يرجع'
                                      : _when(ticket.updatedAt),
                                  style: _font(12, muted, FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}

class _EmptyTickets extends StatelessWidget {
  const _EmptyTickets({
    required this.card,
    required this.border,
    required this.text,
    required this.muted,
  });

  final Color card;
  final Color border;
  final Color text;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('لسه مفيش تذاكر', style: _font(16, text, FontWeight.w900)),
          const SizedBox(height: 6),
          Text(
            'لو فيه مشكلة في التطبيق، افتح تذكرة وهنرد عليك هنا.',
            style: _font(13, muted, FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _NewTicketSheet extends StatefulWidget {
  const _NewTicketSheet();

  @override
  State<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends State<_NewTicketSheet> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  final _service = const SupportService();
  var _sending = false;
  String? _error;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final subject = _subject.text.trim();
    final message = _message.text.trim();
    if (subject.length < 3) {
      setState(() => _error = 'اكتب عنوان أقصر من سطر، وفيه ٣ حروف على الأقل.');
      return;
    }
    if (message.length < 8) {
      setState(() => _error = 'اكتب المشكلة بوضوح عشان نقدر نساعدك.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    try {
      final saved = await _service.openTicket(subject: subject, message: message);
      if (!mounted) return;
      Navigator.of(context).pop(true);
      if (saved.queued) {
        messenger.showSnackBar(const SnackBar(content: Text(offlineSavedMessage)));
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      messenger.showSnackBar(const SnackBar(content: Text(offlineSavedMessage)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final card = dark ? AppColors.darkCard : Colors.white;
    final text = dark ? AppColors.darkText : AppColors.navy;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
          decoration: BoxDecoration(
            color: card,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('تذكرة جديدة', style: _font(18, text, FontWeight.w900)),
              const SizedBox(height: 12),
              TextField(
                controller: _subject,
                maxLength: 120,
                style: _font(14, text, FontWeight.w700),
                decoration: const InputDecoration(
                  labelText: 'العنوان',
                  hintText: 'مثال: مش قادر أفتح الخلوة',
                ),
              ),
              TextField(
                controller: _message,
                minLines: 4,
                maxLines: 6,
                maxLength: 2000,
                style: _font(14, text, FontWeight.w600),
                decoration: const InputDecoration(
                  labelText: 'اكتب المشكلة',
                  alignLabelWithHint: true,
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: _font(12, AppColors.danger, FontWeight.w700)),
              ],
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _sending ? null : _send,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.steelDark,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(
                  _sending ? 'بنبعت...' : 'إرسال التذكرة',
                  style: _font(14, Colors.white, FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'resolved' => AppColors.success,
      'closed' => AppColors.lightMutedText,
      'waiting' => AppColors.warning,
      'in_progress' => AppColors.steelDark,
      _ => AppColors.steel,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        supportStatusLabel(status),
        style: _font(11, color, FontWeight.w800),
      ),
    );
  }
}

String _when(DateTime value) {
  final local = value.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$day/$month  $hour:$minute';
}

TextStyle _font(double size, Color color, [FontWeight weight = FontWeight.w600]) {
  return TextStyle(
    fontFamily: AppFonts.ui,
    fontSize: size,
    color: color,
    fontWeight: weight,
  );
}
