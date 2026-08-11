import type { Request, Response } from 'express';
import { AuthenticationError, ValidationError } from '../../errors/index.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { parsePagination } from '../../utils/pagination.js';
import { identityRequestContext } from './requestContext.js';
import { mfaService } from './mfaService.js';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from './permissions.js';
import { identitySessionService } from './sessionService.js';
import {
  credentialService,
  enterpriseSsoService,
  identityAuditService,
  identityInfoService,
  invitationService,
  policyService,
  teamIdentityService,
} from './service.js';

function identity(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

function interactiveUser(req: Request): NonNullable<Request['user']> & { sessionId: string } {
  return identity(req) as NonNullable<Request['user']> & { sessionId: string };
}

function pageQuery(req: Request) {
  // The wire contract for these two endpoints uses `limit`, not `pageSize` —
  // map it through to the shared pagination parser instead of duplicating its logic.
  const { page, pageSize } = parsePagination(
    { page: req.query['page'] as string | undefined, pageSize: req.query['limit'] as string | undefined },
    25,
  );
  return { page, limit: pageSize };
}

function objectId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ValidationError({ [field]: ['Invalid identifier'] });
  }
  return value;
}

export const identityController = {
  info(_req: Request, res: Response): void {
    res.status(200).json(apiResponse({
      roles: ROLES,
      permissions: PERMISSIONS,
      rolePermissions: ROLE_PERMISSIONS,
      security: identityInfoService.securityConfiguration(),
    }));
  },

  async sessions(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await identitySessionService.list(current.id, current.sessionId)));
  },
  async revokeSession(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const result = await identitySessionService.revoke(current.id, objectId(req.params['sessionId'], 'sessionId'), current.sessionId);
    res.status(200).json(apiResponse(result, 'Session revoked'));
  },
  async revokeOtherSessions(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const result = await identitySessionService.revokeAll(current.id, current.sessionId);
    res.status(200).json(apiResponse({ revoked: result.modifiedCount }, 'Other sessions revoked'));
  },

  async mfaStatus(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await mfaService.status(interactiveUser(req).id)));
  },
  async beginTotp(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await mfaService.beginTotpSetup(current.id, req.body.password)));
  },
  async confirmTotp(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await mfaService.confirmTotp(current.id, req.body.code, current.sessionId), 'Authenticator enabled; sign in again after saving recovery codes'));
  },
  async enableEmailOtp(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await mfaService.enableEmailOtp(current.id, req.body.password, current.sessionId), 'Email OTP enabled; sign in again'));
  },
  async regenerateRecoveryCodes(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await mfaService.regenerateRecoveryCodes(current.id, req.body.code), 'Previous recovery codes are invalid'));
  },
  async removeTrustedDevice(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const deviceId = req.params['deviceId'];
    if (typeof deviceId !== 'string' || !/^[a-f\d]{64}$/i.test(deviceId)) {
      throw new ValidationError({ deviceId: ['Invalid trusted device identifier'] });
    }
    await mfaService.removeTrustedDevice(current.id, deviceId, current.sessionId);
    res.status(200).json(apiResponse(null, 'Trusted device removed and its sessions revoked'));
  },
  async disableMfa(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    await mfaService.disable(current.id, req.body.password, req.body.code, current.sessionId);
    res.status(200).json(apiResponse(null, 'Multi-factor authentication disabled; sign in again'));
  },

  async credentials(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await credentialService.listUserCredentials(current.workspaceId, current.id)));
  },
  async createCredential(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const result = await credentialService.createUserCredential({
      workspaceId: current.workspaceId, userId: current.id, actorPermissions: current.permissions,
      ...req.body, context: identityRequestContext(req),
    });
    res.status(201).json(apiResponse(result, 'Copy this credential now; it will not be shown again'));
  },
  async revokeCredential(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    await credentialService.revokeUserCredential(current.workspaceId, current.id, objectId(req.params['credentialId'], 'credentialId'));
    res.status(200).json(apiResponse(null, 'Credential revoked'));
  },
  async rotateCredential(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const result = await credentialService.rotateUserCredential(current.workspaceId, current.id, objectId(req.params['credentialId'], 'credentialId'));
    res.status(201).json(apiResponse(result, 'Credential rotated; copy the replacement now'));
  },

  async serviceAccounts(req: Request, res: Response): Promise<void> {
    const current = identity(req);
    res.status(200).json(apiResponse(await credentialService.listServiceAccounts(current.workspaceId)));
  },
  async createServiceAccount(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const result = await credentialService.createServiceAccount({
      workspaceId: current.workspaceId, userId: current.id, actorPermissions: current.permissions, ...req.body,
    });
    res.status(201).json(apiResponse(result, 'Copy this service token now; it will not be shown again'));
  },
  async disableServiceAccount(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    await credentialService.disableServiceAccount(current.workspaceId, objectId(req.params['serviceAccountId'], 'serviceAccountId'), current.id);
    res.status(200).json(apiResponse(null, 'Service account disabled'));
  },
  async rotateServiceToken(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const result = await credentialService.rotateServiceToken(current.workspaceId, objectId(req.params['serviceAccountId'], 'serviceAccountId'), current.id);
    res.status(201).json(apiResponse(result, 'Service token rotated; copy the replacement now'));
  },

  async invitations(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await invitationService.list(identity(req).workspaceId)));
  },
  async members(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await teamIdentityService.members(identity(req).workspaceId)));
  },
  async updateMemberRole(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    await teamIdentityService.updateRole({
      workspaceId: current.workspaceId, actorId: current.id, actorRole: current.role,
      memberId: objectId(req.params['memberId'], 'memberId'), role: req.body.role,
    });
    res.status(200).json(apiResponse(null, 'Member role updated'));
  },
  async removeMember(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    await teamIdentityService.remove({
      workspaceId: current.workspaceId, actorId: current.id, actorRole: current.role,
      memberId: objectId(req.params['memberId'], 'memberId'),
    });
    res.status(200).json(apiResponse(null, 'Member removed'));
  },
  async createInvitation(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const invitation = await invitationService.create({ workspaceId: current.workspaceId, actorId: current.id, actorRole: current.role, ...req.body });
    res.status(201).json(apiResponse(invitation, 'Invitation sent'));
  },
  async resendInvitation(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await invitationService.resend(current.workspaceId, objectId(req.params['invitationId'], 'invitationId'), current.id), 'Invitation resent'));
  },
  async revokeInvitation(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    await invitationService.revoke(current.workspaceId, objectId(req.params['invitationId'], 'invitationId'), current.id);
    res.status(200).json(apiResponse(null, 'Invitation revoked'));
  },
  async respondInvitation(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await invitationService.respond(current.id, req.body.token, req.body.action)));
  },

  async mySecurityEvents(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    const { page, limit } = pageQuery(req);
    res.status(200).json(apiResponse(await identityAuditService.listForUser(current.id, page, limit)));
  },
  async workspaceAudit(req: Request, res: Response): Promise<void> {
    const current = identity(req);
    const { page, limit } = pageQuery(req);
    const type = typeof req.query['type'] === 'string' ? req.query['type'].slice(0, 100) : undefined;
    res.status(200).json(apiResponse(await identityAuditService.listForWorkspace(current.workspaceId, page, limit, type)));
  },
  async policies(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await policyService.get(identity(req).workspaceId)));
  },
  async updatePolicies(req: Request, res: Response): Promise<void> {
    const current = interactiveUser(req);
    res.status(200).json(apiResponse(await policyService.update(current.workspaceId, req.body, current.id), 'Identity policies updated'));
  },
  async ssoReadiness(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await enterpriseSsoService.readiness(identity(req).organizationId)));
  },
};
