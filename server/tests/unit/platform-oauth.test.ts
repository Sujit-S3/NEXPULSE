import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  config: {
    oauth: {
      tokenEncryptionKey: '11'.repeat(32),
    },
  },
}));

import {
  createPkcePair,
  decryptSecret,
  encryptSecret,
  hashOpaqueValue,
  randomOpaqueValue,
} from '../../src/modules/platforms/oauth/crypto.js';
import { selectAccountsSchema, startOAuthSchema } from '../../src/modules/platforms/validator.js';

describe('platform OAuth security primitives', () => {
  it('encrypts credentials with a random authenticated envelope', () => {
    const first = encryptSecret('provider-access-token');
    const second = encryptSecret('provider-access-token');

    expect(first).not.toBe(second);
    expect(first.startsWith('v1.')).toBe(true);
    expect(decryptSecret(first)).toBe('provider-access-token');
    expect(decryptSecret(second)).toBe('provider-access-token');
  });

  it('hashes opaque OAuth state without retaining the source value', () => {
    const state = randomOpaqueValue();
    const expected = createHash('sha256').update(state).digest('hex');

    expect(hashOpaqueValue(state)).toBe(expected);
    expect(hashOpaqueValue(state)).not.toContain(state);
  });

  it('creates an S256 PKCE verifier and challenge', () => {
    const pair = createPkcePair();
    const expected = createHash('sha256').update(pair.verifier).digest('base64url');

    expect(pair.verifier.length).toBeGreaterThan(43);
    expect(pair.challenge).toBe(expected);
  });
});

describe('platform OAuth validation', () => {
  it('requires an explicit account selection and primary account', () => {
    expect(
      selectAccountsSchema.safeParse({ accountIds: [], primaryAccountId: '' }).success,
    ).toBe(false);
    expect(
      selectAccountsSchema.safeParse({
        accountIds: ['account-1'],
        primaryAccountId: 'account-1',
      }).success,
    ).toBe(true);
  });

  it('allows only internal account-management return paths', () => {
    expect(startOAuthSchema.safeParse({ returnTo: '/settings' }).success).toBe(true);
    expect(startOAuthSchema.safeParse({ returnTo: 'https://attacker.example' }).success).toBe(false);
  });
});
