import type { Request, Response } from 'express';
import { AuthorizationError, ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { recordSecurityEvent } from '../identity/securityEvents.js';
import {
  complianceService,
  governanceService,
  incidentService,
  policyService,
  secretService,
  securityDashboardService,
  threatService,
} from './service.js';

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

function actorInput(req: Request) {
  const user = interactive(req);
  return {
    workspaceId: user.workspaceId,
    organizationId: user.organizationId,
    actorId: user.id,
    sessionId: user.sessionId,
  };
}

export const securityController = {
  async dashboard(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await securityDashboardService.dashboard(identity(req).workspaceId)));
  },

  async policies(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await policyService.list(identity(req).workspaceId)));
  },

  async createPolicy(req: Request, res: Response): Promise<void> {
    const result = await policyService.create({ ...actorInput(req), ...req.body });
    res.status(201).json(apiResponse(result, 'Security policy created with an immutable version record'));
  },

  async updatePolicy(req: Request, res: Response): Promise<void> {
    const result = await policyService.update({
      ...actorInput(req),
      policyId: identifier(req, 'policyId'),
      ...req.body,
    });
    res.status(200).json(apiResponse(result));
  },

  async secrets(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await secretService.list(identity(req).workspaceId)));
  },

  async createSecret(req: Request, res: Response): Promise<void> {
    const result = await secretService.create({ ...actorInput(req), ...req.body });
    res.status(201).json(apiResponse(
      result,
      result.generatedValue
        ? 'Copy the generated secret now; it will not be shown again'
        : 'Secret encrypted and versioned',
    ));
  },

  async rotateSecret(req: Request, res: Response): Promise<void> {
    const result = await secretService.rotate({
      ...actorInput(req),
      secretId: identifier(req, 'secretId'),
      ...req.body,
    });
    res.status(201).json(apiResponse(
      result,
      result.generatedValue ? 'Copy the generated secret now; it will not be shown again' : 'Secret rotated',
    ));
  },

  async revokeSecret(req: Request, res: Response): Promise<void> {
    const result = await secretService.revoke({
      ...actorInput(req),
      secretId: identifier(req, 'secretId'),
    });
    res.status(200).json(apiResponse(result, 'Secret revoked'));
  },

  async dataAssets(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await governanceService.list(identity(req).workspaceId)));
  },

  async createDataAsset(req: Request, res: Response): Promise<void> {
    const result = await governanceService.create({ ...actorInput(req), ...req.body });
    res.status(201).json(apiResponse(result));
  },

  async queueAssetDeletion(req: Request, res: Response): Promise<void> {
    const result = await governanceService.queueDeletion({
      ...actorInput(req),
      assetId: identifier(req, 'assetId'),
    });
    res.status(202).json(apiResponse(result, 'Governed deletion queued'));
  },

  inspectDlp(req: Request, res: Response): void {
    res.status(200).json(apiResponse(governanceService.inspect(req.body.payload)));
  },

  async compliance(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await complianceService.summary(identity(req).workspaceId)));
  },

  async collectCompliance(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await complianceService.collect(user.workspaceId);
    await recordSecurityEvent({
      workspaceId: user.workspaceId,
      organizationId: user.organizationId,
      userId: user.id,
      actorType: 'user',
      actorId: user.id,
      sessionId: user.sessionId,
      type: 'compliance.evidence.collected',
      outcome: 'success',
      requestId: req.id,
      metadata: { controls: result.length },
    });
    res.status(201).json(apiResponse(result, 'Compliance evidence snapshot collected'));
  },

  async threats(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await threatService.list(identity(req).workspaceId)));
  },

  async evaluateThreats(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const detections = await threatService.evaluate(user.workspaceId);
    res.status(202).json(apiResponse({ detections }, 'Threat rules evaluated'));
  },

  async updateThreat(req: Request, res: Response): Promise<void> {
    const user = interactive(req);
    const result = await threatService.updateStatus(
      user.workspaceId,
      identifier(req, 'signalId'),
      req.body.status,
    );
    res.status(200).json(apiResponse(result));
  },

  async incidents(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await incidentService.list(identity(req).workspaceId)));
  },

  async createIncident(req: Request, res: Response): Promise<void> {
    res.status(201).json(apiResponse(await incidentService.create({ ...actorInput(req), ...req.body })));
  },

  async transitionIncident(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await incidentService.transition({
      ...actorInput(req),
      incidentId: identifier(req, 'incidentId'),
      ...req.body,
    })));
  },

  async containIncident(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await incidentService.contain({
      ...actorInput(req),
      incidentId: identifier(req, 'incidentId'),
      ...req.body,
    }), 'Containment action completed'));
  },
};
