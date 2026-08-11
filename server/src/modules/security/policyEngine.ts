import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../../errors/index.js';
import { recordSecurityEvent } from '../identity/securityEvents.js';
import {
  PolicyDecision,
  SecurityPolicy,
  type ISecurityPolicy,
  type PolicyConditions,
  type PolicyTarget,
} from './model.js';

export interface PolicyContext {
  workspaceId: string;
  actorId: string;
  actorType: 'user' | 'service_account';
  role: string;
  action: string;
  resource: string;
  target: PolicyTarget;
  riskScore: number;
  mfaVerified: boolean;
  ipAddress?: string;
  country?: string;
  requestId?: string;
}

export interface PolicyRule {
  id?: string;
  target: PolicyTarget;
  actionPattern: string;
  resourcePattern: string;
  effect: 'allow' | 'deny' | 'step_up';
  conditions: PolicyConditions;
  priority: number;
}

export interface PolicyResult {
  decision: 'allow' | 'deny' | 'step_up';
  policyId?: string;
  reasons: string[];
}

function glob(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`, 'i').test(value);
}

function ipv4ToNumber(value: string): number | undefined {
  const parts = value.replace(/^::ffff:/, '').split('.');
  if (parts.length !== 4) return undefined;
  const octets = parts.map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined;
  return octets.reduce((result, octet) => ((result << 8) | octet) >>> 0, 0);
}

function ipv6ToBigInt(value: string): bigint | undefined {
  const address = value.trim();
  if (!address.includes(':')) return undefined;
  const segments = address.split('::');
  if (segments.length > 2) return undefined;
  const head = segments[0] ? segments[0].split(':') : [];
  const tail = segments.length === 2 && segments[1] ? segments[1].split(':') : [];
  let groups: string[];
  if (segments.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return undefined;
    groups = [...head, ...Array(missing).fill('0'), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-fA-F]{1,4}$/.test(group))) return undefined;
  return groups.reduce((result, group) => (result << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function ipv6Matches(candidate: string, network: string, bits: number): boolean {
  if (!Number.isInteger(bits) || bits < 0 || bits > 128) return false;
  const ip = ipv6ToBigInt(candidate);
  const base = ipv6ToBigInt(network);
  if (ip === undefined || base === undefined) return false;
  const fullMask = (1n << 128n) - 1n;
  const mask = bits === 0 ? 0n : (fullMask << BigInt(128 - bits)) & fullMask;
  return (ip & mask) === (base & mask);
}

function ipMatches(candidate: string, rule: string): boolean {
  const normalizedCandidate = candidate.replace(/^::ffff:/, '');
  if (!rule.includes('/')) return normalizedCandidate === rule.replace(/^::ffff:/, '');
  const [network, bitsValue] = rule.split('/');
  const bits = Number(bitsValue);
  if (!network) return false;
  if (normalizedCandidate.includes(':') || network.includes(':')) {
    return ipv6Matches(normalizedCandidate, network, bits);
  }
  const ip = ipv4ToNumber(normalizedCandidate);
  const base = ipv4ToNumber(network);
  if (ip === undefined || base === undefined || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ip & mask) === (base & mask);
}

function selectorMatches(rule: PolicyRule, context: PolicyContext): boolean {
  if (rule.target !== context.target) return false;
  if (!glob(rule.actionPattern, context.action) || !glob(rule.resourcePattern, context.resource)) return false;
  if (rule.conditions.roles?.length && !rule.conditions.roles.includes(context.role)) return false;
  if (rule.conditions.actorTypes?.length && !rule.conditions.actorTypes.includes(context.actorType)) return false;
  return true;
}

function violations(conditions: PolicyConditions, context: PolicyContext): string[] {
  const reasons: string[] = [];
  if (conditions.requireMfa && !context.mfaVerified) reasons.push('Multi-factor verification is required');
  if (conditions.maxRiskScore !== undefined && context.riskScore > conditions.maxRiskScore) {
    reasons.push(`Session risk ${context.riskScore} exceeds the allowed score ${conditions.maxRiskScore}`);
  }
  if (
    conditions.allowedCountries?.length &&
    (!context.country || !conditions.allowedCountries.includes(context.country.toUpperCase()))
  ) reasons.push('Request origin is outside the allowed countries');
  if (
    conditions.ipAllowlist?.length &&
    (!context.ipAddress || !conditions.ipAllowlist.some((rule) => ipMatches(context.ipAddress as string, rule)))
  ) reasons.push('Request IP is outside the allowlist');
  return reasons;
}

export function evaluatePolicies(rules: readonly PolicyRule[], context: PolicyContext): PolicyResult {
  if (context.riskScore >= 90) {
    return { decision: 'deny', reasons: ['Session risk requires immediate reauthentication'] };
  }
  const matching = [...rules]
    .filter((rule) => selectorMatches(rule, context))
    .sort((left, right) => right.priority - left.priority);

  for (const rule of matching) {
    const failedRequirements = violations(rule.conditions, context);
    if (failedRequirements.length) {
      return {
        decision: rule.conditions.requireMfa && !context.mfaVerified ? 'step_up' : 'deny',
        policyId: rule.id,
        reasons: failedRequirements,
      };
    }
    return {
      decision: rule.effect,
      policyId: rule.id,
      reasons: [`Matched ${rule.effect} policy`],
    };
  }
  return { decision: 'allow', reasons: ['RBAC grant accepted; no stricter policy matched'] };
}

function toRule(policy: ISecurityPolicy): PolicyRule {
  return {
    id: policy._id.toString(),
    target: policy.target,
    actionPattern: policy.actionPattern,
    resourcePattern: policy.resourcePattern,
    effect: policy.effect,
    conditions: policy.conditions,
    priority: policy.priority,
  };
}

function fingerprint(context: PolicyContext): string {
  return crypto.createHash('sha256').update(JSON.stringify({
    workspaceId: context.workspaceId,
    actorId: context.actorId,
    action: context.action,
    resource: context.resource,
    target: context.target,
    riskScore: context.riskScore,
    mfaVerified: context.mfaVerified,
    ipAddress: context.ipAddress,
    country: context.country,
  })).digest('hex');
}

export async function decidePolicy(context: PolicyContext): Promise<PolicyResult> {
  const policies = await SecurityPolicy.find({
    workspaceId: context.workspaceId,
    status: 'enforced',
    target: context.target,
  }).sort({ priority: -1 }).exec();
  const result = evaluatePolicies(policies.map(toRule), context);
  await PolicyDecision.create({
    workspaceId: context.workspaceId,
    policyId: result.policyId,
    actorId: context.actorId,
    actorType: context.actorType,
    action: context.action,
    resource: context.resource,
    target: context.target,
    decision: result.decision,
    reasons: result.reasons,
    requestId: context.requestId,
    contextFingerprint: fingerprint(context),
  });
  return result;
}

export function enforceZeroTrust(input: {
  target: PolicyTarget;
  action: string;
  resource?: (req: Request) => string;
}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AuthorizationError('Authentication required'));
    const country = typeof req.headers['cf-ipcountry'] === 'string'
      ? req.headers['cf-ipcountry'].toUpperCase()
      : undefined;
    const context: PolicyContext = {
      workspaceId: req.user.workspaceId,
      actorId: req.user.id,
      actorType: req.user.actorType,
      role: req.user.role,
      action: input.action,
      resource: input.resource?.(req) ?? req.originalUrl.split('?')[0] ?? req.path,
      target: input.target,
      riskScore: req.user.riskScore ?? 0,
      mfaVerified: req.user.mfaVerified ?? req.user.actorType === 'service_account',
      ipAddress: req.ip,
      country,
      requestId: req.id,
    };
    try {
      const result = await decidePolicy(context);
      if (result.decision === 'allow') return next();
      await recordSecurityEvent({
        workspaceId: req.user.workspaceId,
        organizationId: req.user.organizationId,
        userId: req.user.actorType === 'user' ? req.user.id : undefined,
        actorType: req.user.actorType,
        actorId: req.user.id,
        sessionId: req.user.sessionId,
        type: `policy.${result.decision}`,
        outcome: 'denied',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
        metadata: { action: context.action, resource: context.resource, policyId: result.policyId, reasons: result.reasons },
      });
      next(new AuthorizationError(
        result.decision === 'step_up'
          ? 'Policy requires multi-factor step-up authentication'
          : 'Request denied by security policy',
      ));
    } catch (error) {
      next(error);
    }
  };
}
