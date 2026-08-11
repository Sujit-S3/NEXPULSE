import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { userRepository, workspaceRepository } from './repository.js';
import type { IUser, IWorkspace } from './model.js';
import type {
  SanitizedUser,
  LoginResponse,
  RegisterBody,
  LoginBody,
  MfaRequiredResponse,
} from './types.js';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../../errors/index.js';
import { logger } from '../../logger/index.js';
import { enqueue, getEmailQueue, QUEUE_NAMES } from '../../jobs/queues.js';
import type { EmailJobData } from '../../jobs/processors/emailProcessor.js';
import type { IdentityRequestContext } from '../identity/requestContext.js';
import { hashSecret, randomSecret } from '../identity/crypto.js';
import { invitationRepository, organizationRepository, sessionRepository } from '../identity/repository.js';
import { identitySessionService, sanitizeIdentityUser } from '../identity/sessionService.js';
import { mfaService } from '../identity/mfaService.js';
import { recordSecurityEvent } from '../identity/securityEvents.js';
import { normalizeRole } from '../identity/permissions.js';

const blockedPasswords = new Set([
  'password', 'password123', 'password123!', '123456789012345', '1234567890123456',
  'qwertyuiopasdfg', 'qwerty123456789', 'letmeinletmeinlet', 'nexpulsenexpulse',
  'adminadminadmin', 'administrator123', 'welcome123456789', 'iloveyouiloveyou',
  'correcthorsebatterystaple', 'changemechangeme', 'defaultpassword', 'companyname1234',
]);
const dummyPasswordHash = bcrypt.hash(randomSecret(), 12);

