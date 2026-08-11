import mongoose from 'mongoose';
import { AppError } from '../../errors/index.js';
import { getAdapter } from '../platforms/adapters/index.js';
import { withValidProviderToken } from '../platforms/service.js';
import type {
  NormalizedAnalytics,
  ProviderAnalyticsResult,
} from '../platforms/types.js';
import type { IAnalyticsSnapshot } from './model.js';
import { analyticsRepository } from './repository.js';

const CACHE_WINDOW_MS = 5 * 60 * 1000;
const unavailableMetrics = [
  'followers',
  'following',
  'reach',
  'impressions',
  'posts',
  'engagement',
  'views',
  'audience',
  'history',
] as const;

function finite(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function fromSnapshot(snapshot: IAnalyticsSnapshot): NormalizedAnalytics {
  return {
    connectionId: snapshot.connectionId.toString(),
    workspaceId: snapshot.workspaceId.toString(),
    provider: snapshot.provider,
    providerAccountId: snapshot.providerAccountId,
    displayName: snapshot.displayName,
    collectedAt: snapshot.collectedAt.toISOString(),
    range: {
      from: snapshot.rangeFrom.toISOString(),
      to: snapshot.rangeTo.toISOString(),
    },
    metrics: snapshot.metrics,
    history: snapshot.history,
    posts: snapshot.posts,
    audience: snapshot.audience,
    unavailable: snapshot.unavailable,
    nextCursor: snapshot.nextCursor,
  };
}

function normalizeResult(
  result: ProviderAnalyticsResult,
  metadata: {
    connectionId: string;
    workspaceId: string;
    provider: NormalizedAnalytics['provider'];
    providerAccountId: string;
    displayName: string;
    from: Date;
    to: Date;
  },
): NormalizedAnalytics {
  const impressions = finite(result.metrics.impressions);
  const engagement = finite(result.metrics.engagement);
  return {
    connectionId: metadata.connectionId,
    workspaceId: metadata.workspaceId,
    provider: metadata.provider,
    providerAccountId: metadata.providerAccountId,
    displayName: metadata.displayName,
    collectedAt: new Date().toISOString(),
    range: { from: metadata.from.toISOString(), to: metadata.to.toISOString() },
    metrics: {
      followers: finite(result.metrics.followers),
      following: finite(result.metrics.following),
      reach: finite(result.metrics.reach),
      impressions,
      posts: finite(result.metrics.posts),
      engagement,
      engagementRate:
        engagement !== null && impressions !== null && impressions > 0
          ? (engagement / impressions) * 100
          : null,
      views: finite(result.metrics.views),
    },
    history: result.history,
    posts: result.posts,
    audience: result.audience ?? null,
    unavailable: Array.from(new Set(result.unavailable)),
    nextCursor: result.nextCursor,
  };
}

async function persist(result: NormalizedAnalytics): Promise<void> {
  await analyticsRepository.create({
    workspaceId: new mongoose.Types.ObjectId(result.workspaceId),
    connectionId: new mongoose.Types.ObjectId(result.connectionId),
    provider: result.provider,
    providerAccountId: result.providerAccountId,
    displayName: result.displayName,
    rangeFrom: new Date(result.range.from),
    rangeTo: new Date(result.range.to),
    collectedAt: new Date(result.collectedAt),
    metrics: result.metrics,
    history: result.history,
    posts: result.posts,
    audience: result.audience,
    unavailable: result.unavailable,
    nextCursor: result.nextCursor,
  });
}

export const analyticsService = {
  async get(
    workspaceId: string,
    input: {
      connectionId: string;
      from: Date;
      to: Date;
      cursor?: string;
      limit: number;
      forceRefresh: boolean;
    },
  ): Promise<NormalizedAnalytics> {
    if (!input.forceRefresh && !input.cursor) {
      const cached = await analyticsRepository.findFresh(
        workspaceId,
        input.connectionId,
        input.from,
        input.to,
        new Date(Date.now() - CACHE_WINDOW_MS),
      );
      if (cached) return fromSnapshot(cached);
    }

    const normalized = await withValidProviderToken(
      workspaceId,
      input.connectionId,
      async ({ accessToken, connection }) => {
        const adapter = getAdapter(connection.provider);
        const providerResult = adapter.fetchAnalytics
          ? await adapter.fetchAnalytics({
              accessToken,
              providerAccountId: connection.providerAccountId,
              providerUserId: connection.providerUserId,
              accountType: connection.accountType,
              from: input.from,
              to: input.to,
              cursor: input.cursor,
              limit: input.limit,
            })
          : {
              metrics: {},
              history: [],
              posts: [],
              unavailable: [...unavailableMetrics],
            };
        return normalizeResult(providerResult, {
          connectionId: connection._id.toString(),
          workspaceId,
          provider: connection.provider,
          providerAccountId: connection.providerAccountId,
          displayName: connection.displayName,
          from: input.from,
          to: input.to,
        });
      },
    );
    await persist(normalized);
    return normalized;
  },

  async latest(workspaceId: string, connectionId: string): Promise<NormalizedAnalytics> {
    const snapshot = await analyticsRepository.findLatest(workspaceId, connectionId);
    if (!snapshot) {
      throw new AppError(
        'No analytics have been synchronized for this connection.',
        404,
        'ANALYTICS_NOT_SYNCHRONIZED',
      );
    }
    return fromSnapshot(snapshot);
  },
};
