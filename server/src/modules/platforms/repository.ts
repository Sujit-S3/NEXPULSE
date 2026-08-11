import { OAuthSession, PlatformConnection } from './model.js';
import type {
  IOAuthSession,
  IOAuthSessionAccount,
  IPlatformConnection,
  OAuthSessionStatus,
} from './model.js';
import type { PlatformType } from './types.js';

export const platformConnectionRepository = {
  async findSelectedByWorkspace(workspaceId: string): Promise<IPlatformConnection[]> {
    return PlatformConnection.find({ workspaceId, selectedAccount: true, oauthVersion: 1 })
      .sort({ provider: 1, isPrimary: -1, displayName: 1 })
      .exec();
  },

  async findByIdForWorkspace(
    workspaceId: string,
    id: string,
    includeCredentials = false,
  ): Promise<IPlatformConnection | null> {
    const query = PlatformConnection.findOne({
      _id: id,
      workspaceId,
      selectedAccount: true,
      oauthVersion: 1,
    });
    if (includeCredentials) {
      query.select('+accessTokenEncrypted +refreshTokenEncrypted +refreshLockUntil');
    }
    return query.exec();
  },

  async findByProviderAccount(
    workspaceId: string,
    provider: PlatformType,
    providerAccountId: string,
  ): Promise<IPlatformConnection | null> {
    return PlatformConnection.findOne({
      workspaceId,
      provider,
      providerAccountId,
      selectedAccount: true,
      oauthVersion: 1,
    }).exec();
  },

  async clearPrimary(workspaceId: string, provider: PlatformType): Promise<void> {
    await PlatformConnection.updateMany(
      { workspaceId, provider, isPrimary: true, oauthVersion: 1 },
      { $set: { isPrimary: false } },
    ).exec();
  },

  async upsert(
    workspaceId: string,
    provider: PlatformType,
    providerAccountId: string,
    data: Partial<IPlatformConnection>,
  ): Promise<IPlatformConnection> {
    return PlatformConnection.findOneAndUpdate(
      { workspaceId, provider, providerAccountId },
      {
        $set: data,
        $setOnInsert: {
          workspaceId,
          provider,
          providerAccountId,
          connectedAt: new Date(),
          oauthVersion: 1,
          selectedAccount: true,
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
  },

  async deleteByIdForWorkspace(
    workspaceId: string,
    id: string,
  ): Promise<IPlatformConnection | null> {
    return PlatformConnection.findOneAndDelete({
      _id: id,
      workspaceId,
      selectedAccount: true,
      oauthVersion: 1,
    })
      .select('+accessTokenEncrypted +refreshTokenEncrypted')
      .exec();
  },

  async setPrimary(workspaceId: string, id: string): Promise<IPlatformConnection | null> {
    return PlatformConnection.findOneAndUpdate(
      { _id: id, workspaceId, selectedAccount: true, oauthVersion: 1 },
      { $set: { isPrimary: true } },
      { new: true },
    ).exec();
  },

  async acquireRefreshLock(
    workspaceId: string,
    id: string,
    tokenVersion: number,
    lockUntil: Date,
  ): Promise<IPlatformConnection | null> {
    return PlatformConnection.findOneAndUpdate(
      {
        _id: id,
        workspaceId,
        selectedAccount: true,
        oauthVersion: 1,
        tokenVersion,
        $or: [
          { refreshLockUntil: { $exists: false } },
          { refreshLockUntil: null },
          { refreshLockUntil: { $lte: new Date() } },
        ],
      },
      { $set: { refreshLockUntil: lockUntil } },
      { new: true },
    )
      .select('+accessTokenEncrypted +refreshTokenEncrypted +refreshLockUntil')
      .exec();
  },

  async findRefreshOwner(
    workspaceId: string,
    provider: PlatformType,
    providerUserId: string,
  ): Promise<IPlatformConnection | null> {
    return PlatformConnection.findOne({
      workspaceId,
      provider,
      providerUserId,
      selectedAccount: true,
      oauthVersion: 1,
      refreshTokenEncrypted: { $exists: true },
    })
      .sort({ _id: 1 })
      .select('+accessTokenEncrypted +refreshTokenEncrypted +refreshLockUntil')
      .exec();
  },

  async completeRefresh(
    workspaceId: string,
    id: string,
    tokenVersion: number,
    data: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted?: string;
      tokenExpiresAt?: Date;
      scopes: string[];
    },
  ): Promise<IPlatformConnection | null> {
    return PlatformConnection.findOneAndUpdate(
      { _id: id, workspaceId, tokenVersion, refreshLockUntil: { $gt: new Date() } },
      {
        $set: {
          ...data,
          status: 'connected',
          lastHealthCheckAt: new Date(),
        },
        $inc: { tokenVersion: 1 },
        $unset: {
          refreshLockUntil: 1,
          lastErrorCode: 1,
          lastErrorMessage: 1,
        },
      },
      { new: true },
    )
      .select('+accessTokenEncrypted +refreshTokenEncrypted')
      .exec();
  },

  async propagateRefresh(
    workspaceId: string,
    provider: PlatformType,
    providerUserId: string,
    ownerId: string,
    data: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted?: string;
      tokenExpiresAt?: Date;
      scopes: string[];
    },
  ): Promise<void> {
    await PlatformConnection.updateMany(
      {
        _id: { $ne: ownerId },
        workspaceId,
        provider,
        providerUserId,
        selectedAccount: true,
        oauthVersion: 1,
      },
      {
        $set: {
          ...data,
          status: 'connected',
          lastHealthCheckAt: new Date(),
        },
        $inc: { tokenVersion: 1 },
        $unset: {
          refreshLockUntil: 1,
          lastErrorCode: 1,
          lastErrorMessage: 1,
        },
      },
    ).exec();
  },

  async updateCredentialGroupFromOAuth(
    workspaceId: string,
    provider: PlatformType,
    providerUserId: string,
    data: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted: string;
      tokenExpiresAt?: Date;
      scopes: string[];
    },
  ): Promise<void> {
    await PlatformConnection.updateMany(
      { workspaceId, provider, providerUserId, selectedAccount: true, oauthVersion: 1 },
      {
        $set: { ...data, status: 'connected', lastHealthCheckAt: new Date() },
        $inc: { tokenVersion: 1 },
        $unset: {
          refreshLockUntil: 1,
          lastErrorCode: 1,
          lastErrorMessage: 1,
        },
      },
    ).exec();
  },

  async releaseRefreshLock(workspaceId: string, id: string): Promise<void> {
    await PlatformConnection.updateOne(
      { _id: id, workspaceId },
      { $unset: { refreshLockUntil: 1 } },
    ).exec();
  },

  async markConnectionState(
    workspaceId: string,
    id: string,
    data: {
      status: IPlatformConnection['status'];
      errorCode?: string;
      errorMessage?: string;
      synced?: boolean;
    },
  ): Promise<void> {
    const set: Record<string, unknown> = {
      status: data.status,
      lastHealthCheckAt: new Date(),
    };
    if (data.errorCode) set['lastErrorCode'] = data.errorCode;
    if (data.errorMessage) set['lastErrorMessage'] = data.errorMessage.slice(0, 500);
    if (data.synced) set['lastSyncAt'] = new Date();
    const update: Record<string, unknown> = { $set: set };
    if (!data.errorCode && !data.errorMessage) {
      update['$unset'] = { lastErrorCode: 1, lastErrorMessage: 1 };
    }
    await PlatformConnection.updateOne({ _id: id, workspaceId }, update).exec();
  },

  async markCredentialGroupState(
    workspaceId: string,
    provider: PlatformType,
    providerUserId: string,
    data: {
      status: IPlatformConnection['status'];
      errorCode: string;
      errorMessage: string;
    },
  ): Promise<void> {
    await PlatformConnection.updateMany(
      { workspaceId, provider, providerUserId, selectedAccount: true, oauthVersion: 1 },
      {
        $set: {
          status: data.status,
          lastHealthCheckAt: new Date(),
          lastErrorCode: data.errorCode,
          lastErrorMessage: data.errorMessage.slice(0, 500),
        },
      },
    ).exec();
  },
};

