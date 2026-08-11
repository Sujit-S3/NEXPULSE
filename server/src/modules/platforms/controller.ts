import type { Request, Response } from 'express';
import { AuthorizationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { platformService } from './service.js';
import { PLATFORMS } from './types.js';
import type { PlatformType } from './types.js';

function getUser(req: Request): NonNullable<typeof req.user> {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

function toPlatformType(value: string): PlatformType {
  if (PLATFORMS.includes(value as PlatformType)) return value as PlatformType;
  throw new AuthorizationError('This OAuth provider is not supported');
}

export const platformController = {
  async getProviders(_req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(platformService.getProviders()));
  },

  async getProviderStatus(_req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(platformService.getProviderStatus()));
  },

  async startOAuth(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const provider = toPlatformType(req.params['provider'] as string);
    const result = await platformService.startOAuth(
      user.workspaceId,
      user.id,
      provider,
      req.body.returnTo,
      req.body.forceConsent,
    );
    res.status(201).json(apiResponse(result, 'OAuth authorization started'));
  },

  async oauthCallback(req: Request, res: Response): Promise<void> {
    const provider = toPlatformType(req.params['provider'] as string);
    const redirect = await platformService.completeOAuthCallback(provider, {
      state: typeof req.query['state'] === 'string' ? req.query['state'] : undefined,
      code: typeof req.query['code'] === 'string' ? req.query['code'] : undefined,
      error: typeof req.query['error'] === 'string' ? req.query['error'] : undefined,
      errorDescription:
        typeof req.query['error_description'] === 'string'
          ? req.query['error_description']
          : undefined,
    });
    res.redirect(303, redirect);
  },

  async getPendingAccounts(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const sessionId = req.params['sessionId'] as string;
    const result = await platformService.getPendingAccounts(
      user.workspaceId,
      user.id,
      sessionId,
    );
    res.status(200).json(apiResponse(result));
  },

  async saveSelection(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const sessionId = req.params['sessionId'] as string;
    const result = await platformService.saveSelection(
      user.workspaceId,
      user.id,
      sessionId,
      req.body,
    );
    res.status(201).json(apiResponse(result, 'Selected accounts connected'));
  },

  async getConnections(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await platformService.getConnections(user.workspaceId);
    res.status(200).json(apiResponse(result));
  },

  async getHealth(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await platformService.getHealth(user.workspaceId);
    res.status(200).json(apiResponse(result));
  },

  async setPrimary(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await platformService.setPrimary(
      user.workspaceId,
      req.params['connectionId'] as string,
      user.id,
    );
    res.status(200).json(apiResponse(result, 'Primary account updated'));
  },

  async disconnect(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    await platformService.disconnect(
      user.workspaceId,
      req.params['connectionId'] as string,
      user.id,
    );
    res.status(200).json(apiResponse(null, 'Account disconnected'));
  },
};
