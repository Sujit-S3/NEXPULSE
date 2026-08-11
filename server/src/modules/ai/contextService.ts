import { AppError, NotFoundError } from '../../errors/index.js';
import { userRepository } from '../auth/repository.js';
import { analyticsService } from '../analytics/service.js';
import { platformService } from '../platforms/service.js';
import { reportService } from '../reports/service.js';
import { workspaceService } from '../workspaces/service.js';
import type { AIContextInput } from './types.js';

function followerGrowth(history: AIContextInput['analytics']['history']): number | null {
  const points = history.filter(
    (point): point is typeof point & { followers: number } =>
      typeof point.followers === 'number' && Number.isFinite(point.followers),
  );
  const first = points[0]?.followers;
  const last = points.at(-1)?.followers;
  if (first === undefined || last === undefined || first <= 0 || points.length < 2) return null;
  return ((last - first) / first) * 100;
}

export async function buildAIContext(input: {
  workspaceId: string;
  userId: string;
  role: string;
  connectionId: string;
  from?: Date;
  to?: Date;
}): Promise<AIContextInput> {
  const to = input.to ?? new Date();
  const from = input.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (from >= to) {
    throw new AppError('The analytics start date must be before the end date.', 400, 'INVALID_DATE_RANGE');
  }

  const [workspace, connections, currentUser, analytics, reports] = await Promise.all([
    workspaceService.current(input.workspaceId, input.userId),
    platformService.getConnections(input.workspaceId),
    userRepository.findById(input.userId),
    analyticsService.get(input.workspaceId, {
      connectionId: input.connectionId,
      from,
      to,
      limit: 25,
      forceRefresh: false,
    }),
    reportService.list(input.workspaceId, input.connectionId, 1, 5),
  ]);
  const connection = connections.find((candidate) => candidate.id === input.connectionId);
  if (!connection) throw new NotFoundError('Connected account not found');

  const history = analytics.history.map((point) => ({ ...point }));
  return {
    workspace: { id: workspace.id, name: workspace.name, plan: workspace.plan },
    platforms: [
      {
        id: connection.id,
        name: connection.displayName,
        type: connection.provider,
        status: connection.status,
      },
    ],
    analytics: {
      followers: analytics.metrics.followers,
      engagement: analytics.metrics.engagementRate,
      reach: analytics.metrics.reach,
      growth: followerGrowth(history),
      impressions: analytics.metrics.impressions,
      views: analytics.metrics.views,
      timeRange: `${analytics.range.from} to ${analytics.range.to}`,
      history,
      unavailable: analytics.unavailable,
    },
    audience: {
      topCountries: analytics.audience?.countries?.map((entry) => entry.name) ?? [],
      ageGroups:
        analytics.audience?.age?.map((entry) => ({ group: entry.name, pct: entry.value })) ?? [],
      topDevices: [],
      activeHours: [],
    },
    recentPosts: analytics.posts.map((post) => ({
      id: post.id,
      platform: analytics.provider,
      content: post.content ?? '',
      engagement: post.metrics.engagement ?? null,
      date: post.publishedAt ?? '',
      url: post.url,
    })),
    reports: reports.items.map((report) => ({
      id: report.id,
      title: report.title,
      status: report.status,
      createdAt: report.createdAt,
      range: report.range,
      metrics: report.metrics,
      unavailable: report.unavailable,
    })),
    user: {
      role: input.role,
      preferences: {
        language: currentUser?.preferences?.language,
      },
    },
    timeRange: `${analytics.range.from} to ${analytics.range.to}`,
  };
}
