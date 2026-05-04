const crypto = require('crypto');

// AES-256-GCM. Stored format: base64( iv(12) || tag(16) || ciphertext ).
// Key comes from DEIDENT_ENCRYPTION_KEY env var (32 bytes, base64-encoded).

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey() {
  const raw = process.env.DEIDENT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('DEIDENT_ENCRYPTION_KEY env var is required to encrypt/decrypt secrets');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LEN) {
    throw new Error(`DEIDENT_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length})`);
  }
  return key;
}

exports.encrypt = function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return plaintext;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
};

exports.decrypt = function decrypt(encoded) {
  if (encoded == null || encoded === '') return encoded;
  const key = getKey();
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};

exports.isEncrypted = function isEncrypted(value) {
  if (typeof value !== 'string' || value.length < 40) return false;
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length > IV_LEN + TAG_LEN;
  } catch {
    return false;
  }
};
