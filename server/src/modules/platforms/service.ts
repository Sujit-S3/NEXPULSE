import mongoose from 'mongoose';
import { config } from '../../config/env.js';
import { AppError, NotFoundError, ValidationError } from '../../errors/index.js';
import { logger } from '../../logger/index.js';
import { createWorkspaceNotification } from '../notifications/service.js';
import { recordSecurityEvent } from '../identity/securityEvents.js';
import { getAdapter, getPlatformStatuses, getSupportedPlatforms } from './adapters/index.js';
import type { IOAuthSessionAccount, IPlatformConnection } from './model.js';
import {
  oauthSessionRepository,
  platformConnectionRepository,
} from './repository.js';
import type {
  OAuthSelection,
  PlatformType,
  PublicDiscoveredAccount,
  PublicPlatformConnection,
} from './types.js';
import {
  createPkcePair,
  decryptSecret,
  encryptSecret,
  hashOpaqueValue,
  randomOpaqueValue,
} from './oauth/crypto.js';
import { getProviderHealth, recordProviderTelemetry } from './telemetryService.js';

const CALLBACK_BASE = '/api/v1/platforms/oauth';
const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_LOCK_MS = 30 * 1000;

async function safelyRecordProviderTelemetry(
  input: Parameters<typeof recordProviderTelemetry>[0],
): Promise<void> {
  try {
    await recordProviderTelemetry(input);
  } catch (error) {
    logger.warn('Provider telemetry could not be recorded', {
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      operation: input.operation,
      error: error instanceof Error ? error.message : 'Unknown telemetry error',
    });
  }
}

function tokenErrorState(error: unknown): IPlatformConnection['status'] {
  if (error instanceof AppError) {
    if (error.code === 'OAUTH_PERMISSIONS_MISSING') return 'permissions_required';
    if (error.code === 'OAUTH_TOKEN_EXPIRED') return 'expired';
    if (error.code === 'OAUTH_TOKEN_REVOKED') return 'revoked';
  }
  return 'error';
}

