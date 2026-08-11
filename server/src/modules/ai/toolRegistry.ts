import type { ToolDefinition, AIToolType, AIContextInput } from './types.js';

const registeredTools = new Map<AIToolType, ToolDefinition>();

function contextMetrics(context: AIContextInput) {
  return {
    followers: context.analytics.followers,
    engagementRate: context.analytics.engagement,
    reach: context.analytics.reach,
    impressions: context.analytics.impressions,
    views: context.analytics.views,
    growth: context.analytics.growth,
    unavailable: context.analytics.unavailable,
  };
}

function followerProjection(context: AIContextInput, days: number) {
  const points = context.analytics.history.filter(
    (point): point is typeof point & { followers: number } =>
      typeof point.followers === 'number' && Number.isFinite(point.followers),
  );
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2 || first.followers <= 0) return null;
  const elapsedDays = Math.max(
    1,
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000,
  );
  const dailyChange = (last.followers - first.followers) / elapsedDays;
  return {
    current: last.followers,
    projected: Math.max(0, Math.round(last.followers + dailyChange * days)),
    method: 'linear projection from provider-reported follower history',
    observedPoints: points.length,
  };
}

export const tools: ToolDefinition[] = [
  {
    type: 'generate-report',
    name: 'GenerateReport',
    description: 'Return provider-reported analytics for the selected connection and range',
    parameters: {
      timeRange: { type: 'string', description: 'Requested reporting range', required: false },
    },
    async execute(_args, context) {
      return {
        connection: context.platforms[0] ?? null,
        timeRange: context.timeRange,
        metrics: contextMetrics(context),
        recentPosts: context.recentPosts,
      };
    },
  },
  {
    type: 'analyze-platform',
    name: 'AnalyzePlatform',
    description: 'Inspect real metrics for the selected connected account',
    parameters: {
      metric: { type: 'string', description: 'Optional metric to focus on', required: false },
    },
    async execute(_args, context) {
      return {
        connection: context.platforms[0] ?? null,
        metrics: contextMetrics(context),
        history: context.analytics.history,
      };
    },
  },
  {
    type: 'analyze-audience',
    name: 'AnalyzeAudience',
    description: 'Inspect provider-reported audience dimensions for the selected connection',
    parameters: {},
    async execute(_args, context) {
      return {
        audience: context.audience,
        available: Object.values(context.audience).some((value) => value.length > 0),
        unavailable: context.analytics.unavailable.includes('audience'),
      };
    },
  },
  {
    type: 'generate-caption',
    name: 'GenerateCaption',
    description: 'Delegate caption writing to the configured AI model',
    parameters: {
      topic: { type: 'string', description: 'Caption topic', required: true },
      tone: { type: 'string', description: 'Writing tone', required: false },
    },
    async execute(args, context) {
      return {
        status: 'model_generation_required',
        topic: args['topic'],
        tone: args['tone'] ?? context.user.preferences.tone ?? 'Professional',
        connection: context.platforms[0] ?? null,
      };
    },
  },
  {
    type: 'suggest-hashtags',
    name: 'SuggestHashtags',
    description: 'Delegate hashtag suggestions to the configured AI model without fabricated trend ranks',
    parameters: {
      topic: { type: 'string', description: 'Hashtag topic', required: true },
    },
    async execute(args, context) {
      return {
        status: 'model_generation_required',
        topic: args['topic'],
        connection: context.platforms[0] ?? null,
        note: 'No provider trend ranking is available in the connected-account analytics response.',
      };
    },
  },
  {
    type: 'predict-growth',
    name: 'PredictGrowth',
    description: 'Project followers only when provider-reported history is available',
    parameters: {
      days: { type: 'number', description: 'Projection horizon', required: false },
    },
    async execute(args, context) {
      const days = Math.min(365, Math.max(1, Number(args['days'] ?? 30)));
      return {
        days,
        projection: followerProjection(context, days),
        available: followerProjection(context, days) !== null,
      };
    },
  },
  {
    type: 'find-best-posting-time',
    name: 'FindBestPostingTime',
    description: 'Rank posting hours from real recent-post engagement when sufficient data exists',
    parameters: {},
    async execute(_args, context) {
      const buckets = new Map<number, { engagement: number; posts: number }>();
      for (const post of context.recentPosts) {
        if (!post.date || post.engagement === null) continue;
        const hour = new Date(post.date).getUTCHours();
        if (!Number.isFinite(hour)) continue;
        const bucket = buckets.get(hour) ?? { engagement: 0, posts: 0 };
        bucket.engagement += post.engagement;
        bucket.posts += 1;
        buckets.set(hour, bucket);
      }
      const ranked = [...buckets.entries()]
        .map(([hour, value]) => ({
          hourUtc: hour,
          averageEngagement: value.engagement / value.posts,
          observedPosts: value.posts,
        }))
        .sort((a, b) => b.averageEngagement - a.averageEngagement);
      return { available: ranked.length > 0, ranked };
    },
  },
  {
    type: 'summarize-analytics',
    name: 'SummarizeAnalytics',
    description: 'Return a factual analytics payload for model summarization',
    parameters: {},
    async execute(_args, context) {
      return {
        period: context.timeRange,
        connection: context.platforms[0] ?? null,
        metrics: contextMetrics(context),
        postCountReturned: context.recentPosts.length,
        audienceAvailable: Object.values(context.audience).some((value) => value.length > 0),
      };
    },
  },
];

for (const tool of tools) registeredTools.set(tool.type, tool);

export function getTool(type: AIToolType): ToolDefinition | undefined {
  return registeredTools.get(type);
}

export function getAllTools(): ToolDefinition[] {
  return [...tools];
}