export const oauthSessionRepository = {
  async create(data: Partial<IOAuthSession>): Promise<IOAuthSession> {
    return OAuthSession.create(data);
  },

  async claimPendingByStateHash(
    stateHash: string,
  ): Promise<IOAuthSession | null> {
    return OAuthSession.findOneAndUpdate(
      { stateHash, status: 'pending_authorization', expiresAt: { $gt: new Date() } },
      { $set: { status: 'exchanging' } },
      { new: true },
    )
      .select(
        '+publicIdEncrypted +codeVerifierEncrypted +accessTokenEncrypted +refreshTokenEncrypted +accounts.accessTokenEncrypted',
      )
      .exec();
  },

  async findByPublicIdForUser(
    publicIdHash: string,
    workspaceId: string,
    userId: string,
    includeSecrets = false,
  ): Promise<IOAuthSession | null> {
    const query = OAuthSession.findOne({
      publicIdHash,
      workspaceId,
      userId,
      expiresAt: { $gt: new Date() },
    });
    if (includeSecrets) {
      query.select(
        '+publicIdEncrypted +codeVerifierEncrypted +accessTokenEncrypted +refreshTokenEncrypted +accounts.accessTokenEncrypted',
      );
    }
    return query.exec();
  },

  async updateDiscovery(
    id: string,
    data: {
      status: OAuthSessionStatus;
      accessTokenEncrypted: string;
      refreshTokenEncrypted?: string;
      tokenExpiresAt?: Date;
      providerUserId?: string;
      grantedScopes: string[];
      accounts: IOAuthSessionAccount[];
    },
  ): Promise<IOAuthSession | null> {
    return OAuthSession.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  async markFailed(id: string, errorCode: string, errorMessage: string): Promise<void> {
    await OAuthSession.findByIdAndUpdate(id, {
      $set: { status: 'failed', errorCode, errorMessage },
    }).exec();
  },

  async markCompleted(id: string): Promise<void> {
    await OAuthSession.findByIdAndUpdate(id, {
      $set: { status: 'completed', accounts: [] },
      $unset: {
        accessTokenEncrypted: 1,
        refreshTokenEncrypted: 1,
        codeVerifierEncrypted: 1,
        publicIdEncrypted: 1,
      },
    }).exec();
  },
};
