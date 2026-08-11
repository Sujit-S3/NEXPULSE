import { z } from 'zod';
import { PERMISSIONS } from '../identity/permissions.js';
import { EVENT_CATALOG } from './catalog.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const permission = z.enum(PERMISSIONS);
const safeUrl = z.url().max(2048).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password && !url.hash && (url.protocol === 'https:' || url.protocol === 'http:');
}, 'URL must use HTTP(S) without credentials or fragments');
const redirectUri = safeUrl.refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}, 'Redirect URIs must use HTTPS except on loopback hosts');

export const createApplicationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  redirectUris: z.array(redirectUri).min(1).max(20).transform((items) => Array.from(new Set(items))),
  scopes: z.array(permission).min(1).max(PERMISSIONS.length),
  grantTypes: z.array(z.enum(['authorization_code', 'client_credentials']))
    .min(1)
    .max(2)
    .transform((items) => Array.from(new Set(items))),
});

export const authorizeSchema = z.object({
  clientId: z.string().min(12).max(100),
  redirectUri,
  scopes: z.array(permission).min(1).max(PERMISSIONS.length),
  state: z.string().min(16).max(256),
  codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/, 'Invalid PKCE challenge'),
  codeChallengeMethod: z.literal('S256'),
  approved: z.literal(true),
});

export const tokenSchema = z.discriminatedUnion('grant_type', [
  z.object({
    grant_type: z.literal('authorization_code'),
    client_id: z.string().min(12).max(100),
    client_secret: z.string().min(20).max(256),
    code: z.string().min(30).max(256),
    redirect_uri: redirectUri,
    code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/, 'Invalid PKCE verifier'),
  }),
  z.object({
    grant_type: z.literal('client_credentials'),
    client_id: z.string().min(12).max(100),
    client_secret: z.string().min(20).max(256),
    scope: z.string().trim().min(1).max(2000),
  }),
  z.object({
    grant_type: z.literal('refresh_token'),
    client_id: z.string().min(12).max(100),
    client_secret: z.string().min(20).max(256),
    refresh_token: z.string().min(30).max(256),
  }),
]);

export const revokeTokenSchema = z.object({
  client_id: z.string().min(12).max(100),
  client_secret: z.string().min(20).max(256),
  token: z.string().min(30).max(256),
});

const catalogTypes = new Set<string>(EVENT_CATALOG.map((event) => event.type));
const catalogCategories = new Set<string>(EVENT_CATALOG.map((event) => event.type.split('.')[0] ?? ''));
const eventSubscription = z.string().max(120).refine((value) => (
  value === '*' || catalogTypes.has(value) || (value.endsWith('.*') && catalogCategories.has(value.slice(0, -2)))
), 'Unknown event subscription');

export const createWebhookSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: safeUrl,
  description: z.string().trim().max(500).optional(),
  events: z.array(eventSubscription).min(1).max(100),
});

export const updateWebhookSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  url: safeUrl.optional(),
  description: z.string().trim().max(500).optional(),
  events: z.array(eventSubscription).min(1).max(100).optional(),
  status: z.enum(['active', 'paused']).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'Use semantic versioning');
export const submitPluginSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(2000),
  publisher: z.string().trim().min(2).max(120),
  homepage: safeUrl.optional(),
  capabilities: z.array(z.enum(['dashboard', 'reports', 'automation', 'ai', 'notifications', 'analytics', 'storage']))
    .min(1)
    .max(7),
  requiredPermissions: z.array(permission).max(PERMISSIONS.length),
  version: z.object({
    version: semver,
    runtimeApiVersion: z.literal('v1'),
    entrypoint: z.string().trim().regex(/^[a-zA-Z0-9@_./-]{1,200}$/),
    checksum: z.string().regex(/^sha256:[a-f\d]{64}$/i),
    dependencies: z.record(z.string().max(100), semver).default({}),
  }),
});

export const installPluginSchema = z.object({
  pluginId: objectId,
  version: semver,
  grantedPermissions: z.array(permission).max(PERMISSIONS.length),
});

export const pluginStatusSchema = z.object({ status: z.enum(['active', 'disabled', 'uninstalled']) });
export const reviewPluginSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export const approvePluginSchema = z.object({ approved: z.boolean() });

export const quotaSchema = z.object({
  requestsPerMinute: z.number().int().min(60).max(10_000_000),
  burstPerTenSeconds: z.number().int().min(10).max(1_000_000),
  requestsPerMonth: z.number().int().min(1000).max(1_000_000_000),
  endpointOverrides: z.record(z.string().min(3).max(500), z.number().int().min(1).max(10_000_000)).default({}),
});