async function refreshConnectionToken(
  workspaceId: string,
  connection: IPlatformConnection,
): Promise<IPlatformConnection> {
  const adapter = getAdapter(connection.provider);
  if (!connection.refreshTokenEncrypted || !adapter.refreshAccessToken) {
    await platformConnectionRepository.markConnectionState(
      workspaceId,
      connection._id.toString(),
      {
        status: 'expired',
        errorCode: 'PROVIDER_RECONNECT_REQUIRED',
        errorMessage: 'The provider token cannot be refreshed. Reconnect this account.',
      },
    );
    throw new AppError(
      'The provider session expired. Reconnect this account.',
      401,
      'PROVIDER_RECONNECT_REQUIRED',
    );
  }

  const connectionId = connection._id.toString();
  const owner = await platformConnectionRepository.findRefreshOwner(
    workspaceId,
    connection.provider,
    connection.providerUserId,
  ) ?? connection;
  const ownerId = owner._id.toString();
  const tokenVersion = owner.tokenVersion ?? 1;

  if (
    ownerId !== connectionId &&
    owner.tokenExpiresAt &&
    owner.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_SKEW_MS
  ) {
    await platformConnectionRepository.propagateRefresh(
      workspaceId,
      connection.provider,
      connection.providerUserId,
      ownerId,
      {
        accessTokenEncrypted: owner.accessTokenEncrypted,
        refreshTokenEncrypted: owner.refreshTokenEncrypted,
        tokenExpiresAt: owner.tokenExpiresAt,
        scopes: owner.scopes,
      },
    );
    const synchronized = await platformConnectionRepository.findByIdForWorkspace(
      workspaceId,
      connectionId,
      true,
    );
    if (synchronized) return synchronized;
  }

  const locked = await platformConnectionRepository.acquireRefreshLock(
    workspaceId,
    ownerId,
    tokenVersion,
    new Date(Date.now() + TOKEN_REFRESH_LOCK_MS),
  );

  if (!locked) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const currentOwner = await platformConnectionRepository.findRefreshOwner(
        workspaceId,
        connection.provider,
        connection.providerUserId,
      );
      if (currentOwner && (currentOwner.tokenVersion ?? 1) > tokenVersion) {
        if (currentOwner._id.toString() !== connectionId) {
          await platformConnectionRepository.propagateRefresh(
            workspaceId,
            connection.provider,
            connection.providerUserId,
            currentOwner._id.toString(),
            {
              accessTokenEncrypted: currentOwner.accessTokenEncrypted,
              refreshTokenEncrypted: currentOwner.refreshTokenEncrypted,
              tokenExpiresAt: currentOwner.tokenExpiresAt,
              scopes: currentOwner.scopes,
            },
          );
        }
        const current = await platformConnectionRepository.findByIdForWorkspace(
          workspaceId,
          connectionId,
          true,
        );
        if (current) return current;
      }
    }
    throw new AppError(
      'Provider token refresh is already in progress. Retry the request.',
      409,
      'PROVIDER_REFRESH_IN_PROGRESS',
    );
  }

  try {
    const refreshed = await adapter.refreshAccessToken(
      decryptSecret(locked.refreshTokenEncrypted as string),
    );
    const encrypted = {
      accessTokenEncrypted: encryptSecret(refreshed.accessToken),
      refreshTokenEncrypted: encryptSecret(
        refreshed.refreshToken ?? decryptSecret(locked.refreshTokenEncrypted as string),
      ),
      tokenExpiresAt: refreshed.expiresAt,
      scopes: refreshed.scopes.length > 0 ? refreshed.scopes : owner.scopes,
    };
    const updated = await platformConnectionRepository.completeRefresh(
      workspaceId,
      ownerId,
      tokenVersion,
      encrypted,
    );
    if (!updated) {
      throw new AppError(
        'Provider credentials changed during refresh. Retry the request.',
        409,
        'PROVIDER_REFRESH_CONFLICT',
      );
    }
    await platformConnectionRepository.propagateRefresh(
      workspaceId,
      connection.provider,
      connection.providerUserId,
      ownerId,
      encrypted,
    );
    if (ownerId === connectionId) return updated;
    const refreshedConnection = await platformConnectionRepository.findByIdForWorkspace(
      workspaceId,
      connectionId,
      true,
    );
    if (!refreshedConnection) throw new NotFoundError('Connected account not found');
    return refreshedConnection;
  } catch (error) {
    await platformConnectionRepository.releaseRefreshLock(workspaceId, ownerId);
    await platformConnectionRepository.markCredentialGroupState(
      workspaceId,
      connection.provider,
      connection.providerUserId,
      {
      status: tokenErrorState(error),
      errorCode: error instanceof AppError ? error.code : 'PROVIDER_REFRESH_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Provider token refresh failed',
      },
    );
    throw error;
  }
}

