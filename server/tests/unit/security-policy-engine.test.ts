import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/security/model.js', () => ({
  PolicyDecision: { create: vi.fn() },
  SecurityPolicy: { find: vi.fn() },
}));
vi.mock('../../src/modules/identity/securityEvents.js', () => ({
  recordSecurityEvent: vi.fn(),
}));

import { evaluatePolicies, type PolicyContext, type PolicyRule } from '../../src/modules/security/policyEngine.js';

const context: PolicyContext = {
  workspaceId: '507f1f77bcf86cd799439011',
  actorId: '507f1f77bcf86cd799439012',
  actorType: 'user',
  role: 'workspace_owner',
  action: 'security.secret.rotate',
  resource: '/api/v1/security/secrets/1/rotate',
  target: 'resource',
  riskScore: 20,
  mfaVerified: true,
  ipAddress: '10.0.0.5',
  country: 'US',
};

function rule(overrides: Partial<PolicyRule> = {}): PolicyRule {
  return {
    id: 'policy-1',
    target: 'resource',
    actionPattern: 'security.secret.*',
    resourcePattern: '*',
    effect: 'allow',
    conditions: { requireMfa: true, maxRiskScore: 60, ipAllowlist: ['10.0.0.0/24'] },
    priority: 100,
    ...overrides,
  };
}

describe('zero-trust policy evaluation', () => {
  it('allows an RBAC-granted request that satisfies the highest-priority policy', () => {
    expect(evaluatePolicies([rule()], context)).toMatchObject({
      decision: 'allow',
      policyId: 'policy-1',
    });
  });

  it('requires step-up authentication when an MFA requirement is not satisfied', () => {
    expect(evaluatePolicies([rule()], { ...context, mfaVerified: false })).toMatchObject({
      decision: 'step_up',
      reasons: ['Multi-factor verification is required'],
    });
  });

  it('denies elevated-risk, out-of-network, and critical-risk requests', () => {
    expect(evaluatePolicies([rule()], { ...context, riskScore: 75 }).decision).toBe('deny');
    expect(evaluatePolicies([rule()], { ...context, ipAddress: '10.0.1.5' }).decision).toBe('deny');
    expect(evaluatePolicies([], { ...context, riskScore: 95 }).decision).toBe('deny');
  });

  it('honors deny rules before lower-priority allows', () => {
    const result = evaluatePolicies([
      rule({ id: 'allow', priority: 100 }),
      rule({ id: 'deny', effect: 'deny', priority: 1000, conditions: {} }),
    ], context);
    expect(result).toMatchObject({ decision: 'deny', policyId: 'deny' });
  });

  it('matches IPv6 CIDR ranges, including compressed and full notation', () => {
    const ipv6Rule = rule({ conditions: { ipAllowlist: ['2001:db8::/32'] } });
    expect(evaluatePolicies([ipv6Rule], { ...context, ipAddress: '2001:db8:0:0:0:0:0:5' }).decision).toBe('allow');
    expect(evaluatePolicies([ipv6Rule], { ...context, ipAddress: '2001:db8::5' }).decision).toBe('allow');
    expect(evaluatePolicies([ipv6Rule], { ...context, ipAddress: '2001:db9::5' }).decision).toBe('deny');
  });

  it('matches an exact IPv6 address without a CIDR suffix', () => {
    const ipv6Rule = rule({ conditions: { ipAllowlist: ['::1'] } });
    expect(evaluatePolicies([ipv6Rule], { ...context, ipAddress: '::1' }).decision).toBe('allow');
    expect(evaluatePolicies([ipv6Rule], { ...context, ipAddress: '::2' }).decision).toBe('deny');
  });
});
