import type { Request, Response } from 'express';
import { AuthorizationError, ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { API_LIFECYCLE, EVENT_CATALOG, PUBLIC_API_SCOPES } from './catalog.js';
import { openApiDocument } from './openapi.js';
import { developerOAuthService } from './oauthService.js';
import { webhookService } from './webhookService.js';
import { pluginService } from './pluginService.js';
import { apiUsageService } from './usageService.js';

function identity(req: Request) {
  if (!req.user) throw new AuthorizationError('Authentication required');
  return req.user;
}

function interactive(req: Request) {
  const user = identity(req);
  if (user.actorType !== 'user' || !user.sessionId) {
    throw new AuthorizationError('An interactive user session is required');
  }
  return user;
}

function identifier(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ValidationError({ [name]: ['Invalid identifier'] });
  }
  return value;
}

function queryString(req: Request, name: string): string {
  const value = req.query[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError({ [name]: ['This query parameter is required'] });
  }
  return value;
}

export const developerController = {
  lifecycle(_req: Request, res: Response): void {
    res.status(200).json(apiResponse({
      lifecycle: API_LIFECYCLE,
      scopes: PUBLIC_API_SCOPES,
      events: EVENT_CATALOG,
    }));
  },

  openapi(_req: Request, res: Response): void {
    res.status(200).json(openApiDocument());
  },

  async applications(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await developerOAuthService.listApplications(identity(req).workspaceId)));
  },

  async createApplication(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await developerOAuthService.registerApplication({
      workspaceId: user.workspaceId,
      ownerId: user.id,
      actorPermissions: user.permissions,
      ...req.body,
    });
    await webhookService.publish({
      type: 'developer.application.created',
      workspaceId: user.workspaceId,
      organizationId: user.organizationId,
      actorId: user.id,
      data: { applicationId: result.application.id, clientId: result.application.clientId },
    });
    res.status(201).json(apiResponse(result, 'Copy the client secret now; it will not be shown again'));
  },

  async rotateApplicationSecret(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await developerOAuthService.rotateSecret(
      user.workspaceId,
      identifier(req, 'applicationId'),
    );
    res.status(201).json(apiResponse(result, 'Client secret rotated and existing tokens revoked'));
  },

  async revokeApplication(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    await developerOAuthService.revokeApplication(user.workspaceId, identifier(req, 'applicationId'));
    res.status(200).json(apiResponse(null, 'Developer application revoked'));
  },

  async consent(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const responseType = queryString(req, 'response_type');
    const method = queryString(req, 'code_challenge_method');
    if (responseType !== 'code' || method !== 'S256') {
      throw new ValidationError({ response_type: ['OAuth 2.1 authorization code with PKCE S256 is required'] });
    }
    const result = await developerOAuthService.consentDetails({
      clientId: queryString(req, 'client_id'),
      redirectUri: queryString(req, 'redirect_uri'),
      requestedScopes: queryString(req, 'scope').split(/\s+/).filter(Boolean),
      actorPermissions: user.permissions,
    });
    res.status(200).json(apiResponse({
      ...result,
      state: queryString(req, 'state'),
      codeChallenge: queryString(req, 'code_challenge'),
      codeChallengeMethod: method,
    }));
  },

  async authorize(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await developerOAuthService.authorize({
      clientId: req.body.clientId,
      redirectUri: req.body.redirectUri,
      requestedScopes: req.body.scopes,
      codeChallenge: req.body.codeChallenge,
      state: req.body.state,
      userId: user.id,
      workspaceId: user.workspaceId,
      actorPermissions: user.permissions,
    });
    res.status(201).json(apiResponse(result));
  },

  async token(req: Request, res: Response): Promise<void> {
    let result;
    if (req.body.grant_type === 'authorization_code') {
      result = await developerOAuthService.exchangeAuthorizationCode({
        clientId: req.body.client_id,
        clientSecret: req.body.client_secret,
        code: req.body.code,
        redirectUri: req.body.redirect_uri,
        codeVerifier: req.body.code_verifier,
      });
    } else if (req.body.grant_type === 'client_credentials') {
      result = await developerOAuthService.clientCredentials({
        clientId: req.body.client_id,
        clientSecret: req.body.client_secret,
        requestedScopes: req.body.scope.split(/\s+/).filter(Boolean),
      });
    } else {
      result = await developerOAuthService.refresh({
        clientId: req.body.client_id,
        clientSecret: req.body.client_secret,
        refreshToken: req.body.refresh_token,
      });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json(result);
  },

  async revokeToken(req: Request, res: Response): Promise<void> {
    await developerOAuthService.revokeToken({
      clientId: req.body.client_id,
      clientSecret: req.body.client_secret,
      token: req.body.token,
    });
    res.status(200).json({});
  },

  async webhooks(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await webhookService.listEndpoints(identity(req).workspaceId)));
  },

  async createWebhook(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await webhookService.createEndpoint({
      workspaceId: user.workspaceId,
      userId: user.id,
      ...req.body,
    });
    res.status(201).json(apiResponse(result, 'Copy the webhook signing secret now; it will not be shown again'));
  },

  async updateWebhook(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const endpoint = await webhookService.updateEndpoint({
      workspaceId: user.workspaceId,
      endpointId: identifier(req, 'endpointId'),
      ...req.body,
    });
    res.status(200).json(apiResponse(endpoint));
  },

  async rotateWebhookSecret(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await webhookService.rotateSecret(user.workspaceId, identifier(req, 'endpointId'));
    res.status(201).json(apiResponse(result, 'Webhook signing secret rotated'));
  },

  async deleteWebhook(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    await webhookService.disableEndpoint(user.workspaceId, identifier(req, 'endpointId'));
    res.status(200).json(apiResponse(null, 'Webhook endpoint disabled'));
  },

  async testWebhook(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const delivery = await webhookService.testEndpoint(
      user.workspaceId,
      identifier(req, 'endpointId'),
      user.id,
    );
    res.status(202).json(apiResponse(delivery, 'Webhook test queued'));
  },

  async deliveries(req: Request, res: Response): Promise<void> {
    const user = identity(req);
    const endpointId = typeof req.query['endpointId'] === 'string' ? req.query['endpointId'] : undefined;
    const limitValue = typeof req.query['limit'] === 'string' ? Number(req.query['limit']) : undefined;
    const limit = Number.isInteger(limitValue) ? limitValue : undefined;
    res.status(200).json(apiResponse(await webhookService.listDeliveries(user.workspaceId, { endpointId, limit })));
  },

  async replayDelivery(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const delivery = await webhookService.replay(user.workspaceId, identifier(req, 'deliveryId'));
    res.status(202).json(apiResponse(delivery, 'Webhook delivery queued for replay'));
  },

  async marketplace(req: Request, res: Response): Promise<void> {
    const search = typeof req.query['search'] === 'string' ? req.query['search'].slice(0, 120) : undefined;
    res.status(200).json(apiResponse(await pluginService.marketplace(search)));
  },

  async pluginSubmissions(req: Request, res: Response): Promise<void> {
    const user = identity(req);
    res.status(200).json(apiResponse(await pluginService.submissions(user.id, user.role === 'super_admin')));
  },

  async submitPlugin(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const plugin = await pluginService.submit({ userId: user.id, ...req.body });
    res.status(201).json(apiResponse(plugin, 'Plugin submitted for security and platform review'));
  },

  async approvePlugin(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    if (user.role !== 'super_admin') throw new AuthorizationError('Platform administrator approval is required');
    const plugin = await pluginService.approve(identifier(req, 'pluginId'), req.body.approved);
    res.status(200).json(apiResponse(plugin));
  },

  async installPlugin(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const installation = await pluginService.install({
      workspaceId: user.workspaceId,
      userId: user.id,
      actorPermissions: user.permissions,
      organizationId: user.organizationId,
      ...req.body,
    });
    res.status(201).json(apiResponse(installation));
  },

  async installations(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await pluginService.installations(identity(req).workspaceId)));
  },

  async updateInstallation(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    await pluginService.setInstallationStatus(
      user.workspaceId,
      identifier(req, 'installationId'),
      req.body.status,
    );
    res.status(200).json(apiResponse(null, 'Plugin installation updated'));
  },

  async reviewPlugin(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const plugin = await pluginService.review({
      pluginId: identifier(req, 'pluginId'),
      userId: user.id,
      ...req.body,
    });
    res.status(200).json(apiResponse(plugin));
  },

  async usage(req: Request, res: Response): Promise<void> {
    const daysValue = typeof req.query['days'] === 'string' ? Number(req.query['days']) : 30;
    const days = Number.isInteger(daysValue) && daysValue > 0 ? Math.min(daysValue, 90) : 30;
    res.status(200).json(apiResponse(await apiUsageService.summary(identity(req).workspaceId, days)));
  },

  async quota(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await apiUsageService.quota(identity(req).workspaceId)));
  },

  async updateQuota(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const quota = await apiUsageService.updateQuota({
      workspaceId: user.workspaceId,
      userId: user.id,
      actorRole: user.role,
      ...req.body,
    });
    res.status(200).json(apiResponse(quota));
  },
};