export async function withValidProviderToken<T>(
  workspaceId: string,
  connectionId: string,
  operation: (input: {
    accessToken: string;
    connection: IPlatformConnection;
  }) => Promise<T>,
  operationName = 'provider.request',
): Promise<T> {
  const startedAt = Date.now();
  let connection = await platformConnectionRepository.findByIdForWorkspace(
    workspaceId,
    connectionId,
    true,
  );
  if (!connection) throw new NotFoundError('Connected account not found');

  if (connection.status === 'revoked' || connection.status === 'permissions_required') {
    await safelyRecordProviderTelemetry({
      workspaceId,
      connectionId,
      provider: connection.provider,
      operation: operationName,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: 'PROVIDER_RECONNECT_REQUIRED',
      tokenRefreshed: false,
    });
    throw new AppError(
      'Provider access is no longer valid. Reconnect this account.',
      401,
      'PROVIDER_RECONNECT_REQUIRED',
    );
  }

  let refreshed = false;
  if (
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() <= Date.now() + TOKEN_REFRESH_SKEW_MS
  ) {
    connection = await refreshConnectionToken(workspaceId, connection);
    refreshed = true;
  }

  const execute = (current: IPlatformConnection) =>
    operation({
      accessToken: decryptSecret(current.accessTokenEncrypted),
      connection: current,
    });

  try {
    const result = await execute(connection);
    await platformConnectionRepository.markConnectionState(workspaceId, connectionId, {
      status: 'connected',
      synced: true,
    });
    await safelyRecordProviderTelemetry({
      workspaceId,
      connectionId,
      provider: connection.provider,
      operation: operationName,
      latencyMs: Date.now() - startedAt,
      success: true,
      tokenRefreshed: refreshed,
    });
    return result;
  } catch (error) {
    if (
      !refreshed &&
      error instanceof AppError &&
      error.code === 'OAUTH_TOKEN_EXPIRED' &&
      connection.refreshTokenEncrypted
    ) {
      connection = await refreshConnectionToken(workspaceId, connection);
      try {
        const result = await execute(connection);
        await platformConnectionRepository.markConnectionState(workspaceId, connectionId, {
          status: 'connected',
          synced: true,
        });
        await safelyRecordProviderTelemetry({
          workspaceId,
          connectionId,
          provider: connection.provider,
          operation: operationName,
          latencyMs: Date.now() - startedAt,
          success: true,
          tokenRefreshed: true,
        });
        return result;
      } catch (retryError) {
        await platformConnectionRepository.markConnectionState(workspaceId, connectionId, {
          status: retryError instanceof AppError && retryError.code === 'OAUTH_PERMISSIONS_MISSING'
            ? 'permissions_required'
            : 'revoked',
          errorCode: retryError instanceof AppError ? retryError.code : 'PROVIDER_ACCESS_REVOKED',
          errorMessage: retryError instanceof Error ? retryError.message : 'Provider access was revoked',
        });
        await safelyRecordProviderTelemetry({
          workspaceId,
          connectionId,
          provider: connection.provider,
          operation: operationName,
          latencyMs: Date.now() - startedAt,
          success: false,
          errorCode: retryError instanceof AppError ? retryError.code : 'PROVIDER_ACCESS_REVOKED',
          tokenRefreshed: true,
        });
        throw retryError;
      }
    }

    await platformConnectionRepository.markConnectionState(workspaceId, connectionId, {
      status: tokenErrorState(error),
      errorCode: error instanceof AppError ? error.code : 'PROVIDER_REQUEST_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Provider request failed',
    });
    await safelyRecordProviderTelemetry({
      workspaceId,
      connectionId,
      provider: connection.provider,
      operation: operationName,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: error instanceof AppError ? error.code : 'PROVIDER_REQUEST_FAILED',
      tokenRefreshed: refreshed,
    });
    throw error;
  }
}

function callbackUri(provider: PlatformType): string {
  return `${config.app.url}${CALLBACK_BASE}/${provider}/callback`;
}

function sanitizeReturnTo(value?: string): string {
  return value === '/settings' ? '/settings' : '/platforms';
}

