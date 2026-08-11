import { z } from 'zod';
import { PERMISSIONS } from './permissions.js';

const password = z.string().min(1).max(128);
const futureDate = z.iso.datetime().transform((value) => new Date(value)).refine(
  (value) => value.getTime() > Date.now(),
  'Expiry must be in the future',
);

export const createCredentialSchema = z.object({
  type: z.enum(['api_key', 'personal_access_token']),
  name: z.string().trim().min(1).max(100),
  permissions: z.array(z.enum(PERMISSIONS)).min(1).max(PERMISSIONS.length),
  expiresAt: futureDate.optional(),
});

export const createServiceAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  purpose: z.enum(['automation', 'integration', 'bot', 'ci_cd']).default('integration'),
  permissions: z.array(z.enum(PERMISSIONS)).min(1).max(PERMISSIONS.length),
  expiresAt: futureDate.optional(),
});

export const createInvitationSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  role: z.enum(['workspace_admin', 'manager', 'editor', 'analyst', 'viewer', 'guest']),
});

export const invitationResponseSchema = z.object({
  token: z.string().min(32).max(256),
  action: z.enum(['accept', 'decline']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['workspace_admin', 'manager', 'editor', 'analyst', 'viewer', 'guest']),
});

export const passwordConfirmationSchema = z.object({ password });
export const confirmTotpSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter a 6-digit code') });
export const recoveryCodeSchema = z.object({ code: z.string().trim().min(6).max(40) });
export const disableMfaSchema = z.object({ password, code: z.string().trim().min(6).max(40) });

export const updateIdentityPolicySchema = z.object({
  allowInvitations: z.boolean().optional(),
  defaultRole: z.enum(['manager', 'editor', 'analyst', 'viewer', 'guest']).optional(),
  passwordMinLength: z.number().int().min(15).max(128).optional(),
  sessionIdleMinutes: z.number().int().min(5).max(1440).optional(),
  sessionMaxDays: z.number().int().min(1).max(90).optional(),
  maxActiveSessions: z.number().int().min(1).max(100).optional(),
  requireMfaForRoles: z.array(z.enum(['super_admin', 'organization_owner', 'workspace_owner', 'workspace_admin', 'manager', 'editor', 'analyst', 'viewer', 'guest'])).max(9).optional(),
  allowedEmailDomains: z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).max(100).optional(),
  loginIpAllowlist: z.array(z.union([z.ipv4(), z.ipv6()])).max(100).optional(),
  allowApiKeys: z.boolean().optional(),
  allowServiceAccounts: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one policy setting is required');
