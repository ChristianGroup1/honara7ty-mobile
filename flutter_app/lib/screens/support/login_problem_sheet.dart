import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../features/support/support_service.dart';

Future<void> showLoginProblemSheet(BuildContext context, {String email = ''}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _LoginProblemSheet(email: email),
  );
}

class _LoginProblemSheet extends StatefulWidget {
  const _LoginProblemSheet({required this.email});

  final String email;

  @override
  State<_LoginProblemSheet> createState() => _LoginProblemSheetState();
}

class _LoginProblemSheetState extends State<_LoginProblemSheet> {
  late final TextEditingController _email = TextEditingController(text: widget.email);
  final _message = TextEditingController();
  final _service = const SupportService();
  var _sending = false;
  String? _error;

  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  );

  @override
  void dispose() {
    _email.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final email = _email.text.trim();
    final message = _message.text.trim();
    if (!_emailRegex.hasMatch(email)) {
      setState(() => _error = 'اكتب البريد الإلكتروني اللي بتحاول تدخل بيه.');
      return;
    }
    if (message.length < 8) {
      setState(() => _error = 'اكتب المشكلة في جملة واضحة.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await _service.reportLoginProblem(email: email, message: message);
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'وصلنا البلاغ. لما تدخل بنفس الإيميل، هتلاقي التذكرة في المزيد.',
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = 'الإرسال متعطل دلوقتي. جرّب تاني.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(AppRadius.xxl),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'أبلغ عن مشكلة',
                style: _font(18, Colors.white, FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                'اكتب اللي حصل وأنت بتحاول تدخل. هنرد على التذكرة بعد ما تسجّل دخول بنفس الإيميل.',
                style: _font(12, const Color(0xFF94A3B8), FontWeight.w600),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                style: _font(14, Colors.white, FontWeight.w700),
                decoration: const InputDecoration(
                  labelText: 'البريد الإلكتروني',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                ),
              ),
              TextField(
                controller: _message,
                minLines: 4,
                maxLines: 6,
                maxLength: 2000,
                style: _font(14, Colors.white, FontWeight.w600),
                decoration: const InputDecoration(
                  labelText: 'المشكلة',
                  alignLabelWithHint: true,
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
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
                  backgroundColor: const Color(0xFF0284C7),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(
                  _sending ? 'بنبعت...' : 'إرسال البلاغ',
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

TextStyle _font(double size, Color color, FontWeight weight) {
  return TextStyle(
    fontFamily: AppFonts.ui,
    fontSize: size,
    color: color,
    fontWeight: weight,
  );
}
