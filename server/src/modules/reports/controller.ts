import type { Request, Response } from 'express';
import { ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { reportService } from './service.js';
import { exportQuerySchema, reportsQuerySchema } from './validator.js';

function user(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

export const reportController = {
  async create(req: Request, res: Response): Promise<void> {
    const current = user(req);
    const report = await reportService.create(current.workspaceId, current.id, req.body);
    res.status(201).json(apiResponse(report, 'Report generated from synchronized analytics'));
  },

  async list(req: Request, res: Response): Promise<void> {
    const parsed = reportsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError({ query: parsed.error.issues.map((i) => i.message) });
    const result = await reportService.list(
      user(req).workspaceId,
      parsed.data.connectionId,
      parsed.data.page,
      parsed.data.limit,
    );
    res.status(200).json(apiResponse(result));
  },

  async export(req: Request, res: Response): Promise<void> {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError({ query: parsed.error.issues.map((i) => i.message) });
    const result = await reportService.export(
      user(req).workspaceId,
      req.params['reportId'] as string,
      parsed.data.format,
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.body);
  },
};
