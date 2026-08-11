import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { formatError } from '../errors/formatter.js';
import { logger } from '../logger/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', {
        error: err.message,
        stack: err.stack,
        requestId: req.id,
      });
    }
    res.status(err.statusCode).json(formatError(err));
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
