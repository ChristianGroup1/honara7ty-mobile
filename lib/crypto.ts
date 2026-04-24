import * as aesjs from 'aes-js';

// Salt mixed into the key derivation. Changing this salt invalidates all
// previously-encrypted rows, so treat it as immutable once deployed.
// The value encodes the app name ("honara7ty") and a schema version.
const APP_CONTENT_SALT = 'honara7ty_content_v1';

/**
 * Derives a stable 32-byte AES-256 key from the given userId.
 *
 * The algorithm has two steps:
 *   1. XOR-fold the UTF-8 bytes of (salt + userId) into a 32-byte
 *      "preliminary key".  Because the userId is a UUID v4 (128 bits of
 *      entropy) this already has good key material.
 *   2. Use the AES block cipher as a PRF: encrypt two distinct 16-byte blocks
 *      with the preliminary key and concatenate the outputs.  This step
 *      makes the final key computationally indistinguishable from random
 *      even if the XOR fold produced a biased distribution.
 *
 * The result is deterministic (no async I/O required) and per-user
 * (different key for each userId).
 */
export function deriveKey(userId: string): number[] {
  const source = APP_CONTENT_SALT + userId;
  const sourceBytes = aesjs.utils.utf8.toBytes(source);

  // Step 1 — XOR fold into a 32-byte preliminary key
  const prelimKey = new Array<number>(32).fill(0);
  for (let i = 0; i < sourceBytes.length; i++) {
    // eslint-disable-next-line no-bitwise
    prelimKey[i % 32] ^= sourceBytes[i];
  }

  // Step 2 — Use AES as a PRF to produce the final key
  const aes = new aesjs.AES(prelimKey);
  const block0 = new Array<number>(16).fill(0x00);
  const block1 = new Array<number>(16).fill(0x01);
  return [
    ...Array.from(aes.encrypt(block0) as Uint8Array),
    ...Array.from(aes.encrypt(block1) as Uint8Array),
  ];
}

/**
 * Fills `output` with cryptographically random bytes.
 * Requires the react-native-get-random-values polyfill to be loaded before
 * any calls to encryptContent (import 'react-native-get-random-values' at the
 * app entry point).  Throws if getRandomValues is unavailable so that callers
 * discover the missing polyfill immediately rather than silently using an
 * insecure fallback.
 */
function fillRandomBytes(output: Uint8Array): void {
  const globalCrypto = (globalThis as Record<string, unknown>).crypto as
    | { getRandomValues?: (buf: Uint8Array) => void }
    | undefined;
  if (typeof globalCrypto?.getRandomValues === 'function') {
    globalCrypto.getRandomValues(output);
    return;
  }
  throw new Error(
    'crypto.getRandomValues is not available. ' +
      "Import 'react-native-get-random-values' before calling encryptContent.",
  );
}

/**
 * Encrypts `plaintext` with AES-256-CTR using a key derived from `userId`.
 * Returns a tagged string in the format:
 *   enc:<nonce_hex>:<ciphertext_hex>
 * The 16-byte nonce is randomly generated for each call so that two identical
 * plaintexts produce different ciphertexts.
 */
export function encryptContent(plaintext: string, userId: string): string {
  const key = deriveKey(userId);
  const nonce = new Uint8Array(16);
  fillRandomBytes(nonce);

  const counter = new aesjs.Counter(nonce);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);
  const plainBytes = aesjs.utils.utf8.toBytes(plaintext);
  const cipherBytes = aesCtr.encrypt(plainBytes);

  const nonceHex = aesjs.utils.hex.fromBytes(Array.from(nonce));
  const cipherHex = aesjs.utils.hex.fromBytes(cipherBytes);
  return `enc:${nonceHex}:${cipherHex}`;
}

/**
 * Decrypts a value that was previously encrypted by `encryptContent`.
 * If `stored` does not begin with the "enc:" prefix it is returned unchanged,
 * allowing seamless backward-compatibility with rows that were written before
 * encryption was introduced.
 * Returns an empty string on decryption failure so that the UI never shows
 * raw encrypted bytes to the user.
 */
export function decryptContent(stored: string, userId: string): string {
  if (!stored.startsWith('enc:')) {
    return stored;
  }

  const parts = stored.split(':');
  // Expected format: enc:<nonceHex>:<cipherHex>
  if (parts.length !== 3) {
    return '';
  }

  try {
    const key = deriveKey(userId);
    const nonce = aesjs.utils.hex.toBytes(parts[1]);
    const cipherBytes = aesjs.utils.hex.toBytes(parts[2]);

    const counter = new aesjs.Counter(nonce);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);
    const plainBytes = aesCtr.decrypt(cipherBytes);
    return aesjs.utils.utf8.fromBytes(plainBytes);
  } catch (err) {
    if (__DEV__) {
      console.warn('[crypto] decryptContent failed:', err);
    }
    return '';
  }
}
