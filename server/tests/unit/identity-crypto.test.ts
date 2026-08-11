import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  config: { identity: { encryptionKey: 'a1'.repeat(32) } },
}));

import {
  decryptIdentitySecret,
  encryptIdentitySecret,
  hashSecret,
  randomSecret,
  safeSecretEqual,
} from '../../src/modules/identity/crypto.js';
import { totpCode, verifyTotp } from '../../src/modules/identity/totp.js';

describe('identity cryptographic primitives', () => {
  it('stores opaque tokens as one-way hashes', () => {
    const token = randomSecret();
    expect(hashSecret(token)).not.toContain(token);
    expect(safeSecretEqual(hashSecret(token), token)).toBe(true);
    expect(safeSecretEqual(hashSecret(token), `${token}x`)).toBe(false);
  });

  it('encrypts MFA secrets with randomized authenticated encryption', () => {
    const first = encryptIdentitySecret('TOP-SECRET');
    const second = encryptIdentitySecret('TOP-SECRET');
    expect(first).not.toBe(second);
    expect(decryptIdentitySecret(first)).toBe('TOP-SECRET');
  });

  it('matches the RFC 6238 SHA-1 test secret at 59 seconds', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(totpCode(secret, 59_000)).toBe('287082');
    expect(verifyTotp(secret, '287082', 59_000)).toBe(true);
    expect(verifyTotp(secret, '000000', 59_000)).toBe(false);
  });
});
