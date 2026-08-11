import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findByIdWithSecrets: vi.fn(),
  revokeById: vi.fn(),
  rotate: vi.fn(),
  findActiveById: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({
  config: {
    app: { name: 'NEXPULSE AI' },
    identity: { sessionIdleTimeoutMinutes: 60, sessionMaxDays: 30, trustedDeviceDays: 30 },
    jwt: { accessSecret: 'secret', accessExpiresIn: '15m', issuer: 'test', audience: 'web' },
  },
}));
vi.mock('../../src/modules/auth/repository.js', () => ({
  userRepository: { findById: vi.fn() },
  workspaceRepository: { findMembership: vi.fn() },
}));
vi.mock('../../src/modules/identity/repository.js', () => ({
  sessionRepository: {
    findByIdWithSecrets: mocks.findByIdWithSecrets,
    revokeById: mocks.revokeById,
    rotate: mocks.rotate,
    findActiveById: mocks.findActiveById,
  },
  credentialRepository: {},
  serviceAccountRepository: {},
}));
vi.mock('../../src/modules/identity/securityEvents.js', () => ({
  recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

import { hashSecret } from '../../src/modules/identity/crypto.js';
import { identitySessionService } from '../../src/modules/identity/sessionService.js';

const context = {
  deviceId: 'device-cookie', deviceIdHash: hashSecret('device-cookie'), deviceName: 'Chrome on Windows',
  browser: 'Chrome', os: 'Windows', deviceType: 'desktop', userAgent: 'test', ipAddress: '127.0.0.1',
  requestId: 'request-1',
};
const objectId = (value: string) => ({ toString: () => value });

describe('refresh token rotation defenses', () => {
  const sessionId = '507f1f77bcf86cd799439011';
  beforeEach(() => vi.clearAllMocks());

  it('revokes the token family when a consumed token is replayed', async () => {
    mocks.findByIdWithSecrets.mockResolvedValue({
      _id: objectId(sessionId), workspaceId: objectId('workspace-1'), userId: objectId('user-1'),
      usedTokenHashes: [hashSecret('consumed-secret')], tokenHash: hashSecret('current-secret'),
      expiresAt: new Date(Date.now() + 60_000), idleExpiresAt: new Date(Date.now() + 60_000),
      deviceIdHash: context.deviceIdHash,
    });
    await expect(identitySessionService.rotate(`${sessionId}.consumed-secret`, context)).rejects.toMatchObject({ statusCode: 401 });
    expect(mocks.revokeById).toHaveBeenCalledWith(sessionId, 'refresh_token_replay');
    expect(mocks.rotate).not.toHaveBeenCalled();
  });

  it('revokes a refresh token presented from a different bound device', async () => {
    mocks.findByIdWithSecrets.mockResolvedValue({
      _id: objectId(sessionId), workspaceId: objectId('workspace-1'), userId: objectId('user-1'),
      usedTokenHashes: [], tokenHash: hashSecret('current-secret'),
      expiresAt: new Date(Date.now() + 60_000), idleExpiresAt: new Date(Date.now() + 60_000),
      deviceIdHash: hashSecret('other-device'),
    });
    await expect(identitySessionService.rotate(`${sessionId}.current-secret`, context)).rejects.toMatchObject({ statusCode: 401 });
    expect(mocks.revokeById).toHaveBeenCalledWith(sessionId, 'device_binding_mismatch');
  });

  it('rejects an access token after its backing session is revoked', async () => {
    mocks.findActiveById.mockResolvedValue(null);
    await expect(identitySessionService.authenticate({
      sub: 'user-1', email: 'user@example.com', role: 'viewer', workspaceId: 'workspace-1',
      sessionId: 'session-1', securityStamp: 1,
    }, context)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a valid access token replayed without its bound device cookie', async () => {
    mocks.findActiveById.mockResolvedValue({
      userId: objectId('user-1'), workspaceId: objectId('workspace-1'),
      deviceIdHash: hashSecret('another-device'),
    });
    await expect(identitySessionService.authenticate({
      sub: 'user-1', email: 'user@example.com', role: 'viewer', workspaceId: 'workspace-1',
      sessionId, securityStamp: 1,
    }, context)).rejects.toMatchObject({ statusCode: 401, message: 'Access token device binding failed' });
  });
});
