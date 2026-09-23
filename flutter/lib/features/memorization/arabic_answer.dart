String stripVerseNumber(String text) =>
    text.replaceFirst(RegExp(r'^[٠-٩0-9]+\s+'), '');

List<String> verseWords(String text) => stripVerseNumber(text)
    .trim().split(RegExp(r'\s+')).where((word) => word.isNotEmpty).toList();

String normalizeArabicAnswer(String text) => stripVerseNumber(text)
    .replaceAll(RegExp(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]'), '')
    .replaceAll(RegExp(r'[أإآٱ]'), 'ا')
    .replaceAll('ى', 'ي').replaceAll('ة', 'ه')
    .replaceAll('ؤ', 'و').replaceAll('ئ', 'ي')
    .replaceAll(RegExp(r'[،.؟!:؛]'), '')
    .replaceAll(RegExp(r'\s+'), ' ').trim();
