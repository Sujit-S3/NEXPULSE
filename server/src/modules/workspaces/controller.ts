import type { Request, Response } from 'express';
import { apiResponse } from '../../utils/apiResponse.js';
import { ValidationError } from '../../errors/index.js';
import { workspaceService } from './service.js';

function user(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

export const workspaceController = {
  async list(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await workspaceService.list(user(req).id)));
  },
  async current(req: Request, res: Response): Promise<void> {
    const current = user(req);
    res.status(200).json(
      apiResponse(await workspaceService.current(current.workspaceId, current.id)),
    );
  },
  async switch(req: Request, res: Response): Promise<void> {
    const current = user(req);
    if (!current.sessionId) throw new Error('A user session is required to switch workspaces');
    const workspaceId = req.params['workspaceId'];
    if (typeof workspaceId !== 'string' || !/^[a-f\d]{24}$/i.test(workspaceId)) {
      throw new ValidationError({ workspaceId: ['Invalid workspace identifier'] });
    }
    const result = await workspaceService.switch(
      current.id,
      current.sessionId,
      workspaceId,
    );
    res.status(200).json(apiResponse(result, 'Workspace switched'));
  },
};
