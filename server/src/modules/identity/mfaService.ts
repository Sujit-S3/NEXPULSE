import crypto from 'node:crypto';
import { AppError, AuthenticationError, NotFoundError, ValidationError } from '../../errors/index.js';
import { config } from '../../config/env.js';
import { emailService } from '../../services/email/index.js';
import { userRepository } from '../auth/repository.js';
import type { IUser } from '../auth/model.js';
import type { IdentityRequestContext } from './requestContext.js';
import { challengeRepository, sessionRepository } from './repository.js';
import {
  decryptIdentitySecret,
  encryptIdentitySecret,
  hashSecret,
  randomSecret,
  safeSecretEqual,
} from './crypto.js';
import { generateTotpSecret, totpUri, verifyTotp } from './totp.js';
import { recordSecurityEvent } from './securityEvents.js';

function recoveryCodes(): { raw: string[]; hashes: string[] } {
  const raw = Array.from({ length: 10 }, () => {
    const value = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
  });
  return { raw, hashes: raw.map((code) => hashSecret(code.replace(/-/g, '').toUpperCase())) };
}

function normalizedRecoveryCode(code: string): string {
  return code.replace(/[-\s]/g, '').toUpperCase();
}

async function requirePassword(userId: string, password: string): Promise<IUser> {
  const user = await userRepository.findByIdWithMfa(userId);
  if (!user || !await user.comparePassword(password)) {
    throw new AuthenticationError('Password confirmation failed');
  }
  return user;
}

async function verifyMfaCode(user: IUser, method: 'totp' | 'email' | 'recovery', code: string, emailCodeHash?: string) {
  if (method === 'totp') {
    if (!user.mfa.totpSecretEncrypted || !verifyTotp(decryptIdentitySecret(user.mfa.totpSecretEncrypted), code)) {
      throw new AuthenticationError('Invalid authenticator code');
    }
    return;
  }
  if (method === 'email') {
    if (!emailCodeHash || !safeSecretEqual(emailCodeHash, code)) {
      throw new AuthenticationError('Invalid email verification code');
    }
    return;
  }
  const normalized = normalizedRecoveryCode(code);
  const index = user.mfa.recoveryCodeHashes.findIndex((stored) => safeSecretEqual(stored, normalized));
  if (index < 0) throw new AuthenticationError('Invalid recovery code');
  user.mfa.recoveryCodeHashes.splice(index, 1);
  await user.save();
}

