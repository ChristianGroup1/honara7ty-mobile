import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:pointycastle/export.dart';

const _secret =
    'a3f8c2e1b7d94f0e5a2c8b3d1e6f9071829374a5b6c7d8e9f0a1b2c3d4e5f6a7';
const _prefix = 'enc:';
final _keys = <String, Uint8List>{};

Uint8List deriveKey(String userId) {
  final cached = _keys[userId];
  if (cached != null) return cached;
  final master = _hexToBytes(_secret);
  final raw = utf8.encode(userId);
  final idBlock = Uint8List(16);
  for (var i = 0; i < 16 && i < raw.length; i++) {
    idBlock[i] = raw[i];
  }
  final key = Uint8List(32)
    ..setRange(0, 16, _ecb(master.sublist(0, 16), idBlock))
    ..setRange(16, 32, _ecb(master.sublist(16, 32), idBlock));
  _keys[userId] = key;
  return key;
}

bool isEncrypted(String value) => value.startsWith(_prefix);

String encryptText(String plaintext, Uint8List key) {
  final iv = Uint8List(16);
  final random = Random.secure();
  for (var i = 0; i < iv.length; i++) {
    iv[i] = random.nextInt(256);
  }
  return _encryptWithIv(plaintext, key, iv);
}

String decryptText(String value, Uint8List key) {
  if (!value.startsWith(_prefix)) return value;
  try {
    final body = value.substring(_prefix.length);
    final split = body.indexOf(':');
    if (split != 32) return '';
    final iv = _hexToBytes(body.substring(0, 32));
    final cipher = _hexToBytes(body.substring(33));
    if (cipher.isEmpty) return '';
    return utf8.decode(_ctr(key, iv, cipher));
  } catch (_) {
    return '';
  }
}

String _encryptWithIv(String plaintext, Uint8List key, Uint8List iv) {
  final encrypted = _ctr(key, iv, Uint8List.fromList(utf8.encode(plaintext)));
  return '$_prefix${_bytesToHex(iv)}:${_bytesToHex(encrypted)}';
}

Uint8List _ecb(Uint8List key, Uint8List block) {
  final cipher = ECBBlockCipher(AESEngine())..init(true, KeyParameter(key));
  final out = Uint8List(16);
  cipher.processBlock(block, 0, out, 0);
  return out;
}

Uint8List _ctr(Uint8List key, Uint8List iv, Uint8List data) {
  final cipher = SICStreamCipher(AESEngine())
    ..init(false, ParametersWithIV(KeyParameter(key), iv));
  return cipher.process(data);
}

Uint8List _hexToBytes(String hex) {
  final out = Uint8List(hex.length ~/ 2);
  for (var i = 0; i < out.length; i++) {
    out[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return out;
}

String _bytesToHex(Uint8List bytes) =>
    bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();

/// Used by tests to confirm compatibility with the original AES-CTR format.
String encryptTextWithIv(String plaintext, Uint8List key, Uint8List iv) =>
    _encryptWithIv(plaintext, key, iv);
