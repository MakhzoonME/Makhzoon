import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';
import { encrypt, decrypt, isEncrypted, secretEncryptionAvailable } from '@/lib/platform/crypto/secret-cipher';

beforeAll(() => {
  process.env.FAWTARA_SECRET_ENC_KEY = randomBytes(32).toString('base64');
});

describe('secret-cipher', () => {
  it('reports availability when key is set', () => {
    expect(secretEncryptionAvailable().available).toBe(true);
  });

  it('round-trips a value', () => {
    const plain = 'hunter2-the-fawtara-secret';
    const ct = encrypt(plain);
    expect(isEncrypted(ct)).toBe(true);
    expect(ct).not.toContain(plain);
    expect(decrypt(ct)).toBe(plain);
  });

  it('treats plaintext as a pass-through on decrypt (legacy rows)', () => {
    expect(decrypt('legacy-plaintext-value')).toBe('legacy-plaintext-value');
  });

  it('produces a different ciphertext each time (random nonce)', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same');
    expect(decrypt(b)).toBe('same');
  });

  it('rejects tampered ciphertext', () => {
    const ct = encrypt('do-not-touch');
    const tampered = ct.slice(0, -2) + 'XX';
    expect(() => decrypt(tampered)).toThrow();
  });
});
