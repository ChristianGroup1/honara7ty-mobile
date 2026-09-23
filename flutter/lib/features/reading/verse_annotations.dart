import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class VerseAnnotation {
  const VerseAnnotation({this.highlight, this.favorite = false, this.note});

  final String? highlight;
  final bool favorite;
  final String? note;

  bool get isEmpty => highlight == null && !favorite && (note == null || note!.isEmpty);

  VerseAnnotation copyWith({
    String? highlight,
    bool? favorite,
    String? note,
    bool clearHighlight = false,
    bool clearNote = false,
  }) =>
      VerseAnnotation(
        highlight: clearHighlight ? null : highlight ?? this.highlight,
        favorite: favorite ?? this.favorite,
        note: clearNote ? null : note ?? this.note,
      );

  Map<String, dynamic> toJson() => {
        'highlight': highlight,
        'favorite': favorite,
        'note': note,
      };

  factory VerseAnnotation.fromJson(Map<String, dynamic> json) => VerseAnnotation(
        highlight: json['highlight'] as String?,
        favorite: json['favorite'] == true,
        note: json['note'] as String?,
      );
}

class VerseAnnotationStore {
  static const _key = 'honara7ty:bible-reader:annotations';

  Future<Map<String, VerseAnnotation>> load() async {
    final raw = (await SharedPreferences.getInstance()).getString(_key);
    if (raw == null) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return {
      for (final entry in decoded.entries)
        entry.key: VerseAnnotation.fromJson(
          Map<String, dynamic>.from(entry.value as Map),
        )
    };
  }

  Future<void> save(Map<String, VerseAnnotation> annotations) async {
    final kept = {
      for (final entry in annotations.entries)
        if (!entry.value.isEmpty) entry.key: entry.value.toJson()
    };
    await (await SharedPreferences.getInstance())
        .setString(_key, jsonEncode(kept));
  }
}
