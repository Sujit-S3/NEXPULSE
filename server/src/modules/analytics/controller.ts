import type { Request, Response } from 'express';
import { ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { analyticsService } from './service.js';
import { analyticsQuerySchema } from './validator.js';

function user(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

function query(req: Request) {
  const parsed = analyticsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError({
      query: parsed.error.issues.map((issue) => issue.message),
    });
  }
  return parsed.data;
}

export const analyticsController = {
  async get(req: Request, res: Response): Promise<void> {
    const input = query(req);
    const result = await analyticsService.get(user(req).workspaceId, input);
    res.status(200).json(apiResponse(result));
  },

  async getAudience(req: Request, res: Response): Promise<void> {
    const input = query(req);
    const result = await analyticsService.get(user(req).workspaceId, input);
    res.status(200).json(apiResponse({
      connectionId: result.connectionId,
      collectedAt: result.collectedAt,
      audience: result.audience,
      available: result.audience !== null,
    }));
  },

  async getGrowth(req: Request, res: Response): Promise<void> {
    const input = query(req);
    const result = await analyticsService.get(user(req).workspaceId, input);
    res.status(200).json(apiResponse({
      connectionId: result.connectionId,
      collectedAt: result.collectedAt,
      history: result.history,
      available: result.history.length > 0,
    }));
  },
};
