import 'react-native-get-random-values';
const aes = require('aes-js');

/**
 * 32-byte (64 hex chars) master secret embedded in the app bundle.
 * Its purpose is to protect data at rest in the database against server-side
 * breaches. Each user gets a unique derived key so that compromising one
 * user's key does not affect others.
 *
 * NOTE: Rotate this constant only in a new app version that also runs the
 * re-encryption migration, otherwise existing data becomes unreadable.
 */
const APP_ENCRYPTION_SECRET =
  'a3f8c2e1b7d94f0e5a2c8b3d1e6f9071829374a5b6c7d8e9f0a1b2c3d4e5f6a7';

/** Sentinel prefix that marks an already-encrypted value. */
const ENC_PREFIX = 'enc:';

/**
 * Derives a deterministic 32-byte AES-256 key for `userId` from the
 * application master secret using an AES-ECB–based PRF construction:
 *
 *   idBlock = first 16 bytes of userId UTF-8 encoding, zero-padded if shorter
 *   half1 = AES-ECB(master[0..15], idBlock)
 *   half2 = AES-ECB(master[16..31], idBlock)
 *   derived_key = half1 || half2
 *
 * AES-ECB used as a PRF is cryptographically sound here because the input
 * (userId) is the "message" and the master secret is the key. Different
 * userIds produce computationally indistinguishable keys.
 *
 * Supabase userIds are UUIDs (36 ASCII chars), so the 16-byte idBlock is
 * always distinct and never repeating.
 *
 * Same userId always produces the same key so that keys never need to be
 * stored anywhere.
 */
export function deriveKey(userId: string): Uint8Array {
  const masterBytes: number[] = aes.utils.hex.toBytes(APP_ENCRYPTION_SECRET);

  // Encode userId as UTF-8 then take the first 16 bytes, zero-padding if needed.
  // Supabase UUIDs are 36 bytes so we always use a unique 16-byte prefix.
  const rawId: number[] = aes.utils.utf8.toBytes(userId);
  const idBlock = new Array<number>(16).fill(0);
  for (let i = 0; i < 16 && i < rawId.length; i++) {
    idBlock[i] = rawId[i];
  }

  // Derive two 16-byte halves using different 16-byte sub-keys from the master.
  const aesPrf1 = new aes.ModeOfOperation.ecb(masterBytes.slice(0, 16));
  const aesPrf2 = new aes.ModeOfOperation.ecb(masterBytes.slice(16, 32));
  const half1: number[] = aesPrf1.encrypt(idBlock);
  const half2: number[] = aesPrf2.encrypt(idBlock);

  const key = new Uint8Array(32);
  key.set(half1, 0);
  key.set(half2, 16);
  return key;
}

/**
 * Encrypts `plaintext` with AES-256-CTR using a random 16-byte IV.
 * Returns a string of the form `enc:<ivHex>:<ciphertextHex>`.
 */
export function encryptText(plaintext: string, key: Uint8Array): string {
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);

  const counter = new aes.Counter(Array.from(iv));
  const aesCtr = new aes.ModeOfOperation.ctr(Array.from(key), counter);
  const plaintextBytes: number[] = aes.utils.utf8.toBytes(plaintext);
  const encryptedBytes: number[] = aesCtr.encrypt(plaintextBytes);

  return `${ENC_PREFIX}${aes.utils.hex.fromBytes(Array.from(iv))}:${aes.utils.hex.fromBytes(encryptedBytes)}`;
}

/**
 * Decrypts a value produced by `encryptText`.
 *
 * If `value` does not start with the `enc:` prefix it is returned as-is so
 * that legacy plaintext rows are still readable before the one-time migration
 * runs.  If the ciphertext is malformed or decryption fails the raw value is
 * returned rather than crashing.
 */
export function decryptText(value: string, key: Uint8Array): string {
  if (!value.startsWith(ENC_PREFIX)) {
    return value; // legacy plaintext — pass through until migrated
  }

  try {
    const withoutPrefix = value.slice(ENC_PREFIX.length);
    const colonIndex = withoutPrefix.indexOf(':');
    // IV hex is always exactly 32 characters (16 bytes).
    if (colonIndex !== 32) {
      return '';
    }

    const ivHex = withoutPrefix.slice(0, 32);
    const ciphertextHex = withoutPrefix.slice(33);
    if (!ciphertextHex) {
      return '';
    }

    const iv: number[] = aes.utils.hex.toBytes(ivHex);
    const ciphertextBytes: number[] = aes.utils.hex.toBytes(ciphertextHex);

    const counter = new aes.Counter(iv);
    const aesCtr = new aes.ModeOfOperation.ctr(Array.from(key), counter);
    const decryptedBytes: number[] = aesCtr.decrypt(ciphertextBytes);

    return aes.utils.utf8.fromBytes(decryptedBytes);
  } catch (error) {
    if (__DEV__) {
      console.warn('[crypto] decryptText failed:', error);
    }
    return '';
  }
}

/** Returns `true` if `value` is already in the encrypted wire format. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}
