import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/features/memorization/arabic_answer.dart';

void main() {
  test('Arabic diacritics and variant letters are normalized', () {
    expect(normalizeArabicAnswer('إِنَّ حَيَاةَ'), normalizeArabicAnswer('ان حياه'));
  });
  test('word blanks split on spaces and newlines', () {
    expect(verseWords('١ في البدء\nخلق الله'), ['في', 'البدء', 'خلق', 'الله']);
  });
  test('normalization preserves different answers', () {
    expect(normalizeArabicAnswer('نور'), isNot(normalizeArabicAnswer('نار')));
  });
}
