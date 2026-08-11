import type { IUser, IWorkspace } from '../auth/model.js';
import { userRepository, workspaceRepository } from '../auth/repository.js';
import type { JwtPayload, SanitizedUser } from '../auth/types.js';
import { AuthenticationError, AuthorizationError, NotFoundError } from '../../errors/index.js';
import { config } from '../../config/env.js';
import { generateAccessToken } from '../../utils/jwt.js';
import type { IdentityRequestContext } from './requestContext.js';
import { effectivePermissions, normalizeRole, permissionsForRole } from './permissions.js';
import type { Permission } from './permissions.js';
import { hashSecret, randomSecret, safeSecretEqual } from './crypto.js';
import { credentialRepository, organizationRepository, serviceAccountRepository, sessionRepository } from './repository.js';
import { recordSecurityEvent } from './securityEvents.js';

export interface AuthenticatedIdentity {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  organizationId?: string;
  permissions: Permission[];
  actorType: 'user' | 'service_account';
  sessionId?: string;
  credentialId?: string;
  riskScore?: number;
  mfaVerified?: boolean;
}

function requiresMfa(requiredRoles: readonly string[], role: string): boolean {
  const normalized = normalizeRole(role);
  return requiredRoles.includes(normalized)
    || (normalized === 'organization_owner' && requiredRoles.includes('workspace_owner'));
}

