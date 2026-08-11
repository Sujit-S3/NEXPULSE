import { z } from 'zod';
import { DATA_CLASSIFICATIONS, POLICY_TARGETS, THREAT_SEVERITIES } from './model.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const country = z.string().trim().regex(/^[A-Za-z]{2}$/, 'Use a two-letter country code').transform((value) => value.toUpperCase());
const ipRule = z.string().trim().min(3).max(50).regex(
  /^(?:(?:\d{1,3}\.){3}\d{1,3})(?:\/(?:[0-9]|[12][0-9]|3[0-2]))?$/,
  'Use an IPv4 address or CIDR range',
);
const pattern = z.string().trim().min(1).max(300).regex(
  /^[A-Za-z0-9_./:*?@-]+$/,
  'Patterns may contain letters, numbers, separators, and wildcards',
);

export const policyConditionsSchema = z.object({
  roles: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  actorTypes: z.array(z.enum(['user', 'service_account'])).max(2).optional(),
  requireMfa: z.boolean().optional(),
  maxRiskScore: z.number().int().min(0).max(100).optional(),
  allowedCountries: z.array(country).max(100).optional(),
  ipAllowlist: z.array(ipRule).max(100).optional(),
}).strict();

export const createPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  target: z.enum(POLICY_TARGETS),
  actionPattern: pattern,
  resourcePattern: pattern.default('*'),
  effect: z.enum(['allow', 'deny', 'step_up']),
  conditions: policyConditionsSchema.default({}),
  priority: z.number().int().min(0).max(10_000).default(100),
  status: z.enum(['draft', 'enforced', 'disabled']).default('draft'),
});

export const updatePolicySchema = z.object({
  expectedVersion: z.number().int().min(1),
  changeReason: z.string().trim().min(4).max(500),
  changes: createPolicySchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one change is required'),
});

export const createSecretSchema = z.object({
  name: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(4).max(500),
  scope: z.enum(['workspace', 'integration', 'automation', 'ai_provider']),
  value: z.string().min(16).max(20_000).optional(),
  rotateEveryDays: z.number().int().min(1).max(365).default(90),
  expiresAt: z.iso.datetime().transform((value) => new Date(value)).optional(),
});

export const rotateSecretSchema = z.object({
  value: z.string().min(16).max(20_000).optional(),
});

export const createDataAssetSchema = z.object({
  name: z.string().trim().min(2).max(160),
  system: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  ownerId: objectId.optional(),
  classification: z.enum(DATA_CLASSIFICATIONS),
  categories: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  retentionDays: z.number().int().min(1).max(3650).default(365),
  legalHold: z.boolean().default(false),
  residencyRegion: z.string().trim().min(2).max(80).optional(),
  upstreamAssets: z.array(objectId).max(100).default([]),
});

export const dlpInspectionSchema = z.object({
  payload: z.unknown(),
});

export const updateThreatSchema = z.object({
  status: z.enum(['investigating', 'contained', 'dismissed']),
});

export const createIncidentSchema = z.object({
  title: z.string().trim().min(4).max(200),
  summary: z.string().trim().min(8).max(2000),
  severity: z.enum(THREAT_SEVERITIES),
  signalIds: z.array(objectId).max(100).default([]),
  assignedTo: objectId.optional(),
});

export const transitionIncidentSchema = z.object({
  status: z.enum(['investigating', 'contained', 'resolved', 'postmortem']),
  note: z.string().trim().max(1000).optional(),
});

export const containIncidentSchema = z.object({
  action: z.enum(['mark_contained', 'revoke_actor_sessions', 'revoke_workspace_credentials']),
});
