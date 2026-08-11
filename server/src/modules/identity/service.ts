import { config } from '../../config/env.js';
import { AppError, AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../errors/index.js';
import { emailService } from '../../services/email/index.js';
import { userRepository, workspaceRepository } from '../auth/repository.js';
import { hashSecret, randomSecret } from './crypto.js';
import type { IdentityRequestContext } from './requestContext.js';
import {
  credentialRepository,
  invitationRepository,
  securityEventRepository,
  sessionRepository,
  serviceAccountRepository,
  ssoConfigurationRepository,
} from './repository.js';
import { canAssignRole, isPermission, normalizeRole } from './permissions.js';
import type { CredentialType, ISecurityEvent } from './model.js';
import type { IdentityRole, Permission } from './permissions.js';
import { recordSecurityEvent } from './securityEvents.js';

function assertScopes(actorPermissions: readonly Permission[], requested: readonly string[]): Permission[] {
  const invalid = requested.find((permission) => !isPermission(permission));
  if (invalid) throw new ValidationError({ permissions: [`Unknown permission: ${invalid}`] });
  const actor = new Set(actorPermissions);
  const elevated = requested.find((permission) => !actor.has(permission as Permission));
  if (elevated) throw new AuthorizationError(`Cannot grant permission you do not hold: ${elevated}`);
  return Array.from(new Set(requested)) as Permission[];
}

function credentialToken(type: CredentialType) {
  const marker = type === 'api_key' ? 'nxk' : type === 'personal_access_token' ? 'npt' : 'nxs';
  const publicId = randomSecret(12);
  const secret = randomSecret(32);
  return { prefix: `${marker}_${publicId}`, secret, raw: `${marker}_${publicId}.${secret}` };
}

function publicCredential(credential: Awaited<ReturnType<typeof credentialRepository.create>>) {
  return {
    id: credential._id.toString(),
    type: credential.type,
    name: credential.name,
    prefix: credential.prefix,
    permissions: credential.permissions,
    expiresAt: credential.expiresAt?.toISOString(),
    lastUsedAt: credential.lastUsedAt?.toISOString(),
    lastUsedIp: credential.lastUsedIp,
    revokedAt: credential.revokedAt?.toISOString(),
    createdAt: credential.createdAt.toISOString(),
  };
}

export const credentialService = {
  async createUserCredential(input: {
    workspaceId: string;
    userId: string;
    actorPermissions: Permission[];
    type: 'api_key' | 'personal_access_token';
    name: string;
    permissions: string[];
    expiresAt?: Date;
    context: IdentityRequestContext;
  }) {
    const workspace = await workspaceRepository.findForMember(input.workspaceId, input.userId);
    if (!workspace) throw new AuthorizationError('Workspace membership is required');
    if (workspace.settings.allowApiKeys === false) throw new AuthorizationError('API credentials are disabled by workspace policy');
    const token = credentialToken(input.type);
    const credential = await credentialRepository.create({
      workspaceId: workspace._id,
      userId: input.userId as never,
      type: input.type,
      name: input.name,
      prefix: token.prefix,
      secretHash: hashSecret(token.secret),
      permissions: assertScopes(input.actorPermissions, input.permissions),
      expiresAt: input.expiresAt,
    });
    await recordSecurityEvent({
      workspaceId: input.workspaceId, userId: input.userId, actorType: 'user', actorId: input.userId,
      type: 'credential.created', outcome: 'success', ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent, requestId: input.context.requestId,
      metadata: { credentialId: credential._id.toString(), type: input.type, prefix: token.prefix },
    });
    return { credential: publicCredential(credential), token: token.raw };
  },

  async listUserCredentials(workspaceId: string, userId: string) {
    return (await credentialRepository.list(workspaceId, userId)).map(publicCredential);
  },

  async revokeUserCredential(workspaceId: string, userId: string, id: string) {
    const credential = await credentialRepository.revoke(workspaceId, id, userId);
    if (!credential) throw new NotFoundError('Credential not found');
    await recordSecurityEvent({
      workspaceId, userId, actorType: 'user', actorId: userId,
      type: 'credential.revoked', outcome: 'success', metadata: { credentialId: id },
    });
  },

  async rotateUserCredential(workspaceId: string, userId: string, id: string) {
    const existing = await credentialRepository.findOwned(workspaceId, id, userId);
    if (!existing || existing.type === 'service_token') throw new NotFoundError('Credential not found');
    const token = credentialToken(existing.type);
    const replacement = await credentialRepository.create({
      workspaceId: existing.workspaceId, userId: existing.userId, type: existing.type,
      name: existing.name, prefix: token.prefix, secretHash: hashSecret(token.secret),
      permissions: existing.permissions, expiresAt: existing.expiresAt,
    });
    await credentialRepository.revoke(workspaceId, id, userId);
    await recordSecurityEvent({
      workspaceId, userId, actorType: 'user', actorId: userId,
      type: 'credential.rotated', outcome: 'success',
      metadata: { previousCredentialId: id, credentialId: replacement._id.toString(), prefix: token.prefix },
    });
    return { credential: publicCredential(replacement), token: token.raw };
  },

  async createServiceAccount(input: {
    workspaceId: string;
    userId: string;
    actorPermissions: Permission[];
    name: string;
    description?: string;
    purpose: 'automation' | 'integration' | 'bot' | 'ci_cd';
    permissions: string[];
    expiresAt?: Date;
  }) {
    const workspace = await workspaceRepository.findForMember(input.workspaceId, input.userId);
    if (!workspace) throw new AuthorizationError('Workspace membership is required');
    if (workspace.settings.allowServiceAccounts === false) throw new AuthorizationError('Service accounts are disabled by workspace policy');
    const permissions = assertScopes(input.actorPermissions, input.permissions);
    const account = await serviceAccountRepository.create({
      workspaceId: workspace._id,
      name: input.name,
      description: input.description,
      purpose: input.purpose,
      permissions,
      createdBy: input.userId as never,
    });
    const token = credentialToken('service_token');
    const credential = await credentialRepository.create({
      workspaceId: workspace._id,
      serviceAccountId: account._id,
      type: 'service_token',
      name: `${input.name} token`,
      prefix: token.prefix,
      secretHash: hashSecret(token.secret),
      permissions,
      expiresAt: input.expiresAt,
    });
    await recordSecurityEvent({
      workspaceId: input.workspaceId, userId: input.userId, actorType: 'user', actorId: input.userId,
      type: 'service_account.created', outcome: 'success',
      metadata: { serviceAccountId: account._id.toString(), credentialId: credential._id.toString() },
    });
    return {
      account: {
        id: account._id.toString(), name: account.name, description: account.description, purpose: account.purpose,
        permissions: account.permissions, status: account.status, createdAt: account.createdAt.toISOString(),
      },
      token: token.raw,
    };
  },

  async listServiceAccounts(workspaceId: string) {
    return (await serviceAccountRepository.list(workspaceId)).map((account) => ({
      id: account._id.toString(), name: account.name, description: account.description, purpose: account.purpose,
      permissions: account.permissions, status: account.status,
      lastUsedAt: account.lastUsedAt?.toISOString(), createdAt: account.createdAt.toISOString(),
    }));
  },

  async disableServiceAccount(workspaceId: string, id: string, actorId: string) {
    const account = await serviceAccountRepository.disable(workspaceId, id);
    if (!account) throw new NotFoundError('Service account not found');
    await credentialRepository.revokeForServiceAccount(workspaceId, id);
    await recordSecurityEvent({
      workspaceId, userId: actorId, actorType: 'user', actorId,
      type: 'service_account.disabled', outcome: 'success', metadata: { serviceAccountId: id },
    });
  },

  async rotateServiceToken(workspaceId: string, id: string, actorId: string, expiresAt?: Date) {
    const account = await serviceAccountRepository.findActiveById(id, workspaceId);
    if (!account) throw new NotFoundError('Active service account not found');
    const token = credentialToken('service_token');
    const credential = await credentialRepository.create({
      workspaceId: account.workspaceId, serviceAccountId: account._id, type: 'service_token',
      name: `${account.name} token`, prefix: token.prefix, secretHash: hashSecret(token.secret),
      permissions: account.permissions, expiresAt,
    });
    await credentialRepository.revokeForServiceAccount(workspaceId, id, credential._id.toString());
    await recordSecurityEvent({
      workspaceId, userId: actorId, actorType: 'user', actorId,
      type: 'service_account.token_rotated', outcome: 'success',
      metadata: { serviceAccountId: id, credentialId: credential._id.toString() },
    });
    return { token: token.raw, credential: publicCredential(credential) };
  },
};

function publicInvitation(invitation: Awaited<ReturnType<typeof invitationRepository.create>>) {
  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

export const invitationService = {
  async create(input: {
    workspaceId: string;
    actorId: string;
    actorRole: string;
    email: string;
    role: IdentityRole;
  }) {
    if (!emailService.isConfigured()) {
      throw new AppError('Email delivery must be configured before invitations can be sent', 503, 'EMAIL_UNAVAILABLE');
    }
    const workspace = await workspaceRepository.findForMember(input.workspaceId, input.actorId);
    if (!workspace) throw new AuthorizationError('Workspace membership is required');
    if (!workspace.settings.allowInvitations) throw new AuthorizationError('Invitations are disabled');
    if (!canAssignRole(input.actorRole, input.role)) throw new AuthorizationError('Cannot assign this role');
    const allowedDomains = workspace.settings.allowedEmailDomains ?? [];
    const domain = input.email.split('@')[1]?.toLowerCase();
    if (allowedDomains.length > 0 && (!domain || !allowedDomains.includes(domain))) {
      throw new ValidationError({ email: ['Email domain is not allowed by workspace policy'] });
    }
    if (await invitationRepository.findPending(input.workspaceId, input.email)) {
      throw new ConflictError('A pending invitation already exists for this email');
    }
    const invitedUser = await userRepository.findByEmail(input.email);
    if (invitedUser && await workspaceRepository.findMembership(input.workspaceId, invitedUser._id.toString())) {
      throw new ConflictError('This user is already a workspace member');
    }
    const token = randomSecret();
    const invitation = await invitationRepository.create({
      workspaceId: workspace._id,
      organizationId: workspace.organizationId,
      email: input.email,
      role: normalizeRole(input.role),
      tokenHash: hashSecret(token),
      invitedBy: input.actorId as never,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    });
    const sent = await emailService.sendInvitationEmail('there', input.email, workspace.name, token);
    if (!sent) {
      await invitationRepository.revoke(input.workspaceId, invitation._id.toString());
      throw new AppError('The invitation could not be delivered', 503, 'EMAIL_DELIVERY_FAILED');
    }
    await recordSecurityEvent({
      workspaceId: input.workspaceId, organizationId: workspace.organizationId?.toString(),
      userId: input.actorId, actorType: 'user', actorId: input.actorId,
      type: 'invitation.created', outcome: 'success', metadata: { invitationId: invitation._id.toString(), role: input.role },
    });
    return publicInvitation(invitation);
  },

  async list(workspaceId: string) {
    return (await invitationRepository.list(workspaceId)).map(publicInvitation);
  },

  async resend(workspaceId: string, id: string, actorId: string) {
    if (!emailService.isConfigured()) {
      throw new AppError('Email delivery must be configured before invitations can be sent', 503, 'EMAIL_UNAVAILABLE');
    }
    const existing = await invitationRepository.findById(workspaceId, id);
    if (!existing || existing.status !== 'pending') throw new NotFoundError('Pending invitation not found');
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    const token = randomSecret();
    const previousTokenHash = existing.tokenHash;
    const previousExpiresAt = existing.expiresAt;
    const updated = await invitationRepository.updateToken(id, hashSecret(token), new Date(Date.now() + 7 * 24 * 60 * 60_000));
    const sent = await emailService.sendInvitationEmail('there', existing.email, workspace.name, token);
    if (!sent) {
      await invitationRepository.restoreToken(id, previousTokenHash, previousExpiresAt);
      throw new AppError('The invitation could not be delivered', 503, 'EMAIL_DELIVERY_FAILED');
    }
    await recordSecurityEvent({
      workspaceId, userId: actorId, actorType: 'user', actorId,
      type: 'invitation.resent', outcome: 'success', metadata: { invitationId: id },
    });
    return updated ? publicInvitation(updated) : null;
  },

  async revoke(workspaceId: string, id: string, actorId: string) {
    if (!await invitationRepository.revoke(workspaceId, id)) throw new NotFoundError('Pending invitation not found');
    await recordSecurityEvent({
      workspaceId, userId: actorId, actorType: 'user', actorId,
      type: 'invitation.revoked', outcome: 'success', metadata: { invitationId: id },
    });
  },

  async respond(userId: string, token: string, action: 'accept' | 'decline') {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const invitation = await invitationRepository.findPendingByTokenHash(hashSecret(token));
    if (!invitation || invitation.email !== user.email) throw new NotFoundError('Invitation not found or expired');
    if (action === 'decline') {
      await invitationRepository.decline(invitation._id.toString(), userId);
      return { accepted: false };
    }
    if (!await invitationRepository.acceptWithMembership(invitation._id.toString(), userId)) {
      throw new ConflictError('Invitation was already processed');
    }
    await recordSecurityEvent({
      workspaceId: invitation.workspaceId.toString(), organizationId: invitation.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId, type: 'invitation.accepted', outcome: 'success',
      metadata: { invitationId: invitation._id.toString(), role: invitation.role },
    });
    return { accepted: true, workspaceId: invitation.workspaceId.toString() };
  },
};

export const identityAuditService = {
  async listForUser(userId: string, page: number, limit: number) {
    const result = await securityEventRepository.list({ userId } as never, page, limit);
    return pagedEvents(result, page, limit);
  },
  async listForWorkspace(workspaceId: string, page: number, limit: number, type?: string) {
    const filter: Record<string, unknown> = { workspaceId };
    if (type) filter['type'] = type;
    const result = await securityEventRepository.list(filter as never, page, limit);
    return pagedEvents(result, page, limit);
  },
};

export const teamIdentityService = {
  async members(workspaceId: string) {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    const memberships = new Map<string, { role: string; status: string; joinedAt: Date }>();
    memberships.set(workspace.owner.toString(), {
      role: 'workspace_owner', status: 'active', joinedAt: workspace.createdAt,
    });
    for (const member of workspace.members) {
      if (!memberships.has(member.user.toString())) {
        memberships.set(member.user.toString(), {
          role: normalizeRole(member.role), status: member.status ?? 'active', joinedAt: member.joinedAt,
        });
      }
    }
    const users = await userRepository.findByIds([...memberships.keys()]);
    return users.map((user) => {
      const membership = memberships.get(user._id.toString());
      return {
        id: user._id.toString(), firstName: user.firstName, lastName: user.lastName,
        email: user.email, avatar: user.avatar, role: membership?.role ?? 'guest',
        status: membership?.status ?? 'inactive', joinedAt: membership?.joinedAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
      };
    });
  },

  async updateRole(input: {
    workspaceId: string; actorId: string; actorRole: string; memberId: string; role: IdentityRole;
  }) {
    if (input.actorId === input.memberId) throw new AuthorizationError('You cannot change your own role');
    const membership = await workspaceRepository.findMembership(input.workspaceId, input.memberId);
    if (!membership || membership.workspace.owner.toString() === input.memberId) {
      throw new NotFoundError('Managed workspace member not found');
    }
    if (!canAssignRole(input.actorRole, membership.role) || !canAssignRole(input.actorRole, input.role)) {
      throw new AuthorizationError('Cannot change this member role');
    }
    if (!await workspaceRepository.updateMemberRole(input.workspaceId, input.memberId, input.role)) {
      throw new NotFoundError('Workspace member not found');
    }
    const member = await userRepository.findById(input.memberId);
    if (member?.workspaceId.toString() === input.workspaceId) {
      await userRepository.updateById(input.memberId, { role: normalizeRole(input.role) });
    }
    await recordSecurityEvent({
      workspaceId: input.workspaceId, userId: input.actorId, actorType: 'user', actorId: input.actorId,
      type: 'team.role_changed', outcome: 'success',
      metadata: { memberId: input.memberId, previousRole: membership.role, role: input.role },
    });
  },

  async remove(input: { workspaceId: string; actorId: string; actorRole: string; memberId: string }) {
    if (input.actorId === input.memberId) throw new AuthorizationError('Use the leave-workspace flow to remove yourself');
    const membership = await workspaceRepository.findMembership(input.workspaceId, input.memberId);
    if (!membership || membership.workspace.owner.toString() === input.memberId) {
      throw new NotFoundError('Managed workspace member not found');
    }
    if (!canAssignRole(input.actorRole, membership.role)) throw new AuthorizationError('Cannot remove this member');
    if (!await workspaceRepository.removeMember(input.workspaceId, input.memberId)) {
      throw new NotFoundError('Workspace member not found');
    }
    const member = await userRepository.findById(input.memberId);
    if (member?.workspaceId.toString() === input.workspaceId) {
      const alternatives = await workspaceRepository.findByUser(input.memberId);
      for (const next of alternatives) {
        if (next._id.toString() === input.workspaceId) continue;
        const nextMembership = await workspaceRepository.findMembership(next._id.toString(), input.memberId);
        if (nextMembership) {
          await userRepository.updateWorkspace(input.memberId, next._id.toString(), normalizeRole(nextMembership.role));
          break;
        }
      }
    }
    await sessionRepository.revokeAllForUser(input.memberId, 'workspace_membership_removed');
    await recordSecurityEvent({
      workspaceId: input.workspaceId, userId: input.actorId, actorType: 'user', actorId: input.actorId,
      type: 'team.member_removed', outcome: 'success', metadata: { memberId: input.memberId, role: membership.role },
    });
  },
};

function pagedEvents(
  result: { items: ISecurityEvent[]; total: number },
  page: number,
  limit: number,
) {
  return {
    items: result.items.map((event) => ({
      id: event._id.toString(), type: event.type, outcome: event.outcome,
      actorType: event.actorType, actorId: event.actorId,
      ipAddress: event.ipAddress, metadata: event.metadata, createdAt: event.createdAt.toISOString(),
    })),
    meta: { page, limit, total: result.total, hasNext: page * limit < result.total, hasPrevious: page > 1 },
  };
}

export const policyService = {
  async get(workspaceId: string) {
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    return workspace.settings;
  },
  async update(workspaceId: string, settings: Record<string, unknown>, actorId: string) {
    const current = await workspaceRepository.findById(workspaceId);
    if (!current) throw new NotFoundError('Workspace not found');
    const workspace = await workspaceRepository.updateById(workspaceId, {
      settings: { ...current.settings, ...settings } as never,
    });
    if (!workspace) throw new NotFoundError('Workspace not found');
    await recordSecurityEvent({
      workspaceId, userId: actorId, actorType: 'user', actorId,
      type: 'identity.policy_updated', outcome: 'success',
      metadata: { fields: Object.keys(settings) },
    });
    return workspace.settings;
  },
};

export const enterpriseSsoService = {
  async readiness(organizationId?: string) {
    if (!organizationId) return { organizationConfigured: false, providers: [], implementationStatus: 'prepared' };
    const providers = await ssoConfigurationRepository.list(organizationId);
    return {
      organizationConfigured: true,
      implementationStatus: 'prepared',
      providers: providers.map((provider) => ({
        id: provider._id.toString(), provider: provider.provider, enabled: provider.enabled, domains: provider.domains,
      })),
      supportedProtocols: ['saml', 'oidc'],
      supportedDirectories: ['azure_ad', 'google_workspace', 'okta', 'auth0'],
      note: 'Federation execution is intentionally disabled until provider metadata and certificate validation are configured.',
    };
  },
};

export const identityInfoService = {
  roleMatrix() {
    return { roles: ['super_admin', 'organization_owner', 'workspace_owner', 'workspace_admin', 'manager', 'editor', 'analyst', 'viewer', 'guest', 'service_account'] };
  },
  securityConfiguration() {
    return { encryptionConfigured: Boolean(config.identity.encryptionKey), sessionIdleTimeoutMinutes: config.identity.sessionIdleTimeoutMinutes };
  },
};
