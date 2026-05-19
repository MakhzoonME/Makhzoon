/**
 * Envelope encryption for secrets stored at rest (currently: Fawtara client
 * credentials in `organizationsPrivate/{orgId}.fawtara.*`).
 *
 * Scheme: AES-256-GCM with a per-record random 12-byte nonce. Ciphertext is
 * encoded as `enc:v1:<base64(nonce|ciphertext|authTag)>` so the on-disk format
 * is self-describing. Values that don't match the `enc:v1:` prefix are treated
 * as plaintext — this lets us deploy the change without a backfill: writes
 * become encrypted immediately, and reads keep working for legacy plaintext
 * rows. After a rotation pass, the plaintext fallback can be removed.
 *
 * The master key comes from FAWTARA_SECRET_ENC_KEY (base64, 32 bytes). This is
 * a deliberately small abstraction so the same module can later be repointed at
 * GCP KMS by swapping the body of `encrypt`/`decrypt` — the call sites don't
 * change.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENC_PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm'
const NONCE_LEN = 12
const KEY_LEN = 32

let cachedKey: Buffer | null = null
let cachedKeyError: string | null = null

function loadKey(): Buffer | null {
  if (cachedKey) return cachedKey
  if (cachedKeyError) return null
  const raw = process.env.FAWTARA_SECRET_ENC_KEY
  if (!raw) {
    cachedKeyError = 'FAWTARA_SECRET_ENC_KEY is not set'
    return null
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_LEN) {
    cachedKeyError = `FAWTARA_SECRET_ENC_KEY must decode to ${KEY_LEN} bytes (got ${buf.length})`
    return null
  }
  cachedKey = buf
  return buf
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

/**
 * Encrypt a UTF-8 string. When no key is configured, returns the input
 * unchanged with a warning — this keeps the dev/test env workable without a
 * key set, while production should always have one. `secretEncryptionAvailable`
 * lets callers surface this in a startup check.
 */
export function encrypt(plaintext: string): string {
  const key = loadKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[secret-cipher] FAWTARA_SECRET_ENC_KEY not configured — storing plaintext')
    }
    return plaintext
  }
  const nonce = randomBytes(NONCE_LEN)
  const cipher = createCipheriv(ALGO, key, nonce)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const packed = Buffer.concat([nonce, ciphertext, authTag]).toString('base64')
  return `${ENC_PREFIX}${packed}`
}

/**
 * Decrypt a value previously encrypted with `encrypt`. Plaintext (legacy)
 * values are returned as-is so the upgrade path doesn't require a backfill.
 * Throws on tamper / wrong-key.
 */
export function decrypt(value: string | null | undefined): string | null {
  if (!value) return null
  if (!isEncrypted(value)) return value
  const key = loadKey()
  if (!key) {
    throw new Error(`Cannot decrypt: ${cachedKeyError ?? 'no key'}`)
  }
  const packed = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
  if (packed.length <= NONCE_LEN + 16) {
    throw new Error('Cannot decrypt: ciphertext too short')
  }
  const nonce = packed.subarray(0, NONCE_LEN)
  const authTag = packed.subarray(packed.length - 16)
  const ciphertext = packed.subarray(NONCE_LEN, packed.length - 16)
  const decipher = createDecipheriv(ALGO, key, nonce)
  decipher.setAuthTag(authTag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plain.toString('utf8')
}

export function secretEncryptionAvailable(): { available: boolean; reason?: string } {
  const key = loadKey()
  return key ? { available: true } : { available: false, reason: cachedKeyError ?? 'unknown' }
}
