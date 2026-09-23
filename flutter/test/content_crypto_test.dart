import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:honara7ty/core/content_crypto.dart';
import 'package:honara7ty/core/deep_links.dart';

void main() {
  test('decrypts the original AES-CTR format', () {
    const userId = '11111111-2222-3333-4444-555555555555';
    const cipher = 'enc:00112233445566778899aabbccddeeff:d7423af3dc7b81ae';
    expect(decryptText(cipher, deriveKey(userId)), 'سلام');
  });

  test('round-trips plaintext and leaves legacy text readable', () {
    final key = deriveKey('user-1');
    final encrypted = encryptText('ملاحظة', key);
    expect(isEncrypted(encrypted), isTrue);
    expect(decryptText(encrypted, key), 'ملاحظة');
    expect(decryptText('نص قديم', key), 'نص قديم');
  });

  test('known iv matches the original ciphertext', () {
    final iv = Uint8List.fromList([
      0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
      0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
    ]);
    expect(
      encryptTextWithIv('سلام', deriveKey('11111111-2222-3333-4444-555555555555'), iv),
      'enc:00112233445566778899aabbccddeeff:d7423af3dc7b81ae',
    );
  });

  test('deep links recognize invite, recovery, and auth callbacks', () {
    expect(
      DeepLinks.inviteCodeFromUri(
        Uri.parse('honara7ty://devotion-group-invite?code=ABC%20123'),
      ),
      'ABC123',
    );
    expect(
      DeepLinks.inviteCodeFromUri(
        Uri.parse('https://honara7ty.space/devotion-group-invite?code=ZX9'),
      ),
      'ZX9',
    );
    expect(DeepLinks.isResetPassword(Uri.parse('honara7ty://reset-password?code=abc')), isTrue);
    expect(DeepLinks.isAuthCallback(Uri.parse('honara7ty://auth-callback?code=abc')), isTrue);
    expect(DeepLinks.inviteCodeFromUri(Uri.parse('https://example.com/devotion-group-invite?code=no')), isNull);
  });
}
