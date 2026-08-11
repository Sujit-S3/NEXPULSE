import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../errors/index.js';
import { config } from '../config/env.js';

export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (!origin || config.cors.origin.includes(origin)) return next();
  next(new AuthorizationError('Untrusted request origin'));
}