export const mfaService = {
  isTrustedDevice(user: IUser, context: IdentityRequestContext): boolean {
    const now = Date.now();
    return user.mfa.trustedDevices.some(
      (device) => device.deviceIdHash === context.deviceIdHash && device.expiresAt.getTime() > now,
    );
  },

  async createLoginChallenge(user: IUser, rememberMe: boolean, context: IdentityRequestContext) {
    const challengeToken = randomSecret();
    const methods: ('totp' | 'email' | 'recovery')[] = [];
    if (user.mfa.totpSecretEncrypted) methods.push('totp');
    if (user.mfa.emailOtpEnabled && emailService.isConfigured()) methods.push('email');
    if (user.mfa.recoveryCodeHashes.length > 0) methods.push('recovery');
    if (methods.length === 0) throw new AuthenticationError('MFA is enabled but no authenticator is available');

    let emailCode: string | undefined;
    if (methods.includes('email')) {
      emailCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      const sent = await emailService.sendMfaCode(user.firstName, user.email, emailCode);
      if (!sent) {
        methods.splice(methods.indexOf('email'), 1);
        emailCode = undefined;
        if (methods.length === 0) {
          throw new AppError('Email verification is temporarily unavailable', 503, 'EMAIL_UNAVAILABLE');
        }
      }
    }
    await challengeRepository.create({
      userId: user._id,
      type: 'mfa_login',
      tokenHash: hashSecret(challengeToken),
      codeHash: emailCode ? hashSecret(emailCode) : undefined,
      attempts: 0,
      maxAttempts: 5,
      metadata: {
        rememberMe,
        deviceIdHash: context.deviceIdHash,
        deviceName: context.deviceName,
      },
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });
    return { mfaRequired: true as const, challengeToken, methods };
  },

  async verifyLoginChallenge(
    challengeToken: string,
    method: 'totp' | 'email' | 'recovery',
    code: string,
    rememberDevice: boolean,
    context: IdentityRequestContext,
  ) {
    const challenge = await challengeRepository.findByTokenHash(hashSecret(challengeToken));
    if (!challenge || challenge.type !== 'mfa_login') throw new AuthenticationError('MFA challenge expired');
    if (challenge.attempts >= challenge.maxAttempts) throw new AuthenticationError('MFA challenge is locked');
    if (challenge.metadata['deviceIdHash'] !== context.deviceIdHash) {
      throw new AuthenticationError('MFA challenge device binding failed');
    }
    const user = await userRepository.findByIdWithMfa(challenge.userId.toString());
    if (!user || user.status !== 'active') throw new AuthenticationError('Account is unavailable');
    try {
      await verifyMfaCode(user, method, code, challenge.codeHash);
    } catch (error) {
      await challengeRepository.incrementAttempt(challenge._id.toString());
      await recordSecurityEvent({
        workspaceId: user.workspaceId.toString(), userId: user._id.toString(),
        actorType: 'user', actorId: user._id.toString(), type: 'mfa.challenge_failed',
        outcome: 'failure', ipAddress: context.ipAddress, userAgent: context.userAgent,
        requestId: context.requestId, metadata: { method },
      });
      throw error;
    }
    if (!await challengeRepository.consume(challenge._id.toString())) {
      throw new AuthenticationError('MFA challenge was already used');
    }
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId: user._id.toString(), actorType: 'user', actorId: user._id.toString(),
      type: 'mfa.challenge_succeeded', outcome: 'success', ipAddress: context.ipAddress,
      userAgent: context.userAgent, requestId: context.requestId, metadata: { method, rememberDevice },
    });
    return {
      user,
      rememberMe: Boolean(challenge.metadata['rememberMe']),
      authMethods: ['password', method],
      rememberDevice,
    };
  },

  async trustDevice(user: IUser, deviceId: string, deviceName: string) {
    const deviceIdHash = hashSecret(deviceId);
    user.mfa.trustedDevices = user.mfa.trustedDevices
      .filter((device) => device.expiresAt > new Date() && device.deviceIdHash !== deviceIdHash)
      .concat({
        deviceIdHash,
        name: deviceName,
        trustedAt: new Date(),
        expiresAt: new Date(Date.now() + config.identity.trustedDeviceDays * 24 * 60 * 60_000),
      });
    await user.save();
  },

  async status(userId: string) {
    const user = await userRepository.findByIdWithMfa(userId);
    if (!user) throw new NotFoundError('User not found');
    return {
      enabled: user.mfa.enabled,
      totpEnabled: Boolean(user.mfa.totpSecretEncrypted),
      emailOtpEnabled: user.mfa.emailOtpEnabled,
      recoveryCodesRemaining: user.mfa.recoveryCodeHashes.length,
      trustedDevices: user.mfa.trustedDevices
        .filter((device) => device.expiresAt > new Date())
        .map((device) => ({ id: device.deviceIdHash, name: device.name, trustedAt: device.trustedAt, expiresAt: device.expiresAt })),
    };
  },

  async beginTotpSetup(userId: string, password: string) {
    const user = await requirePassword(userId, password);
    const secret = generateTotpSecret();
    user.mfa.pendingTotpSecretEncrypted = encryptIdentitySecret(secret);
    await user.save();
    return { secret, uri: totpUri(secret, user.email, config.app.name) };
  },

  async confirmTotp(userId: string, code: string, sessionId?: string) {
    const user = await userRepository.findByIdWithMfa(userId);
    if (!user?.mfa.pendingTotpSecretEncrypted) throw new ValidationError({ code: ['TOTP setup was not started'] });
    const secret = decryptIdentitySecret(user.mfa.pendingTotpSecretEncrypted);
    if (!verifyTotp(secret, code)) throw new ValidationError({ code: ['Invalid authenticator code'] });
    const generated = recoveryCodes();
    user.mfa.totpSecretEncrypted = encryptIdentitySecret(secret);
    user.mfa.pendingTotpSecretEncrypted = undefined;
    user.mfa.enabled = true;
    user.mfa.recoveryCodeHashes = generated.hashes;
    user.securityStamp = (user.securityStamp ?? 1) + 1;
    await user.save();
    await sessionRepository.revokeAllForUser(userId, 'mfa_enabled', sessionId);
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId, sessionId, type: 'mfa.enabled', outcome: 'success',
    });
    return { recoveryCodes: generated.raw };
  },

  async enableEmailOtp(userId: string, password: string, sessionId?: string) {
    if (!emailService.isConfigured()) {
      throw new AppError('Email delivery must be configured before email OTP can be enabled', 503, 'EMAIL_UNAVAILABLE');
    }
    const user = await requirePassword(userId, password);
    if (!user.emailVerified) throw new ValidationError({ email: ['Verify your email before enabling email OTP'] });
    user.mfa.emailOtpEnabled = true;
    user.mfa.enabled = true;
    user.securityStamp = (user.securityStamp ?? 1) + 1;
    const generated = user.mfa.recoveryCodeHashes.length === 0 ? recoveryCodes() : undefined;
    if (generated) user.mfa.recoveryCodeHashes = generated.hashes;
    await user.save();
    await sessionRepository.revokeAllForUser(userId, 'mfa_email_enabled', sessionId);
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId, sessionId,
      type: 'mfa.email_enabled', outcome: 'success',
    });
    return { enabled: true, recoveryCodes: generated?.raw };
  },

  async regenerateRecoveryCodes(userId: string, code: string) {
    const user = await userRepository.findByIdWithMfa(userId);
    if (!user || !user.mfa.enabled) throw new ValidationError({ code: ['MFA is not enabled'] });
    await verifyMfaCode(user, user.mfa.totpSecretEncrypted ? 'totp' : 'recovery', code);
    const generated = recoveryCodes();
    user.mfa.recoveryCodeHashes = generated.hashes;
    await user.save();
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId,
      type: 'mfa.recovery_codes_regenerated', outcome: 'success',
    });
    return { recoveryCodes: generated.raw };
  },

  async removeTrustedDevice(userId: string, deviceIdHash: string, sessionId?: string) {
    const user = await userRepository.findByIdWithMfa(userId);
    if (!user) throw new NotFoundError('User not found');
    const before = user.mfa.trustedDevices.length;
    user.mfa.trustedDevices = user.mfa.trustedDevices.filter((device) => device.deviceIdHash !== deviceIdHash);
    if (user.mfa.trustedDevices.length === before) throw new NotFoundError('Trusted device not found');
    await user.save();
    await sessionRepository.revokeByDevice(userId, deviceIdHash, 'trusted_device_removed');
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId, sessionId,
      type: 'mfa.trusted_device_removed', outcome: 'success', metadata: { deviceIdHash },
    });
  },

  async disable(userId: string, password: string, code: string, sessionId?: string) {
    const user = await requirePassword(userId, password);
    if (user.mfa.enabled) {
      await verifyMfaCode(user, user.mfa.totpSecretEncrypted ? 'totp' : 'recovery', code);
    }
    user.mfa.enabled = false;
    user.mfa.emailOtpEnabled = false;
    user.mfa.totpSecretEncrypted = undefined;
    user.mfa.pendingTotpSecretEncrypted = undefined;
    user.mfa.recoveryCodeHashes = [];
    user.mfa.trustedDevices = [];
    user.securityStamp = (user.securityStamp ?? 1) + 1;
    await user.save();
    await sessionRepository.revokeAllForUser(userId, 'mfa_disabled', sessionId);
    await recordSecurityEvent({
      workspaceId: user.workspaceId.toString(), organizationId: user.organizationId?.toString(),
      userId, actorType: 'user', actorId: userId, sessionId, type: 'mfa.disabled', outcome: 'success',
    });
  },
};
