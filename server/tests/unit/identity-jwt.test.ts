import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  config: {
    env: 'test',
    jwt: {
      accessSecret: 'identity-access-secret-for-tests',
      accessExpiresIn: '15m',
      issuer: 'nexpulse-test',
      audience: 'nexpulse-web-test',
    },
  },
}));

import { generateAccessToken, verifyAccessToken } from '../../src/utils/jwt.js';

const payload = {
  sub: 'user-1', email: 'user@example.com', role: 'viewer', workspaceId: 'workspace-1',
  sessionId: 'session-1', securityStamp: 2,
};

describe('session-bound access tokens', () => {
  it('round-trips issuer, audience, session, and security version claims', () => {
    expect(verifyAccessToken(generateAccessToken(payload))).toMatchObject(payload);
  });

  it('rejects signature tampering', () => {
    const token = generateAccessToken(payload);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects expired and wrong-audience tokens', () => {
    const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 }, 'identity-access-secret-for-tests', {
      algorithm: 'HS256', issuer: 'nexpulse-test', audience: 'nexpulse-web-test',
    });
    const wrongAudience = jwt.sign(payload, 'identity-access-secret-for-tests', {
      algorithm: 'HS256', issuer: 'nexpulse-test', audience: 'another-client', expiresIn: '15m',
    });
    expect(() => verifyAccessToken(expired)).toThrow();
    expect(() => verifyAccessToken(wrongAudience)).toThrow();
  });
});
