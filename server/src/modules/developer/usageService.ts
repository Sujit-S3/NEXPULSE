import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError, AuthorizationError } from '../../errors/index.js';
import { ApiQuotaPolicy, ApiRateLimitBucket, ApiUsageMetric } from './model.js';
import { sha256 } from './security.js';

const MINUTE_MS = 60_000;
const BURST_MS = 10_000;
const quotaCache = new Map<string, { expiresAt: number; value: QuotaPolicy }>();

export interface QuotaPolicy {
  requestsPerMinute: number;
  burstPerTenSeconds: number;
  requestsPerMonth: number;
  endpointOverrides: Record<string, number>;
}

const defaultQuota: QuotaPolicy = {
  requestsPerMinute: 10_000,
  burstPerTenSeconds: 2_000,
  requestsPerMonth: 10_000_000,
  endpointOverrides: {},
};

function startOfWindow(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

function nextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function normalizedEndpoint(req: Request): string {
  const routePath = typeof req.route?.path === 'string' ? req.route.path : undefined;
  const raw = routePath ? `${req.baseUrl}${routePath}` : req.originalUrl.split('?')[0] ?? req.path;
  return raw
    .replace(/[a-f\d]{24}/gi, ':id')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

async function quotaForWorkspace(workspaceId: string): Promise<QuotaPolicy> {
  const cached = quotaCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const stored = await ApiQuotaPolicy.findOne({ workspaceId }).lean().exec();
  const value = stored ? {
    requestsPerMinute: stored.requestsPerMinute,
    burstPerTenSeconds: stored.burstPerTenSeconds,
    requestsPerMonth: stored.requestsPerMonth,
    endpointOverrides: stored.endpointOverrides,
  } : defaultQuota;
  quotaCache.set(workspaceId, { expiresAt: Date.now() + 30_000, value });
  return value;
}

async function incrementBucket(input: {
  key: string;
  bucketStart: Date;
  expiresAt: Date;
  limit: number;
}) {
  const bucket = await ApiRateLimitBucket.findOneAndUpdate(
    { key: input.key, bucketStart: input.bucketStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: input.expiresAt },
    },
    { upsert: true, new: true },
  ).lean().exec();
  return { allowed: bucket.count <= input.limit, remaining: Math.max(0, input.limit - bucket.count) };
}

export async function enforceGatewayQuotas(req: Request, res: Response): Promise<void> {
  if (!req.user) return;
  const now = Date.now();
  const endpoint = normalizedEndpoint(req);
  const minuteStart = startOfWindow(now, MINUTE_MS);
  const burstStart = startOfWindow(now, BURST_MS);
  const monthStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1));
  const policy = await quotaForWorkspace(req.user.workspaceId);
  const endpointLimit = policy.endpointOverrides[`${req.method} ${endpoint}`] ?? policy.requestsPerMinute;
  const dimensions = [
    { key: `ip:${sha256(req.ip ?? 'unknown')}`, start: minuteStart, expiry: new Date(now + 2 * MINUTE_MS), limit: 1_200 },
    { key: `workspace:${req.user.workspaceId}`, start: minuteStart, expiry: new Date(now + 2 * MINUTE_MS), limit: policy.requestsPerMinute },
    { key: `endpoint:${req.user.workspaceId}:${req.method}:${endpoint}`, start: minuteStart, expiry: new Date(now + 2 * MINUTE_MS), limit: endpointLimit },
    { key: `burst:${req.user.workspaceId}`, start: burstStart, expiry: new Date(now + 2 * BURST_MS), limit: policy.burstPerTenSeconds },
    { key: `month:${req.user.workspaceId}`, start: monthStart, expiry: new Date(nextMonth(monthStart).getTime() + 24 * 60 * 60 * 1000), limit: policy.requestsPerMonth },
    ...(req.user.organizationId ? [{
      key: `organization:${req.user.organizationId}`,
      start: minuteStart,
      expiry: new Date(now + 2 * MINUTE_MS),
      limit: 50_000,
    }] : []),
    ...(req.user.credentialId ? [{
      key: `credential:${req.user.credentialId}`,
      start: minuteStart,
      expiry: new Date(now + 2 * MINUTE_MS),
      limit: 5_000,
    }] : []),
    ...(req.user.oauthApplicationId ? [{
      key: `application:${req.user.oauthApplicationId}`,
      start: minuteStart,
      expiry: new Date(now + 2 * MINUTE_MS),
      limit: 5_000,
    }] : []),
    ...(req.user.actorType === 'user' ? [{
      key: `user:${req.user.id}`,
      start: minuteStart,
      expiry: new Date(now + 2 * MINUTE_MS),
      limit: 3_000,
    }] : []),
  ];

  let lowestRemaining = Number.POSITIVE_INFINITY;
  for (const dimension of dimensions) {
    const decision = await incrementBucket({
      key: dimension.key,
      bucketStart: dimension.start,
      expiresAt: dimension.expiry,
      limit: dimension.limit,
    });
    lowestRemaining = Math.min(lowestRemaining, decision.remaining);
    if (!decision.allowed) {
      res.setHeader('Retry-After', Math.ceil((dimension.start.getTime() + MINUTE_MS - now) / 1000));
      res.setHeader('RateLimit-Limit', dimension.limit);
      res.setHeader('RateLimit-Remaining', 0);
      throw new AppError('API quota exceeded', 429, 'API_QUOTA_EXCEEDED');
    }
  }
  res.setHeader('RateLimit-Limit', policy.requestsPerMinute);
  res.setHeader('RateLimit-Remaining', Number.isFinite(lowestRemaining) ? lowestRemaining : policy.requestsPerMinute);
  res.setHeader('RateLimit-Reset', Math.ceil((minuteStart.getTime() + MINUTE_MS) / 1000));
}

