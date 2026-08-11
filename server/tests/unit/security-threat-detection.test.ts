import { describe, expect, it } from 'vitest';
import { detectThreats, type SecurityEventLike } from '../../src/modules/security/threatDetection.js';

const now = new Date('2026-07-24T10:00:00.000Z');

function event(overrides: Partial<SecurityEventLike> = {}): SecurityEventLike {
  return {
    id: crypto.randomUUID(),
    type: 'authentication.denied',
    outcome: 'denied',
    ipAddress: '203.0.113.10',
    actorId: 'user-1',
    createdAt: new Date(now.getTime() - 60_000),
    ...overrides,
  };
}

describe('security threat correlation', () => {
  it('detects brute-force authentication attempts in a bounded time window', () => {
    const result = detectThreats(Array.from({ length: 12 }, () => event()), now);
    expect(result).toContainEqual(expect.objectContaining({
      ruleId: 'brute-force',
      severity: 'high',
    }));
  });

  it('distinguishes credential stuffing across multiple actors', () => {
    const events = Array.from({ length: 12 }, (_, index) => event({ actorId: `user-${index % 6}` }));
    expect(detectThreats(events, now)[0]).toMatchObject({ ruleId: 'credential-stuffing' });
  });

  it('treats token replay as a critical signal', () => {
    const result = detectThreats([event({ type: 'session.refresh_reuse' })], now);
    expect(result[0]).toMatchObject({ ruleId: 'token-replay', severity: 'critical', score: 95 });
  });
});
