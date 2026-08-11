import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findByIdForWorkspace: vi.fn(),
  findRefreshOwner: vi.fn(),
  acquireRefreshLock: vi.fn(),
  completeRefresh: vi.fn(),
  propagateRefresh: vi.fn(),
  releaseRefreshLock: vi.fn(),
  markConnectionState: vi.fn(),
  markCredentialGroupState: vi.fn(),
  refreshAccessToken: vi.fn(),
  claimPendingByStateHash: vi.fn(),
  markOAuthFailed: vi.fn(),
  recordProviderTelemetry: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({
  config: {
    app: { url: 'http://localhost:4000', clientUrl: 'http://localhost:5173' },
    oauth: { sessionTtlMinutes: 15 },
  },
}));
vi.mock('../../src/logger/index.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../src/modules/notifications/service.js', () => ({
  createWorkspaceNotification: vi.fn(),
}));
vi.mock('../../src/modules/identity/securityEvents.js', () => ({
  recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/modules/platforms/oauth/crypto.js', () => ({
  decryptSecret: (value: string) => value.replace(/^encrypted:/, ''),
  encryptSecret: (value: string) => `encrypted:${value}`,
  createPkcePair: vi.fn(),
  hashOpaqueValue: vi.fn(),
  randomOpaqueValue: vi.fn(),
}));
vi.mock('../../src/modules/platforms/adapters/index.js', () => ({
  getAdapter: () => ({
    displayName: 'Provider',
    refreshAccessToken: mocks.refreshAccessToken,
  }),
  getSupportedPlatforms: vi.fn(),
}));
vi.mock('../../src/modules/platforms/repository.js', () => ({
  platformConnectionRepository: {
    findByIdForWorkspace: mocks.findByIdForWorkspace,
    findRefreshOwner: mocks.findRefreshOwner,
    acquireRefreshLock: mocks.acquireRefreshLock,
    completeRefresh: mocks.completeRefresh,
    propagateRefresh: mocks.propagateRefresh,
    releaseRefreshLock: mocks.releaseRefreshLock,
    markConnectionState: mocks.markConnectionState,
    markCredentialGroupState: mocks.markCredentialGroupState,
  },
  oauthSessionRepository: {
    claimPendingByStateHash: mocks.claimPendingByStateHash,
    markFailed: mocks.markOAuthFailed,
  },
}));
vi.mock('../../src/modules/platforms/telemetryService.js', () => ({
  getProviderHealth: vi.fn().mockResolvedValue([]),
  recordProviderTelemetry: mocks.recordProviderTelemetry,
}));

import { platformService, withValidProviderToken } from '../../src/modules/platforms/service.js';
import { AppError } from '../../src/errors/index.js';

function connection(
  tokenVersion: number,
  token: string,
  expiresAt: Date,
  id = 'connection-1',
  providerAccountId = 'channel-1',
) {
  return {
    _id: { toString: () => id },
    workspaceId: { toString: () => 'workspace-a' },
    provider: 'youtube',
    providerAccountId,
    providerUserId: 'user-1',
    displayName: 'Channel',
    accountType: 'channel',
    status: 'connected',
    scopes: ['youtube.readonly'],
    tokenVersion,
    accessTokenEncrypted: `encrypted:${token}`,
    refreshTokenEncrypted: 'encrypted:refresh-token',
    tokenExpiresAt: expiresAt,
  } as never;
}

