import mongoose from 'mongoose';
import { PlatformConnection } from './model.js';
import { ProviderTelemetry } from './telemetryModel.js';
import type { PlatformType } from './types.js';

export interface ProviderHealthPoint {
  date: string;
  availability: number | null;
  latencyMs: number | null;
  requests: number;
}

export interface ProviderHealth {
  connectionId: string;
  provider: PlatformType;
  displayName: string;
  status: string;
  lastHealthCheckAt?: string;
  lastSyncAt?: string;
  tokenExpiresAt?: string;
  requests: number;
  availability: number | null;
  errorRate: number | null;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  tokenRefreshes: number;
  costUsd: null;
  history: ProviderHealthPoint[];
}

export async function recordProviderTelemetry(input: {
  workspaceId: string;
  connectionId: string;
  provider: PlatformType;
  operation: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  tokenRefreshed: boolean;
}): Promise<void> {
  await ProviderTelemetry.create({
    ...input,
    workspaceId: new mongoose.Types.ObjectId(input.workspaceId),
    connectionId: new mongoose.Types.ObjectId(input.connectionId),
  });
}

function percentile95(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? null;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getProviderHealth(workspaceId: string): Promise<ProviderHealth[]> {
  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [connections, telemetry] = await Promise.all([
    PlatformConnection.find({ workspaceId: workspaceObjectId, selectedAccount: true })
      .select('provider displayName status lastHealthCheckAt lastSyncAt tokenExpiresAt')
      .sort({ isPrimary: -1, updatedAt: -1 })
      .lean()
      .exec(),
    ProviderTelemetry.find({ workspaceId: workspaceObjectId, createdAt: { $gte: since } })
      .select('connectionId latencyMs success tokenRefreshed createdAt')
      .sort({ createdAt: -1 })
      .limit(20_000)
      .lean()
      .exec(),
  ]);

  const byConnection = new Map<string, typeof telemetry>();
  for (const entry of telemetry) {
    const id = entry.connectionId.toString();
    const existing = byConnection.get(id) ?? [];
    existing.push(entry);
    byConnection.set(id, existing);
  }

  return connections.map((connection) => {
    const records = byConnection.get(connection._id.toString()) ?? [];
    const successes = records.filter((entry) => entry.success).length;
    const latency = records.map((entry) => entry.latencyMs);
    const days = new Map<string, { requests: number; successes: number; latency: number[] }>();
    for (const entry of records) {
      const key = dateKey(entry.createdAt);
      const point = days.get(key) ?? { requests: 0, successes: 0, latency: [] };
      point.requests += 1;
      if (entry.success) point.successes += 1;
      point.latency.push(entry.latencyMs);
      days.set(key, point);
    }
    const history = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = dateKey(date);
      const point = days.get(key);
      return {
        date: key,
        availability: point ? Math.round((point.successes / point.requests) * 10_000) / 100 : null,
        latencyMs: point
          ? Math.round(point.latency.reduce((sum, value) => sum + value, 0) / point.latency.length)
          : null,
        requests: point?.requests ?? 0,
      };
    });
    return {
      connectionId: connection._id.toString(),
      provider: connection.provider,
      displayName: connection.displayName,
      status: connection.status,
      lastHealthCheckAt: connection.lastHealthCheckAt?.toISOString(),
      lastSyncAt: connection.lastSyncAt?.toISOString(),
      tokenExpiresAt: connection.tokenExpiresAt?.toISOString(),
      requests: records.length,
      availability: records.length ? Math.round((successes / records.length) * 10_000) / 100 : null,
      errorRate: records.length ? Math.round(((records.length - successes) / records.length) * 10_000) / 100 : null,
      averageLatencyMs: latency.length
        ? Math.round(latency.reduce((sum, value) => sum + value, 0) / latency.length)
        : null,
      p95LatencyMs: percentile95(latency),
      tokenRefreshes: records.filter((entry) => entry.tokenRefreshed).length,
      costUsd: null,
      history,
    };
  });
}