async function recordUsage(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.apiGateway) return;
  const latencyMs = Number(process.hrtime.bigint() - req.apiGateway.startedAt) / 1_000_000;
  const bucketStart = startOfWindow(Date.now(), MINUTE_MS);
  const endpoint = normalizedEndpoint(req);
  const sdkHeader = req.headers['x-nexpulse-sdk'];
  const sdk = typeof sdkHeader === 'string' ? sdkHeader.slice(0, 120) : undefined;
  const identity = {
    workspaceId: new mongoose.Types.ObjectId(req.user.workspaceId),
    applicationId: req.user.oauthApplicationId ? new mongoose.Types.ObjectId(req.user.oauthApplicationId) : undefined,
    credentialId: req.user.credentialId ? new mongoose.Types.ObjectId(req.user.credentialId) : undefined,
    bucketStart,
    endpoint,
    method: req.method,
    sdk,
  };
  await ApiUsageMetric.updateOne(identity, {
    $setOnInsert: identity,
    $inc: {
      requestCount: 1,
      errorCount: res.statusCode >= 400 ? 1 : 0,
      rateLimitedCount: res.statusCode === 429 ? 1 : 0,
      totalLatencyMs: latencyMs,
    },
    $max: { maxLatencyMs: latencyMs },
  }, { upsert: true }).exec();
}

export function apiGatewayIngress(req: Request, res: Response, next: NextFunction): void {
  req.apiGateway = { startedAt: process.hrtime.bigint(), endpoint: req.path, version: 'v1' };
  res.setHeader('X-API-Version', 'v1');
  res.setHeader('X-Request-Id', req.id);
  res.setHeader('Vary', 'Authorization, X-API-Key, X-NEXPULSE-SDK');
  res.once('finish', () => {
    void recordUsage(req, res).catch(() => {
      // Telemetry must never change the response already delivered to the caller.
    });
  });
  next();
}