describe('provider token lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markConnectionState.mockResolvedValue(undefined);
    mocks.markCredentialGroupState.mockResolvedValue(undefined);
    mocks.markOAuthFailed.mockResolvedValue(undefined);
    mocks.releaseRefreshLock.mockResolvedValue(undefined);
    mocks.propagateRefresh.mockResolvedValue(undefined);
    mocks.recordProviderTelemetry.mockResolvedValue(undefined);
  });

  it('never executes a provider request for a connection outside the workspace', async () => {
    mocks.findByIdForWorkspace.mockResolvedValue(null);
    const operation = vi.fn();

    await expect(
      withValidProviderToken('workspace-b', 'connection-1', operation),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(operation).not.toHaveBeenCalled();
    expect(mocks.findByIdForWorkspace).toHaveBeenCalledWith(
      'workspace-b',
      'connection-1',
      true,
    );
  });

  it('requires reconnect without calling the provider for a revoked connection', async () => {
    const revoked = {
      ...connection(1, 'revoked-token', new Date(Date.now() + 3_600_000)),
      status: 'revoked',
    };
    mocks.findByIdForWorkspace.mockResolvedValue(revoked);
    const operation = vi.fn();

    await expect(
      withValidProviderToken('workspace-a', 'connection-1', operation),
    ).rejects.toMatchObject({ code: 'PROVIDER_RECONNECT_REQUIRED' });
    expect(operation).not.toHaveBeenCalled();
    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('persists permission loss reported by a provider request', async () => {
    const active = connection(1, 'active-token', new Date(Date.now() + 3_600_000));
    mocks.findByIdForWorkspace.mockResolvedValue(active);
    const operation = vi.fn().mockRejectedValue(
      new AppError('Provider permission was removed', 403, 'OAUTH_PERMISSIONS_MISSING'),
    );

    await expect(
      withValidProviderToken('workspace-a', 'connection-1', operation),
    ).rejects.toMatchObject({ code: 'OAUTH_PERMISSIONS_MISSING' });
    expect(mocks.markConnectionState).toHaveBeenCalledWith(
      'workspace-a',
      'connection-1',
      expect.objectContaining({ status: 'permissions_required' }),
    );
  });

  it('records OAuth denial without discovering or connecting accounts', async () => {
    mocks.claimPendingByStateHash.mockResolvedValue({
      _id: { toString: () => 'oauth-session-1' },
      provider: 'youtube',
      returnTo: '/platforms',
      workspaceId: { toString: () => 'workspace-a' },
      userId: { toString: () => 'user-1' },
      expiresAt: new Date(Date.now() + 60_000),
    });

    const redirect = await platformService.completeOAuthCallback('youtube', {
      state: 'valid-state',
      error: 'access_denied',
      errorDescription: 'The user cancelled authorization',
    });

    expect(new URL(redirect).searchParams.get('oauth_error')).toBe('OAUTH_DENIED');
    expect(mocks.markOAuthFailed).toHaveBeenCalledWith(
      'oauth-session-1',
      'OAUTH_DENIED',
      'The user cancelled authorization',
    );
    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('uses one refresh under concurrent requests for the same connection', async () => {
    const expired = connection(1, 'old-token', new Date(Date.now() - 60_000));
    const refreshed = connection(2, 'new-token', new Date(Date.now() + 3_600_000));
    mocks.findByIdForWorkspace
      .mockResolvedValueOnce(expired)
      .mockResolvedValueOnce(expired)
      .mockResolvedValue(refreshed);
    mocks.findRefreshOwner
      .mockResolvedValueOnce(expired)
      .mockResolvedValueOnce(expired)
      .mockResolvedValue(refreshed);
    mocks.acquireRefreshLock
      .mockResolvedValueOnce(expired)
      .mockResolvedValueOnce(null);
    mocks.refreshAccessToken.mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'rotated-refresh-token',
      expiresAt: refreshed.tokenExpiresAt,
      scopes: ['youtube.readonly'],
    });
    mocks.completeRefresh.mockResolvedValue(refreshed);
    const operation = vi.fn(async ({ accessToken }: { accessToken: string }) => accessToken);

    const results = await Promise.all([
      withValidProviderToken('workspace-a', 'connection-1', operation),
      withValidProviderToken('workspace-a', 'connection-1', operation),
    ]);

    expect(results).toEqual(['new-token', 'new-token']);
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.completeRefresh).toHaveBeenCalledWith(
      'workspace-a',
      'connection-1',
      1,
      expect.objectContaining({
        accessTokenEncrypted: 'encrypted:new-token',
        refreshTokenEncrypted: 'encrypted:rotated-refresh-token',
      }),
    );
  });

  it('rotates a shared grant once for concurrent requests to different accounts', async () => {
    const expiredAt = new Date(Date.now() - 60_000);
    const refreshedAt = new Date(Date.now() + 3_600_000);
    const accountA = connection(1, 'old-token', expiredAt, 'connection-a', 'channel-a');
    const accountB = connection(1, 'old-token', expiredAt, 'connection-b', 'channel-b');
    const refreshedA = connection(2, 'new-token', refreshedAt, 'connection-a', 'channel-a');
    const refreshedB = connection(2, 'new-token', refreshedAt, 'connection-b', 'channel-b');
    let refreshCompleted = false;

    mocks.findByIdForWorkspace.mockImplementation(async (_workspaceId: string, id: string) => {
      if (id === 'connection-a') return refreshCompleted ? refreshedA : accountA;
      return refreshCompleted ? refreshedB : accountB;
    });
    mocks.findRefreshOwner.mockImplementation(async () => (
      refreshCompleted ? refreshedA : accountA
    ));
    mocks.acquireRefreshLock
      .mockResolvedValueOnce(accountA)
      .mockResolvedValueOnce(null);
    mocks.refreshAccessToken.mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'rotated-refresh-token',
      expiresAt: refreshedAt,
      scopes: ['youtube.readonly'],
    });
    mocks.completeRefresh.mockImplementation(async () => {
      refreshCompleted = true;
      return refreshedA;
    });
    const operation = vi.fn(async ({ accessToken }: { accessToken: string }) => accessToken);

    const results = await Promise.all([
      withValidProviderToken('workspace-a', 'connection-a', operation),
      withValidProviderToken('workspace-a', 'connection-b', operation),
    ]);

    expect(results).toEqual(['new-token', 'new-token']);
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.acquireRefreshLock).toHaveBeenCalledWith(
      'workspace-a',
      'connection-a',
      1,
      expect.any(Date),
    );
    expect(mocks.propagateRefresh).toHaveBeenCalledWith(
      'workspace-a',
      'youtube',
      'user-1',
      'connection-a',
      expect.objectContaining({ accessTokenEncrypted: 'encrypted:new-token' }),
    );
  });
});
