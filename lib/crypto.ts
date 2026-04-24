import * as aesjs from 'aes-js';

// Salt mixed into the key derivation. Changing this salt invalidates all
// previously-encrypted rows, so treat it as immutable once deployed.
const APP_CONTENT_SALT = 'honara7ty_content_v1';

/**
 * Derives a stable 32-byte AES-256 key from the given userId.
 * The algorithm folds the UTF-8 bytes of (salt + userId) into a 32-byte
 * array using XOR, so the result is deterministic and requires no async I/O.
 */
export function deriveKey(userId: string): number[] {
  const source = APP_CONTENT_SALT + userId;
  const sourceBytes = aesjs.utils.utf8.toBytes(source);
  const key = new Array<number>(32).fill(0);
  for (let i = 0; i < sourceBytes.length; i++) {
    // eslint-disable-next-line no-bitwise
    key[i % 32] ^= sourceBytes[i];
  }
  return key;
}

/**
 * Fills `output` with `length` random bytes.
 * Prefers `crypto.getRandomValues` (available via the react-native-get-random-values
 * polyfill) and falls back to Math.random() in environments where the polyfill
 * has not been loaded (e.g. Jest).
 */
function fillRandomBytes(output: Uint8Array): void {
  const globalCrypto = (globalThis as Record<string, unknown>).crypto as
    | { getRandomValues?: (buf: Uint8Array) => void }
    | undefined;
  if (typeof globalCrypto?.getRandomValues === 'function') {
    globalCrypto.getRandomValues(output);
  } else {
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.floor(Math.random() * 256);
    }
  }
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
 */
export function decryptContent(stored: string, userId: string): string {
  if (!stored.startsWith('enc:')) {
    return stored;
  }

  const parts = stored.split(':');
  // Expected format: enc:<nonceHex>:<cipherHex>
  if (parts.length !== 3) {
    return stored;
  }

  try {
    const key = deriveKey(userId);
    const nonce = aesjs.utils.hex.toBytes(parts[1]);
    const cipherBytes = aesjs.utils.hex.toBytes(parts[2]);

    const counter = new aesjs.Counter(nonce);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);
    const plainBytes = aesCtr.decrypt(cipherBytes);
    return aesjs.utils.utf8.fromBytes(plainBytes);
  } catch {
    // If decryption fails for any reason return the raw stored value so the
    // UI at least renders something rather than crashing.
    return stored;
  }
}
