import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { apiResponse } from '../utils/apiResponse.js';

export function getHealth(_req: Request, res: Response): void {
  if (config.env === 'production') {
    res.status(200).json(apiResponse({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  const dbState = mongoose.connection.readyState;
  const dbStatus: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json(
    apiResponse({
      status: 'healthy',
      app: config.app.name,
      apiVersion: config.apiVersion,
      uptime: process.uptime(),
      environment: config.env,
      version: '0.1.0',
      database: dbStatus[dbState] ?? 'unknown',
    }),
  );
}