export function sanitizeIdentityUser(user: IUser, role: string, workspaceId: string, workspace?: IWorkspace): SanitizedUser {
  const enrollmentRequired = requiresMfa(
    workspace?.settings.requireMfaForRoles ?? [], role,
  ) && !(user.mfa?.enabled ?? false);
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatar: user.avatar,
    role: normalizeRole(role),
    status: user.status,
    emailVerified: user.emailVerified,
    workspaceId,
    organizationId: workspace?.organizationId?.toString() ?? user.organizationId?.toString(),
    permissions: permissionsForRole(role),
    mfa: {
      enabled: user.mfa?.enabled ?? false,
      emailOtpEnabled: user.mfa?.emailOtpEnabled ?? false,
      enrollmentRequired,
    },
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function idleExpiry(workspace: IWorkspace): Date {
  const minutes = workspace.settings.sessionIdleMinutes ?? config.identity.sessionIdleTimeoutMinutes;
  return new Date(Date.now() + minutes * 60_000);
}

function absoluteExpiry(workspace: IWorkspace, rememberMe: boolean): Date {
  const policyDays = workspace.settings.sessionMaxDays ?? config.identity.sessionMaxDays;
  const days = rememberMe ? policyDays : Math.min(policyDays, 1);
  return new Date(Date.now() + days * 24 * 60 * 60_000);
}

function riskScore(context: IdentityRequestContext, priorDevices: string[]): number {
  let score = 0;
  if (context.userAgent === 'Unknown user agent') score += 20;
  if (!priorDevices.includes(context.deviceIdHash)) score += 25;
  if (context.ipAddress === 'unknown') score += 10;
  return Math.min(score, 100);
}

function rawRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

function parseRefreshToken(value: string): { sessionId: string; secret: string } {
  const separator = value.indexOf('.');
  if (separator <= 0 || separator === value.length - 1) {
    throw new AuthenticationError('Invalid refresh token');
  }
  const sessionId = value.slice(0, separator);
  if (!/^[a-f\d]{24}$/i.test(sessionId)) throw new AuthenticationError('Invalid refresh token');
  return { sessionId, secret: value.slice(separator + 1) };
}

function jwtPayload(user: IUser, role: string, workspaceId: string, sessionId: string): JwtPayload {
  return {
    sub: user._id.toString(),
    email: user.email,
    role: normalizeRole(role),
    workspaceId,
    sessionId,
    securityStamp: user.securityStamp ?? 1,
  };
}

async function membership(workspaceId: string, userId: string) {
  const value = await workspaceRepository.findMembership(workspaceId, userId);
  if (!value) throw new AuthorizationError('Workspace membership is inactive or missing');
  if (value.workspace.organizationId) {
    const organization = await organizationRepository.findActiveMembership(
      value.workspace.organizationId.toString(),
      userId,
    );
    if (!organization) throw new AuthorizationError('Organization membership is inactive or missing');
    if (organization.ownerId.toString() === userId) {
      return { ...value, role: 'organization_owner' };
    }
  }
  return value;
}

export const identitySessionService = {
  async create(
    user: IUser,
    context: IdentityRequestContext,
    rememberMe: boolean,
    authMethods: string[],
    rotateDeviceId = true,
  ) {
    const sessionDeviceId = rotateDeviceId ? randomSecret(24) : context.deviceId;
    const sessionContext = {
      ...context,
      deviceId: sessionDeviceId,
      deviceIdHash: hashSecret(sessionDeviceId),
    };
    const currentMembership = await membership(user.workspaceId.toString(), user._id.toString());
    const existingSessions = await sessionRepository.listForUser(user._id.toString());
    const maxActiveSessions = currentMembership.workspace.settings.maxActiveSessions ?? 10;
    const activeSessions = existingSessions.filter((candidate) => !candidate.revokedAt);
    const overflow = activeSessions.slice(Math.max(0, maxActiveSessions - 1));
    await Promise.all(overflow.map((candidate) => (
      sessionRepository.revoke(candidate._id.toString(), user._id.toString(), 'active_session_limit')
    )));
    const secret = randomSecret();
    const session = await sessionRepository.create({
      userId: user._id,
      workspaceId: currentMembership.workspace._id,
      familyId: randomSecret(24),
      tokenHash: hashSecret(secret),
      usedTokenHashes: [],
      rotationCounter: 0,
      authMethods,
      mfaVerifiedAt: authMethods.length > 1 ? new Date() : undefined,
      deviceIdHash: sessionContext.deviceIdHash,
      deviceName: sessionContext.deviceName,
      browser: sessionContext.browser,
      os: sessionContext.os,
      deviceType: sessionContext.deviceType,
      userAgent: sessionContext.userAgent,
      ipAddress: sessionContext.ipAddress,
      location: sessionContext.location,
      riskScore: riskScore(sessionContext, existingSessions.map((candidate) => candidate.deviceIdHash)),
      lastActiveAt: new Date(),
      idleExpiresAt: idleExpiry(currentMembership.workspace),
      expiresAt: absoluteExpiry(currentMembership.workspace, rememberMe),
    });
    const sessionId = session._id.toString();
    await recordSecurityEvent({
      workspaceId: currentMembership.workspace._id.toString(),
      organizationId: currentMembership.workspace.organizationId?.toString(),
      userId: user._id.toString(),
      actorType: 'user',
      actorId: user._id.toString(),
      sessionId,
      type: 'session.created',
      outcome: 'success',
      ipAddress: sessionContext.ipAddress,
      userAgent: sessionContext.userAgent,
      requestId: sessionContext.requestId,
      metadata: { deviceName: sessionContext.deviceName, riskScore: session.riskScore, authMethods },
    });
    return {
      user: sanitizeIdentityUser(user, currentMembership.role, currentMembership.workspace._id.toString(), currentMembership.workspace),
      accessToken: generateAccessToken(jwtPayload(user, currentMembership.role, currentMembership.workspace._id.toString(), sessionId)),
      refreshToken: rawRefreshToken(sessionId, secret),
      refreshExpiresAt: session.expiresAt,
      deviceId: sessionContext.deviceId,
    };
  },

  async rotate(refreshToken: string, context: IdentityRequestContext) {
    const { sessionId, secret } = parseRefreshToken(refreshToken);
    const session = await sessionRepository.findByIdWithSecrets(sessionId);
    const presentedHash = hashSecret(secret);
    if (!session) throw new AuthenticationError('Invalid refresh token');

    if (session.usedTokenHashes.some((used) => safeSecretEqual(used, secret))) {
      await sessionRepository.revokeById(sessionId, 'refresh_token_replay');
      await recordSecurityEvent({
        workspaceId: session.workspaceId.toString(),
        userId: session.userId.toString(),
        actorType: 'anonymous',
        sessionId,
        type: 'session.refresh_replay',
        outcome: 'denied',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });
      throw new AuthenticationError('Refresh token replay detected; the session was revoked');
    }
    if (
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.idleExpiresAt <= new Date() ||
      !safeSecretEqual(session.tokenHash, secret)
    ) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    if (session.deviceIdHash !== context.deviceIdHash) {
      await sessionRepository.revokeById(sessionId, 'device_binding_mismatch');
      await recordSecurityEvent({
        workspaceId: session.workspaceId.toString(),
        userId: session.userId.toString(),
        actorType: 'anonymous',
        sessionId,
        type: 'session.device_mismatch',
        outcome: 'denied',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });
      throw new AuthenticationError('Session device binding failed');
    }

    const user = await userRepository.findById(session.userId.toString());
    if (!user || user.status !== 'active') throw new AuthenticationError('User is inactive');
    const currentMembership = await membership(session.workspaceId.toString(), user._id.toString());
    const nextSecret = randomSecret();
    const rotated = await sessionRepository.rotate(
      sessionId,
      presentedHash,
      hashSecret(nextSecret),
      idleExpiry(currentMembership.workspace),
      currentMembership.workspace._id.toString(),
    );
    if (!rotated) {
      const current = await sessionRepository.findByIdWithSecrets(sessionId);
      if (current?.usedTokenHashes.includes(presentedHash)) {
        await sessionRepository.revokeById(sessionId, 'concurrent_refresh_replay');
        throw new AuthenticationError('Refresh token replay detected; the session was revoked');
      }
      throw new AuthenticationError('Refresh token rotation failed');
    }
    await recordSecurityEvent({
      workspaceId: currentMembership.workspace._id.toString(),
      organizationId: currentMembership.workspace.organizationId?.toString(),
      userId: user._id.toString(),
      actorType: 'user',
      actorId: user._id.toString(),
      sessionId,
      type: 'session.refreshed',
      outcome: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      metadata: { rotationCounter: rotated.rotationCounter },
    });
    return {
      user: sanitizeIdentityUser(user, currentMembership.role, currentMembership.workspace._id.toString(), currentMembership.workspace),
      accessToken: generateAccessToken(jwtPayload(user, currentMembership.role, currentMembership.workspace._id.toString(), sessionId)),
      refreshToken: rawRefreshToken(sessionId, nextSecret),
      refreshExpiresAt: rotated.expiresAt,
      deviceId: context.deviceId,
    };
  },

  async authenticate(payload: JwtPayload, context: IdentityRequestContext): Promise<AuthenticatedIdentity> {
    if (!payload.sessionId) throw new AuthenticationError('Session-bound access token required');
    const session = await sessionRepository.findActiveById(payload.sessionId);
    if (!session || session.userId.toString() !== payload.sub) {
      throw new AuthenticationError('Session is revoked or expired');
    }
    if (session.deviceIdHash !== context.deviceIdHash) {
      await recordSecurityEvent({
        workspaceId: session.workspaceId.toString(), userId: session.userId.toString(),
        actorType: 'anonymous', sessionId: payload.sessionId,
        type: 'session.access_device_mismatch', outcome: 'denied', ipAddress: context.ipAddress,
        userAgent: context.userAgent, requestId: context.requestId,
      });
      throw new AuthenticationError('Access token device binding failed');
    }
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'active' || (user.securityStamp ?? 1) !== payload.securityStamp) {
      throw new AuthenticationError('Identity state changed; authenticate again');
    }
    if (session.workspaceId.toString() !== payload.workspaceId) {
      throw new AuthenticationError('Session workspace does not match token');
    }
    const currentMembership = await membership(payload.workspaceId, payload.sub);
    const requiredMfa = currentMembership.workspace.settings.requireMfaForRoles ?? [];
    if (requiresMfa(requiredMfa, currentMembership.role) && user.mfa.enabled && !session.mfaVerifiedAt) {
      throw new AuthenticationError('Workspace policy requires multi-factor authentication');
    }
    const permissions = requiresMfa(requiredMfa, currentMembership.role) && !user.mfa.enabled
      ? permissionsForRole(currentMembership.role).filter((permission) => (
        permission === 'identity.mfa.manage' || permission === 'identity.sessions.manage'
      ))
      : permissionsForRole(currentMembership.role);
    void sessionRepository.touch(
      payload.sessionId,
      idleExpiry(currentMembership.workspace),
      context.ipAddress,
    );
    return {
      id: user._id.toString(),
      email: user.email,
      role: normalizeRole(currentMembership.role),
      workspaceId: currentMembership.workspace._id.toString(),
      organizationId: currentMembership.workspace.organizationId?.toString(),
      permissions,
      actorType: 'user',
      sessionId: payload.sessionId,
      riskScore: session.riskScore,
      mfaVerified: Boolean(session.mfaVerifiedAt),
    };
  },

  async authenticateCredential(rawToken: string, context: IdentityRequestContext): Promise<AuthenticatedIdentity> {
    const match = rawToken.match(/^(nxk|npt|nxs)_([A-Za-z0-9_-]{8,64})\.([A-Za-z0-9_-]{20,})$/);
    if (!match) throw new AuthenticationError('Invalid API credential');
    const prefix = `${match[1]}_${match[2]}`;
    const secret = match[3] as string;
    const credential = await credentialRepository.findByPrefixWithSecret(prefix);
    if (
      !credential || credential.revokedAt ||
      (credential.expiresAt && credential.expiresAt <= new Date()) ||
      !safeSecretEqual(credential.secretHash, secret)
    ) {
      throw new AuthenticationError('Invalid or expired API credential');
    }

    if (credential.serviceAccountId) {
      const account = await serviceAccountRepository.findActiveById(
        credential.serviceAccountId.toString(),
        credential.workspaceId.toString(),
      );
      if (!account) throw new AuthenticationError('Service account is disabled');
      const serviceWorkspace = await workspaceRepository.findById(account.workspaceId.toString());
      if (!serviceWorkspace) throw new AuthenticationError('Service account workspace is unavailable');
      if (
        serviceWorkspace.organizationId &&
        !await organizationRepository.findActiveById(serviceWorkspace.organizationId.toString())
      ) throw new AuthenticationError('Service account organization is unavailable');
      const allowed = new Set(account.permissions);
      const permissions = credential.permissions.filter((permission) => allowed.has(permission));
      void Promise.all([
        credentialRepository.touch(credential._id.toString(), context.ipAddress),
        serviceAccountRepository.touch(account._id.toString()),
      ]);
      await recordSecurityEvent({
        workspaceId: account.workspaceId.toString(), organizationId: serviceWorkspace.organizationId?.toString(),
        actorType: 'service_account',
        actorId: account._id.toString(), type: 'credential.used', outcome: 'success',
        ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId,
        metadata: { credentialId: credential._id.toString(), prefix: credential.prefix },
      });
      return {
        id: account._id.toString(),
        email: `service-${account._id.toString()}@nexpulse.internal`,
        role: 'service_account',
        workspaceId: account.workspaceId.toString(),
        organizationId: serviceWorkspace.organizationId?.toString(),
        permissions,
        actorType: 'service_account',
        credentialId: credential._id.toString(),
      };
    }

    if (!credential.userId) throw new AuthenticationError('Credential subject is missing');
    const user = await userRepository.findById(credential.userId.toString());
    if (!user || user.status !== 'active') throw new AuthenticationError('Credential owner is inactive');
    const currentMembership = await membership(credential.workspaceId.toString(), user._id.toString());
    void credentialRepository.touch(credential._id.toString(), context.ipAddress);
    await recordSecurityEvent({
      workspaceId: credential.workspaceId.toString(), organizationId: currentMembership.workspace.organizationId?.toString(),
      userId: user._id.toString(), actorType: 'user', actorId: user._id.toString(),
      type: 'credential.used', outcome: 'success', ipAddress: context.ipAddress,
      userAgent: context.userAgent, requestId: context.requestId,
      metadata: { credentialId: credential._id.toString(), prefix: credential.prefix },
    });
    return {
      id: user._id.toString(),
      email: user.email,
      role: normalizeRole(currentMembership.role),
      workspaceId: currentMembership.workspace._id.toString(),
      organizationId: currentMembership.workspace.organizationId?.toString(),
      permissions: effectivePermissions(currentMembership.role, credential.permissions),
      actorType: 'user',
      credentialId: credential._id.toString(),
    };
  },

  async list(userId: string, currentSessionId?: string) {
    const sessions = await sessionRepository.listForUser(userId);
    return sessions.map((session) => ({
      id: session._id.toString(),
      current: session._id.toString() === currentSessionId,
      deviceName: session.deviceName,
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      location: session.location,
      riskScore: session.riskScore,
      authMethods: session.authMethods,
      lastActiveAt: session.lastActiveAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString(),
      revokeReason: session.revokeReason,
    }));
  },

  async logout(refreshToken: string | undefined, reason = 'logout') {
    if (!refreshToken) return;
    try {
      const { sessionId, secret } = parseRefreshToken(refreshToken);
      const session = await sessionRepository.findByIdWithSecrets(sessionId);
      if (session && safeSecretEqual(session.tokenHash, secret)) {
        await sessionRepository.revokeById(sessionId, reason);
        await recordSecurityEvent({
          workspaceId: session.workspaceId.toString(), userId: session.userId.toString(),
          actorType: 'user', actorId: session.userId.toString(), sessionId,
          type: 'identity.logout', outcome: 'success', metadata: { reason },
        });
      }
    } catch {
      // Logout is idempotent and does not reveal whether a cookie was valid.
    }
  },

  async revoke(userId: string, sessionId: string, currentSessionId?: string) {
    const session = await sessionRepository.revoke(sessionId, userId, 'remote_logout');
    if (!session) throw new NotFoundError('Session not found');
    await recordSecurityEvent({
      workspaceId: session.workspaceId.toString(), userId, actorType: 'user', actorId: userId,
      sessionId: currentSessionId, type: 'session.revoked', outcome: 'success',
      metadata: { revokedSessionId: sessionId },
    });
    return { revokedCurrentSession: sessionId === currentSessionId };
  },

  revokeAll(userId: string, currentSessionId?: string) {
    return sessionRepository.revokeAllForUser(userId, 'remote_logout_all', currentSessionId);
  },

  async switchWorkspace(user: IUser, sessionId: string, workspaceId: string) {
    const currentMembership = await membership(workspaceId, user._id.toString());
    const session = await sessionRepository.updateWorkspace(sessionId, user._id.toString(), workspaceId);
    if (!session) throw new AuthenticationError('Session is no longer active');
    await userRepository.updateWorkspace(user._id.toString(), workspaceId, normalizeRole(currentMembership.role));
    await recordSecurityEvent({
      workspaceId, organizationId: currentMembership.workspace.organizationId?.toString(), userId: user._id.toString(),
      actorType: 'user', actorId: user._id.toString(), sessionId,
      type: 'workspace.switched', outcome: 'success',
    });
    return {
      accessToken: generateAccessToken(jwtPayload(user, currentMembership.role, workspaceId, sessionId)),
      role: normalizeRole(currentMembership.role),
      permissions: permissionsForRole(currentMembership.role),
    };
  },
};