export const apiUsageService = {
  async summary(workspaceId: string, days = 30) {
    const from = new Date(Date.now() - Math.min(days, 90) * 24 * 60 * 60 * 1000);
    const match = { workspaceId: new mongoose.Types.ObjectId(workspaceId), bucketStart: { $gte: from } };
    const [totals = null, endpoints, sdkUsage] = await Promise.all([
      ApiUsageMetric.aggregate<{
        requests: number;
        errors: number;
        rateLimited: number;
        latencyTotal: number;
        latencyMax: number;
      }>([
        { $match: match },
        { $group: {
          _id: null,
          requests: { $sum: '$requestCount' },
          errors: { $sum: '$errorCount' },
          rateLimited: { $sum: '$rateLimitedCount' },
          latencyTotal: { $sum: '$totalLatencyMs' },
          latencyMax: { $max: '$maxLatencyMs' },
        } },
      ]).then((items) => items[0]),
      ApiUsageMetric.aggregate<{ endpoint: string; method: string; requests: number; errors: number; averageLatencyMs: number }>([
        { $match: match },
        { $group: {
          _id: { endpoint: '$endpoint', method: '$method' },
          requests: { $sum: '$requestCount' },
          errors: { $sum: '$errorCount' },
          latency: { $sum: '$totalLatencyMs' },
        } },
        { $sort: { requests: -1 } },
        { $limit: 20 },
        { $project: {
          _id: 0,
          endpoint: '$_id.endpoint',
          method: '$_id.method',
          requests: 1,
          errors: 1,
          averageLatencyMs: { $cond: [{ $gt: ['$requests', 0] }, { $divide: ['$latency', '$requests'] }, 0] },
        } },
      ]),
      ApiUsageMetric.aggregate<{ sdk: string; requests: number }>([
        { $match: { ...match, sdk: { $exists: true } } },
        { $group: { _id: '$sdk', requests: { $sum: '$requestCount' } } },
        { $sort: { requests: -1 } },
        { $project: { _id: 0, sdk: '$_id', requests: 1 } },
      ]),
    ]);
    const requests = totals?.requests ?? 0;
    return {
      periodDays: Math.min(days, 90),
      totals: {
        requests,
        errors: totals?.errors ?? 0,
        errorRate: requests > 0 ? (totals?.errors ?? 0) / requests : 0,
        rateLimited: totals?.rateLimited ?? 0,
        averageLatencyMs: requests > 0 ? (totals?.latencyTotal ?? 0) / requests : 0,
        maxLatencyMs: totals?.latencyMax ?? 0,
      },
      endpoints,
      sdkUsage,
      quota: await quotaForWorkspace(workspaceId),
    };
  },

  async quota(workspaceId: string) {
    return quotaForWorkspace(workspaceId);
  },

  async updateQuota(input: {
    workspaceId: string;
    userId: string;
    actorRole: string;
    requestsPerMinute: number;
    burstPerTenSeconds: number;
    requestsPerMonth: number;
    endpointOverrides: Record<string, number>;
  }) {
    if (!['super_admin', 'organization_owner', 'workspace_owner'].includes(input.actorRole)) {
      throw new AuthorizationError('Only workspace or organization owners can manage API quotas');
    }
    const policy = await ApiQuotaPolicy.findOneAndUpdate(
      { workspaceId: input.workspaceId },
      {
        $set: {
          requestsPerMinute: input.requestsPerMinute,
          burstPerTenSeconds: input.burstPerTenSeconds,
          requestsPerMonth: input.requestsPerMonth,
          endpointOverrides: input.endpointOverrides,
          updatedBy: input.userId,
        },
      },
      { upsert: true, new: true },
    ).exec();
    quotaCache.delete(input.workspaceId);
    return {
      requestsPerMinute: policy.requestsPerMinute,
      burstPerTenSeconds: policy.burstPerTenSeconds,
      requestsPerMonth: policy.requestsPerMonth,
      endpointOverrides: policy.endpointOverrides,
    };
  },
};
