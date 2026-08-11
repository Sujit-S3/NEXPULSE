import type { Request, Response } from 'express';
import { ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { analyticsService } from '../analytics/service.js';
import { analyticsQuerySchema } from '../analytics/validator.js';

export const dashboardController = {
  async get(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new Error('User not authenticated');
    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError({
        query: parsed.error.issues.map((issue) => issue.message),
      });
    }
    const analytics = await analyticsService.get(req.user.workspaceId, parsed.data);
    res.status(200).json(apiResponse({
      connectionId: analytics.connectionId,
      provider: analytics.provider,
      providerAccountId: analytics.providerAccountId,
      displayName: analytics.displayName,
      collectedAt: analytics.collectedAt,
      metrics: analytics.metrics,
      history: analytics.history,
      recentPosts: analytics.posts,
      unavailable: analytics.unavailable,
    }));
  },
};
