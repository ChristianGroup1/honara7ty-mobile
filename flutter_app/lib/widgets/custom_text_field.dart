// ─── Shared: Custom Text Field ───────────────────────────────────────────────
// Mirrors components/shared/CustomInput.tsx

import 'package:flutter/material.dart';
import '../core/strings.dart';
import '../core/theme.dart';

class CustomTextField extends StatefulWidget {
  final String label;
  final String placeholder;
  final IconData icon;
  final bool isPassword;
  final TextInputType keyboardType;
  final String? errorText;
  final TextEditingController? controller;
  final void Function(String)? onChanged;
  final TextCapitalization textCapitalization;
  final bool optional;

  const CustomTextField({
    super.key,
    required this.label,
    required this.placeholder,
    required this.icon,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.errorText,
    this.controller,
    this.onChanged,
    this.textCapitalization = TextCapitalization.none,
    this.optional = false,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    // Email/password/phone keep LTR for typed values; Arabic placeholders stay RTL.
    final entryDirection = widget.isPassword ||
            widget.keyboardType == TextInputType.emailAddress ||
            widget.keyboardType == TextInputType.phone
        ? TextDirection.ltr
        : TextDirection.rtl;
    final error = widget.errorText?.isNotEmpty == true;
    final hasText = widget.controller?.text.isNotEmpty == true;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            textDirection: TextDirection.rtl,
            children: [
              Text(
                widget.label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: colors.onSurface,
                ),
              ),
              if (widget.optional) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.lightCardMuted,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    AppStrings.authOptional,
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.lightMutedText,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: widget.controller,
            onChanged: (value) {
              setState(() {});
              widget.onChanged?.call(value);
            },
            obscureText: widget.isPassword && _obscure,
            keyboardType: widget.keyboardType,
            textCapitalization: widget.textCapitalization,
            textDirection: hasText ? entryDirection : TextDirection.rtl,
            textAlign: TextAlign.right,
            autocorrect: false,
            style: TextStyle(color: colors.onSurface, fontSize: 15),
            cursorColor: AppColors.navy,
            decoration: InputDecoration(
              hintText: widget.placeholder,
              hintTextDirection: TextDirection.rtl,
              hintStyle: const TextStyle(
                color: AppColors.lightMutedText,
                fontSize: 14,
              ),
              prefixIcon:
                  Icon(widget.icon, color: AppColors.lightMutedText, size: 20),
              suffixIcon: widget.isPassword
                  ? Tooltip(
                      message: _obscure
                          ? AppStrings.authShowPassword
                          : AppStrings.authHidePassword,
                      child: IconButton(
                        icon: Icon(
                          _obscure ? Icons.visibility_off : Icons.visibility,
                          color: AppColors.lightMutedText,
                          size: 20,
                        ),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    )
                  : null,
              errorText: error ? widget.errorText : null,
              errorStyle: const TextStyle(
                color: AppColors.danger,
                fontSize: 12,
                height: 1.35,
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 15,
              ),
              border: _outline(const Color(0xFFE2E8F0)),
              enabledBorder: _outline(
                error ? AppColors.danger : const Color(0xFFE2E8F0),
                width: error ? 1.2 : 1,
              ),
              focusedBorder: _outline(const Color(0xFF0284C7), width: 1.6),
              errorBorder: _outline(AppColors.danger, width: 1.2),
              focusedErrorBorder: _outline(AppColors.danger, width: 1.6),
            ),
          ),
        ],
      ),
    );
  }

  OutlineInputBorder _outline(Color color, {double width = 1}) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: color, width: width),
      );
}
