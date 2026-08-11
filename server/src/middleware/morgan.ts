import morgan from 'morgan';
import type { Request, Response } from 'express';
import { logger } from '../logger/index.js';

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

morgan.token('request-id', (req: Request, _res: Response) => (req.id) ?? '-');
morgan.token('safe-path', (req: Request) => req.path);

export const morganMiddleware = morgan(
  ':request-id :method :safe-path :status :res[content-length] - :response-time ms',
  { stream },
);