function clientRedirect(returnTo: string, params: Record<string, string>): string {
  const url = new URL(sanitizeReturnTo(returnTo), config.app.clientUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function errorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  return 'OAUTH_PROVIDER_ERROR';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'The provider could not complete authorization';
}

function publicConnection(connection: IPlatformConnection): PublicPlatformConnection {
  const expired = Boolean(
    connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() <= Date.now(),
  );
  return {
    id: connection._id.toString(),
    workspaceId: connection.workspaceId.toString(),
    provider: connection.provider,
    providerAccountId: connection.providerAccountId,
    providerUserId: connection.providerUserId,
    displayName: connection.displayName,
    username: connection.username,
    avatar: connection.avatar,
    followers: connection.followers,
    accountType: connection.accountType,
    selectedAccount: true,
    isPrimary: connection.isPrimary,
    status: expired ? 'expired' : connection.status,
    scopes: connection.scopes,
    tokenExpiresAt: connection.tokenExpiresAt?.toISOString(),
    connectedAt: connection.connectedAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

function assertSelection(
  sessionAccounts: IOAuthSessionAccount[],
  selection: OAuthSelection,
): IOAuthSessionAccount[] {
  const uniqueIds = Array.from(new Set(selection.accountIds));
  if (uniqueIds.length === 0) {
    throw new ValidationError({ accountIds: ['Select at least one account'] });
  }
  if (!uniqueIds.includes(selection.primaryAccountId)) {
    throw new ValidationError({
      primaryAccountId: ['Explicitly choose a primary account from the selected accounts'],
    });
  }
  const byId = new Map(sessionAccounts.map((account) => [account.providerAccountId, account]));
  const selected = uniqueIds.map((id) => byId.get(id));
  if (selected.some((account) => !account)) {
    throw new ValidationError({ accountIds: ['One or more accounts are not in this OAuth session'] });
  }
  return selected as IOAuthSessionAccount[];
}

export const platformService = {
  getProviders() {
    return getSupportedPlatforms();
  },

  getProviderStatus() {
    return getPlatformStatuses();
  },

  async startOAuth(
    workspaceId: string,
    userId: string,
    provider: PlatformType,
    returnTo?: string,
    forceConsent = false,
  ): Promise<{ authorizationUrl: string }> {
    const adapter = getAdapter(provider);
    const state = randomOpaqueValue();
    const publicId = randomOpaqueValue();
    const pkce = createPkcePair();
    const expiresAt = new Date(Date.now() + config.oauth.sessionTtlMinutes * 60_000);

    await oauthSessionRepository.create({
      publicIdHash: hashOpaqueValue(publicId),
      publicIdEncrypted: encryptSecret(publicId),
      stateHash: hashOpaqueValue(state),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(userId),
      provider,
      status: 'pending_authorization',
      returnTo: sanitizeReturnTo(returnTo),
      codeVerifierEncrypted: encryptSecret(pkce.verifier),
      grantedScopes: [],
      accounts: [],
      expiresAt,
    });
    await recordSecurityEvent({
      workspaceId, userId, actorType: 'user', actorId: userId,
      type: 'oauth.authorization_started', outcome: 'success', metadata: { provider },
    });

    return {
      authorizationUrl: adapter.buildAuthorizationUrl({
        state,
        redirectUri: callbackUri(provider),
        codeChallenge: pkce.challenge,
        forceConsent,
      }),
    };
  },

  async completeOAuthCallback(
    provider: PlatformType,
    query: { state?: string; code?: string; error?: string; errorDescription?: string },
  ): Promise<string> {
    if (!query.state) {
      return clientRedirect('/platforms', { oauth_error: 'OAUTH_STATE_INVALID', provider });
    }
    const session = await oauthSessionRepository.claimPendingByStateHash(
      hashOpaqueValue(query.state),
    );
    if (
      !session ||
      session.provider !== provider ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return clientRedirect('/platforms', { oauth_error: 'OAUTH_SESSION_EXPIRED', provider });
    }

    if (query.error) {
      const code = query.error === 'access_denied' ? 'OAUTH_DENIED' : 'OAUTH_PROVIDER_ERROR';
      await oauthSessionRepository.markFailed(
        session._id.toString(),
        code,
        query.errorDescription || query.error,
      );
      await recordSecurityEvent({
        workspaceId: session.workspaceId.toString(), userId: session.userId.toString(),
        actorType: 'user', actorId: session.userId.toString(), type: 'oauth.authorization_denied',
        outcome: 'denied', metadata: { provider, code },
      });
      return clientRedirect(session.returnTo, { oauth_error: code, provider });
    }

    if (!query.code) {
      await oauthSessionRepository.markFailed(
        session._id.toString(),
        'OAUTH_CODE_MISSING',
        'The provider did not return an authorization code',
      );
      return clientRedirect(session.returnTo, {
        oauth_error: 'OAUTH_CODE_MISSING',
        provider,
      });
    }

    try {
      const adapter = getAdapter(provider);
      const tokens = await adapter.exchangeCode({
        code: query.code,
        redirectUri: callbackUri(provider),
        codeVerifier: session.codeVerifierEncrypted
          ? decryptSecret(session.codeVerifierEncrypted)
          : undefined,
      });
      const discovered = await adapter.discoverAccounts(tokens);
      const unique = Array.from(
        new Map(discovered.map((account) => [account.providerAccountId, account])).values(),
      );
      const accounts: IOAuthSessionAccount[] = unique.map((account) => ({
        providerAccountId: account.providerAccountId,
        providerUserId: account.providerUserId,
        displayName: account.displayName,
        username: account.username,
        avatar: account.avatar,
        followers: account.followers,
        accountType: account.accountType,
        accessTokenEncrypted: account.accessToken
          ? encryptSecret(account.accessToken)
          : undefined,
      }));

      await oauthSessionRepository.updateDiscovery(session._id.toString(), {
        status: 'awaiting_selection',
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken
          ? encryptSecret(tokens.refreshToken)
          : undefined,
        tokenExpiresAt: tokens.expiresAt,
        providerUserId: tokens.providerUserId,
        grantedScopes: tokens.scopes,
        accounts,
      });
      await recordSecurityEvent({
        workspaceId: session.workspaceId.toString(), userId: session.userId.toString(),
        actorType: 'user', actorId: session.userId.toString(), type: 'oauth.accounts_discovered',
        outcome: 'success', metadata: { provider, accountCount: accounts.length, scopes: tokens.scopes },
      });

      const publicId = decryptSecret(session.publicIdEncrypted);
      return clientRedirect(session.returnTo, {
        oauth_session: publicId,
        provider,
      });
    } catch (error) {
      const code = errorCode(error);
      await oauthSessionRepository.markFailed(
        session._id.toString(),
        code,
        errorMessage(error),
      );
      logger.warn('OAuth callback failed', {
        provider,
        workspaceId: session.workspaceId.toString(),
        code,
      });
      return clientRedirect(session.returnTo, { oauth_error: code, provider });
    }
  },

  async getPendingAccounts(
    workspaceId: string,
    userId: string,
    publicId: string,
  ): Promise<{
    provider: PlatformType;
    providerName: string;
    accounts: PublicDiscoveredAccount[];
    scopes: string[];
  }> {
    const session = await oauthSessionRepository.findByPublicIdForUser(
      hashOpaqueValue(publicId),
      workspaceId,
      userId,
    );
    if (!session || session.status !== 'awaiting_selection') {
      throw new NotFoundError('OAuth account-selection session not found or expired');
    }
    const adapter = getAdapter(session.provider);
    const existing = await platformConnectionRepository.findSelectedByWorkspace(workspaceId);
    const connectedIds = new Set(
      existing
        .filter((connection) => connection.provider === session.provider)
        .map((connection) => connection.providerAccountId),
    );
    return {
      provider: session.provider,
      providerName: adapter.displayName,
      scopes: session.grantedScopes,
      accounts: session.accounts.map((account) => ({
        providerAccountId: account.providerAccountId,
        providerUserId: account.providerUserId,
        displayName: account.displayName,
        username: account.username,
        avatar: account.avatar,
        followers: account.followers,
        accountType: account.accountType,
        connected: connectedIds.has(account.providerAccountId),
      })),
    };
  },

  async saveSelection(
    workspaceId: string,
    userId: string,
    publicId: string,
    selection: OAuthSelection,
  ): Promise<PublicPlatformConnection[]> {
    const session = await oauthSessionRepository.findByPublicIdForUser(
      hashOpaqueValue(publicId),
      workspaceId,
      userId,
      true,
    );
    if (
      !session ||
      session.status !== 'awaiting_selection' ||
      !session.accessTokenEncrypted
    ) {
      throw new NotFoundError('OAuth account-selection session not found or expired');
    }
    const selected = assertSelection(session.accounts, selection);
    await platformConnectionRepository.clearPrimary(workspaceId, session.provider);

    const saved: IPlatformConnection[] = [];
    for (const account of selected) {
      const accessTokenEncrypted =
        account.accessTokenEncrypted ?? session.accessTokenEncrypted;
      const connection = await platformConnectionRepository.upsert(
        workspaceId,
        session.provider,
        account.providerAccountId,
        {
          userId: new mongoose.Types.ObjectId(userId),
          providerUserId: account.providerUserId,
          accessTokenEncrypted,
          refreshTokenEncrypted: session.refreshTokenEncrypted,
          tokenExpiresAt: session.tokenExpiresAt,
          selectedAccount: true,
          displayName: account.displayName,
          avatar: account.avatar,
          username: account.username,
          followers: account.followers,
          accountType: account.accountType,
          isPrimary: account.providerAccountId === selection.primaryAccountId,
          status: 'connected',
          scopes: session.grantedScopes,
          oauthVersion: 1,
        },
      );
      saved.push(connection);
    }

    if (session.refreshTokenEncrypted && session.providerUserId) {
      await platformConnectionRepository.updateCredentialGroupFromOAuth(
        workspaceId,
        session.provider,
        session.providerUserId,
        {
          accessTokenEncrypted: session.accessTokenEncrypted,
          refreshTokenEncrypted: session.refreshTokenEncrypted,
          tokenExpiresAt: session.tokenExpiresAt,
          scopes: session.grantedScopes,
        },
      );
    }

    await oauthSessionRepository.markCompleted(session._id.toString());
    await recordSecurityEvent({
      workspaceId, userId, actorType: 'user', actorId: userId,
      type: 'oauth.accounts_connected', outcome: 'success',
      metadata: { provider: session.provider, accountCount: saved.length, primaryAccountId: selection.primaryAccountId },
    });
    logger.info('OAuth accounts selected', {
      workspaceId,
      provider: session.provider,
      count: saved.length,
    });
    await createWorkspaceNotification(workspaceId, {
      type: 'connection',
      title: `${getAdapter(session.provider).displayName} connected`,
      message: `${saved.length} account${saved.length === 1 ? '' : 's'} selected and connected.`,
      actionable: true,
      actionLabel: 'View accounts',
      actionPath: '/settings?section=connected-accounts',
      resourceType: 'platform-connection',
    }).catch((error: unknown) => {
      logger.warn('Unable to create connection notification', {
        workspaceId,
        provider: session.provider,
        code: errorCode(error),
      });
    });
    return saved.map(publicConnection);
  },

  async getConnections(workspaceId: string): Promise<PublicPlatformConnection[]> {
    const connections = await platformConnectionRepository.findSelectedByWorkspace(workspaceId);
    return connections.map(publicConnection);
  },

  async getHealth(workspaceId: string) {
    return getProviderHealth(workspaceId);
  },

  async setPrimary(workspaceId: string, connectionId: string, userId?: string): Promise<PublicPlatformConnection> {
    const connection = await platformConnectionRepository.findByIdForWorkspace(
      workspaceId,
      connectionId,
    );
    if (!connection) throw new NotFoundError('Connected account not found');
    await platformConnectionRepository.clearPrimary(workspaceId, connection.provider);
    const updated = await platformConnectionRepository.setPrimary(workspaceId, connectionId);
    if (!updated) throw new NotFoundError('Connected account not found');
    await recordSecurityEvent({
      workspaceId, userId, actorType: userId ? 'user' : 'system', actorId: userId,
      type: 'oauth.primary_account_changed', outcome: 'success',
      metadata: { provider: updated.provider, connectionId },
    });
    await createWorkspaceNotification(workspaceId, {
      type: 'connection',
      title: 'Primary account changed',
      message: `${updated.displayName} is now the primary ${getAdapter(updated.provider).displayName} account.`,
      resourceType: 'platform-connection',
      resourceId: connectionId,
    }).catch((error: unknown) => {
      logger.warn('Unable to create primary-account notification', {
        workspaceId,
        connectionId,
        code: errorCode(error),
      });
    });
    return publicConnection(updated);
  },

  async disconnect(workspaceId: string, connectionId: string, userId?: string): Promise<void> {
    const connection = await platformConnectionRepository.deleteByIdForWorkspace(
      workspaceId,
      connectionId,
    );
    if (!connection) throw new NotFoundError('Connected account not found');

    const remaining = await platformConnectionRepository.findSelectedByWorkspace(workspaceId);
    const sameProvider = remaining.filter(
      (candidate) => candidate.provider === connection.provider,
    );
    if (sameProvider.length === 0 && connection.accessTokenEncrypted) {
      const adapter = getAdapter(connection.provider);
      if (adapter.revokeAccess) {
        try {
          await adapter.revokeAccess(decryptSecret(connection.accessTokenEncrypted));
        } catch (error) {
          logger.warn('Provider token revocation failed after local disconnect', {
            workspaceId,
            provider: connection.provider,
            code: errorCode(error),
          });
        }
      }
    }

    logger.info('OAuth account disconnected', {
      workspaceId,
      provider: connection.provider,
      providerAccountId: connection.providerAccountId,
    });
    await recordSecurityEvent({
      workspaceId, userId, actorType: userId ? 'user' : 'system', actorId: userId,
      type: 'oauth.account_disconnected', outcome: 'success',
      metadata: { provider: connection.provider, connectionId, providerAccountId: connection.providerAccountId },
    });
    await createWorkspaceNotification(workspaceId, {
      type: 'connection',
      title: `${getAdapter(connection.provider).displayName} disconnected`,
      message: `${connection.displayName} was disconnected${connection.isPrimary && sameProvider.length > 0 ? '. Choose a new primary account explicitly.' : '.'}`,
      actionable: connection.isPrimary && sameProvider.length > 0,
      actionLabel: connection.isPrimary && sameProvider.length > 0 ? 'Choose primary' : undefined,
      actionPath: connection.isPrimary && sameProvider.length > 0 ? '/settings?section=connected-accounts' : undefined,
      resourceType: 'platform-connection',
      resourceId: connectionId,
    }).catch((error: unknown) => {
      logger.warn('Unable to create disconnect notification', {
        workspaceId,
        connectionId,
        code: errorCode(error),
      });
    });
  },
};
