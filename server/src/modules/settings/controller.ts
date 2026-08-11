import type { Request, Response } from 'express';
import { apiResponse } from '../../utils/apiResponse.js';
import { settingsService } from './service.js';

function userId(req: Request): string {
  if (!req.user) throw new Error('User not authenticated');
  return req.user.id;
}

export const settingsController = {
  async get(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await settingsService.get(userId(req))));
  },
  async update(req: Request, res: Response): Promise<void> {
    res.status(200).json(
      apiResponse(await settingsService.update(userId(req), req.body), 'Settings updated'),
    );
  },
};