function validatePassword(password: string, minimum = 15): void {
  if (password.length < minimum || password.length > 128) {
    throw new ValidationError({ password: [`Password must be between ${minimum} and 128 characters`] });
  }
  const normalized = password.toLowerCase().replace(/\s/g, '');
  const predictable = /^(password|passphrase|qwerty|letmein|welcome|admin|changeme|nexpulse)[\d!@#$%^&*._-]*$/.test(normalized)
    || /^(.)\1{14,}$/.test(normalized)
    || /^(0123456789|1234567890|abcdefghijklmnopqrstuvwxyz)+$/.test(normalized);
  if (blockedPasswords.has(normalized) || predictable) {
    throw new ValidationError({ password: ['Choose a password that is not commonly used or product-specific'] });
  }
}

// Verification/reset emails are queued (retried with backoff on transient SMTP
// failures) rather than sent inline — unlike MFA-code and invitation emails elsewhere,
// nothing here needs to synchronously know whether the send succeeded.
function enqueueVerificationEmail(firstName: string, email: string, token: string): void {
  const job: EmailJobData = { kind: 'verification', firstName, email, token };
  enqueue(getEmailQueue(), QUEUE_NAMES.email, job);
}

function enqueuePasswordResetEmail(firstName: string, email: string, token: string): void {
  const job: EmailJobData = { kind: 'password-reset', firstName, email, token };
  enqueue(getEmailQueue(), QUEUE_NAMES.email, job);
}

async function currentUser(userId: string): Promise<{ user: IUser; role: string; workspaceId: string; workspace: IWorkspace }> {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  const membership = await workspaceRepository.findMembership(user.workspaceId.toString(), userId);
  if (!membership) throw new AuthenticationError('Workspace membership is inactive');
  return { user, role: membership.role, workspaceId: membership.workspace._id.toString(), workspace: membership.workspace };
}

async function logAuthentication(
  type: string,
  outcome: 'success' | 'failure' | 'denied',
  context: IdentityRequestContext,
  user?: IUser,
  metadata?: Record<string, unknown>,
) {
  await recordSecurityEvent({
    workspaceId: user?.workspaceId?.toString(),
    organizationId: user?.organizationId?.toString(),
    userId: user?._id.toString(),
    actorType: user ? 'user' : 'anonymous',
    actorId: user?._id.toString(),
    type,
    outcome,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
    metadata,
  });
}

type SessionResult = LoginResponse & {
  refreshToken: string;
  refreshExpiresAt: Date;
  deviceId: string;
};

export const authService = {
  async register(body: RegisterBody, context: IdentityRequestContext): Promise<SessionResult> {
    validatePassword(body.password);
    const existing = await userRepository.findByEmail(body.email);
    if (existing) throw new ConflictError('An account with this email already exists');
    const invitation = body.invitationToken
      ? await invitationRepository.findPendingByTokenHash(hashSecret(body.invitationToken))
      : null;
    if (body.invitationToken && (!invitation || invitation.email !== body.email.toLowerCase())) {
      throw new ValidationError({ invitationToken: ['Invitation is invalid, expired, or belongs to another email'] });
    }

    const slug = `${body.firstName.toLowerCase()}-${body.lastName.toLowerCase()}-${crypto.randomBytes(3).toString('hex')}`;
    const workspace = await workspaceRepository.create({
      name: `${body.firstName}'s Workspace`,
      slug,
      settings: {
        allowInvitations: true,
        defaultRole: 'viewer',
        passwordMinLength: 15,
        sessionIdleMinutes: 60,
        sessionMaxDays: 30,
        maxActiveSessions: 10,
        requireMfaForRoles: [],
        allowedEmailDomains: [],
        loginIpAllowlist: [],
        allowApiKeys: true,
        allowServiceAccounts: true,
      },
    });
    const verificationToken = randomSecret();
    let user = await userRepository.create({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password,
      role: 'workspace_owner',
      workspaceId: workspace._id,
      emailVerificationTokenHash: hashSecret(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60_000),
    });
    const organization = await organizationRepository.create({
      name: `${body.firstName}'s Organization`,
      slug: `${slug}-org`,
      ownerId: user._id,
      members: [{ userId: user._id, role: 'organization_owner', status: 'active', joinedAt: new Date() }],
    });
    await Promise.all([
      workspaceRepository.addMember(workspace._id.toString(), { user: user._id, role: 'workspace_owner' }),
      workspaceRepository.updateById(workspace._id.toString(), { owner: user._id, organizationId: organization._id }),
      userRepository.updateById(user._id.toString(), { organizationId: organization._id }),
    ]);
    user = await userRepository.findById(user._id.toString()) ?? user;
    if (invitation) {
      await invitationRepository.acceptWithMembership(invitation._id.toString(), user._id.toString());
      await recordSecurityEvent({
        workspaceId: invitation.workspaceId.toString(), organizationId: invitation.organizationId?.toString(),
        userId: user._id.toString(), actorType: 'user', actorId: user._id.toString(),
        type: 'invitation.accepted', outcome: 'success',
        metadata: { invitationId: invitation._id.toString(), role: invitation.role, duringRegistration: true },
      });
    }
    const session = await identitySessionService.create(user, context, true, ['password']);

    await logAuthentication('identity.registered', 'success', context, user);
    logger.info('User registered', { userId: user._id.toString() });
    enqueueVerificationEmail(body.firstName, body.email, verificationToken);
    return session;
  },

  async login(
    body: LoginBody,
    context: IdentityRequestContext,
  ): Promise<SessionResult | MfaRequiredResponse> {
    const user = await userRepository.findByEmailWithPassword(body.email);
    if (!user) {
      await bcrypt.compare(body.password, await dummyPasswordHash);
      await logAuthentication('identity.login', 'failure', context, undefined, { reason: 'invalid_credentials' });
      throw new AuthenticationError('Invalid email or password');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await logAuthentication('identity.login', 'denied', context, user, { reason: 'account_locked' });
      throw new AuthenticationError('Account is temporarily locked');
    }
    if (user.status !== 'active') {
      await logAuthentication('identity.login', 'denied', context, user, { reason: 'inactive' });
      throw new AuthenticationError('Account is inactive or suspended');
    }
    const valid = await user.comparePassword(body.password);
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : undefined;
      await userRepository.recordFailedLogin(user._id.toString(), lockUntil);
      await logAuthentication('identity.login', 'failure', context, user, { reason: 'invalid_credentials', attempts });
      throw new AuthenticationError('Invalid email or password');
    }

    const membership = await workspaceRepository.findMembership(user.workspaceId.toString(), user._id.toString());
    if (!membership) throw new AuthenticationError('Workspace membership is inactive');
    const allowedIps = membership.workspace.settings.loginIpAllowlist ?? [];
    if (allowedIps.length > 0 && !allowedIps.includes(context.ipAddress)) {
      await logAuthentication('identity.login', 'denied', context, user, { reason: 'ip_policy' });
      throw new AuthenticationError('Login is not allowed from this network');
    }
    await userRepository.clearFailedLogins(user._id.toString());

    const trustedDevice = user.mfa?.enabled && mfaService.isTrustedDevice(user, context);
    if (user.mfa?.enabled && !trustedDevice) {
      await logAuthentication('identity.login_mfa_required', 'success', context, user);
      return mfaService.createLoginChallenge(user, body.rememberMe ?? false, context);
    }

    await userRepository.updateById(user._id.toString(), { lastLogin: new Date() });
    const session = await identitySessionService.create(
      user,
      context,
      body.rememberMe ?? false,
      user.mfa?.enabled ? ['password', 'trusted_device'] : ['password'],
      !trustedDevice,
    );
    await logAuthentication('identity.login', 'success', context, user, { deviceName: context.deviceName });
    return session;
  },

  async verifyMfaLogin(
    input: { challengeToken: string; method: 'totp' | 'email' | 'recovery'; code: string; rememberDevice: boolean },
    context: IdentityRequestContext,
  ): Promise<SessionResult> {
    const verified = await mfaService.verifyLoginChallenge(
      input.challengeToken,
      input.method,
      input.code,
      input.rememberDevice,
      context,
    );
    await userRepository.updateById(verified.user._id.toString(), { lastLogin: new Date() });
    const session = await identitySessionService.create(
      verified.user,
      context,
      verified.rememberMe,
      verified.authMethods,
    );
    if (verified.rememberDevice) {
      await mfaService.trustDevice(verified.user, session.deviceId, context.deviceName);
    }
    return session;
  },

  refresh(refreshTokenValue: string, context: IdentityRequestContext): Promise<SessionResult> {
    return identitySessionService.rotate(refreshTokenValue, context);
  },

  logout(refreshTokenValue: string | undefined): Promise<void> {
    return identitySessionService.logout(refreshTokenValue);
  },

  async getCurrentUser(userId: string): Promise<SanitizedUser> {
    const current = await currentUser(userId);
    return sanitizeIdentityUser(current.user, current.role, current.workspaceId, current.workspace);
  },

  async updateProfile(
    userId: string,
    data: Partial<Pick<IUser, 'firstName' | 'lastName' | 'avatar' | 'preferences'>>,
  ): Promise<SanitizedUser> {
    const updated = await userRepository.updateById(userId, data);
    if (!updated) throw new NotFoundError('User not found');
    const membership = await workspaceRepository.findMembership(updated.workspaceId.toString(), userId);
    if (!membership) throw new AuthenticationError('Workspace membership is inactive');
    return sanitizeIdentityUser(updated, membership.role, membership.workspace._id.toString(), membership.workspace);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sessionId?: string,
  ): Promise<void> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');
    const membership = await workspaceRepository.findMembership(user.workspaceId.toString(), userId);
    validatePassword(newPassword, membership?.workspace.settings.passwordMinLength ?? 15);
    if (!await user.comparePassword(currentPassword)) {
      throw new ValidationError({ currentPassword: ['Current password is incorrect'] });
    }
    user.password = newPassword;
    user.securityStamp = (user.securityStamp ?? 1) + 1;
    await user.save();
    await sessionRepository.revokeAllForUser(userId, 'password_changed', sessionId);
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId, sessionId,
      type: 'identity.password_changed', outcome: 'success',
    });
  },

  async forgotPassword(email: string, context: IdentityRequestContext): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      await logAuthentication('identity.password_reset_requested', 'success', context);
      return { message: 'If an account exists, a reset link has been sent' };
    }
    const resetToken = randomSecret();
    await userRepository.updateById(user._id.toString(), {
      passwordResetTokenHash: hashSecret(resetToken),
      passwordResetExpires: new Date(Date.now() + 30 * 60_000),
    });
    await logAuthentication('identity.password_reset_requested', 'success', context, user);
    enqueuePasswordResetEmail(user.firstName, user.email, resetToken);
    return { message: 'If an account exists, a reset link has been sent' };
  },

  async resetPassword(token: string, password: string, context: IdentityRequestContext): Promise<void> {
    const user = await userRepository.findByPasswordResetTokenHash(hashSecret(token));
    if (!user) throw new ValidationError({ token: ['Invalid or expired reset token'] });
    const membership = await workspaceRepository.findMembership(user.workspaceId.toString(), user._id.toString());
    validatePassword(password, membership?.workspace.settings.passwordMinLength ?? 15);
    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.securityStamp = (user.securityStamp ?? 1) + 1;
    await user.save();
    await sessionRepository.revokeAllForUser(user._id.toString(), 'password_reset');
    await logAuthentication('identity.password_reset_completed', 'success', context, user);
  },

  async verifyEmail(token: string, context: IdentityRequestContext): Promise<void> {
    const user = await userRepository.findByVerificationTokenHash(hashSecret(token));
    if (!user) throw new ValidationError({ token: ['Invalid or expired verification token'] });
    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    await logAuthentication('identity.email_verified', 'success', context, user);
  },

  async resendVerification(email: string, context: IdentityRequestContext): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user || user.emailVerified) {
      return { message: 'If verification is required, a link has been sent' };
    }
    const verificationToken = randomSecret();
    await userRepository.updateById(user._id.toString(), {
      emailVerificationTokenHash: hashSecret(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60_000),
    });
    await logAuthentication('identity.email_verification_requested', 'success', context, user);
    enqueueVerificationEmail(user.firstName, user.email, verificationToken);
    return { message: 'If verification is required, a link has been sent' };
  },

  normalizeRole,
};
