import type { Request, Response } from 'express';
import { ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { notificationService } from './service.js';
import { notificationsQuerySchema } from './validator.js';
import { subscribeToNotificationEvents } from './events.js';

function user(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

export const notificationController = {
  async stream(req: Request, res: Response): Promise<void> {
    const current = user(req);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);

    const unsubscribe = subscribeToNotificationEvents(
      current.workspaceId,
      current.id,
      (event) => {
        if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
    );
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(': heartbeat\n\n');
    }, 20_000);
    req.once('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  },
  async list(req: Request, res: Response): Promise<void> {
    const parsed = notificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError({ query: parsed.error.issues.map((i) => i.message) });
    const current = user(req);
    res.status(200).json(
      apiResponse(await notificationService.list(current.workspaceId, current.id, parsed.data)),
    );
  },
  async markRead(req: Request, res: Response): Promise<void> {
    const current = user(req);
    res.status(200).json(apiResponse(await notificationService.markRead(
      current.workspaceId,
      current.id,
      req.params['notificationId'] as string,
    )));
  },
  async markAllRead(req: Request, res: Response): Promise<void> {
    const current = user(req);
    await notificationService.markAllRead(current.workspaceId, current.id);
    res.status(200).json(apiResponse(null, 'All notifications marked read'));
  },
  async archive(req: Request, res: Response): Promise<void> {
    const current = user(req);
    res.status(200).json(apiResponse(await notificationService.archive(
      current.workspaceId,
      current.id,
      req.params['notificationId'] as string,
    )));
  },
};
