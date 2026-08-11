import mongoose, { type FilterQuery } from 'mongoose';
import { Workspace } from '../auth/model.js';
import {
  ApiCredential,
  IdentityChallenge,
  IdentitySession,
  Organization,
  SecurityEvent,
  ServiceAccount,
  SsoConfiguration,
  WorkspaceInvitation,
} from './model.js';
import type {
  IApiCredential,
  IIdentityChallenge,
  IIdentitySession,
  IOrganization,
  ISecurityEvent,
  IServiceAccount,
  ISsoConfiguration,
  IWorkspaceInvitation,
} from './model.js';

export const organizationRepository = {
  create(data: Partial<IOrganization>) {
    return Organization.create(data);
  },
  findById(id: string) {
    return Organization.findById(id).exec();
  },
  findActiveById(id: string) {
    return Organization.findOne({ _id: id, status: 'active' }).exec();
  },
  findActiveMembership(id: string, userId: string) {
    return Organization.findOne({
      _id: id,
      status: 'active',
      $or: [
        { ownerId: userId },
        { members: { $elemMatch: { userId, status: 'active' } } },
      ],
    }).exec();
  },
  addMember(id: string, userId: string, role: string) {
    return Organization.findOneAndUpdate(
      { _id: id, 'members.userId': { $ne: userId } },
      { $push: { members: { userId, role, status: 'active', joinedAt: new Date() } } },
      { new: true },
    ).exec();
  },
};

export const sessionRepository = {
  create(data: Partial<IIdentitySession>) {
    return IdentitySession.create(data);
  },
  findActiveById(id: string, includeSecret = false) {
    const now = new Date();
    const query = IdentitySession.findOne({
      _id: id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: now },
      idleExpiresAt: { $gt: now },
    });
    if (includeSecret) query.select('+tokenHash +usedTokenHashes');
    return query.exec();
  },
  findByIdWithSecrets(id: string) {
    return IdentitySession.findById(id).select('+tokenHash +usedTokenHashes').exec();
  },
  rotate(
    id: string,
    expectedHash: string,
    nextHash: string,
    idleExpiresAt: Date,
    workspaceId: string,
  ) {
    const now = new Date();
    return IdentitySession.findOneAndUpdate(
      {
        _id: id,
        tokenHash: expectedHash,
        revokedAt: { $exists: false },
        expiresAt: { $gt: now },
        idleExpiresAt: { $gt: now },
      },
      {
        $set: {
          tokenHash: nextHash,
          workspaceId,
          lastActiveAt: now,
          idleExpiresAt,
        },
        $inc: { rotationCounter: 1 },
        $push: { usedTokenHashes: { $each: [expectedHash], $slice: -20 } },
      },
      { new: true },
    ).exec();
  },
  touch(id: string, idleExpiresAt: Date, ipAddress: string) {
    return IdentitySession.updateOne(
      {
        _id: id,
        revokedAt: { $exists: false },
        lastActiveAt: { $lt: new Date(Date.now() - 5 * 60_000) },
      },
      { $set: { lastActiveAt: new Date(), idleExpiresAt, ipAddress } },
    ).exec();
  },
  revoke(id: string, userId: string, reason: string) {
    return IdentitySession.findOneAndUpdate(
      { _id: id, userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokeReason: reason } },
      { new: true },
    ).exec();
  },
  revokeById(id: string, reason: string) {
    return IdentitySession.findOneAndUpdate(
      { _id: id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokeReason: reason } },
      { new: true },
    ).exec();
  },
  revokeAllForUser(userId: string, reason: string, exceptId?: string) {
    const filter: FilterQuery<IIdentitySession> = {
      userId,
      revokedAt: { $exists: false },
    };
    if (exceptId) filter._id = { $ne: exceptId };
    return IdentitySession.updateMany(
      filter,
      { $set: { revokedAt: new Date(), revokeReason: reason } },
    ).exec();
  },
  revokeByDevice(userId: string, deviceIdHash: string, reason: string) {
    return IdentitySession.updateMany(
      { userId, deviceIdHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), revokeReason: reason } },
    ).exec();
  },
  listForUser(userId: string) {
    return IdentitySession.find({ userId, expiresAt: { $gt: new Date() } })
      .sort({ lastActiveAt: -1 })
      .exec();
  },
  updateWorkspace(id: string, userId: string, workspaceId: string) {
    return IdentitySession.findOneAndUpdate(
      { _id: id, userId, revokedAt: { $exists: false } },
      { $set: { workspaceId, lastActiveAt: new Date() } },
      { new: true },
    ).exec();
  },
};

export const credentialRepository = {
  create(data: Partial<IApiCredential>) {
    return ApiCredential.create(data);
  },
  findByPrefixWithSecret(prefix: string) {
    return ApiCredential.findOne({ prefix, revokedAt: { $exists: false } })
      .select('+secretHash')
      .exec();
  },
  list(workspaceId: string, userId?: string) {
    const filter: FilterQuery<IApiCredential> = { workspaceId };
    if (userId) filter.userId = userId;
    return ApiCredential.find(filter).sort({ createdAt: -1 }).limit(200).exec();
  },
  findOwned(workspaceId: string, id: string, userId: string) {
    return ApiCredential.findOne({ _id: id, workspaceId, userId, revokedAt: { $exists: false } }).exec();
  },
  revoke(workspaceId: string, id: string, userId?: string) {
    const filter: FilterQuery<IApiCredential> = { _id: id, workspaceId };
    if (userId) filter.userId = userId;
    return ApiCredential.findOneAndUpdate(
      filter,
      { $set: { revokedAt: new Date() } },
      { new: true },
    ).exec();
  },
  revokeForServiceAccount(workspaceId: string, serviceAccountId: string, exceptCredentialId?: string) {
    const filter: FilterQuery<IApiCredential> = {
      workspaceId, serviceAccountId, revokedAt: { $exists: false },
    };
    if (exceptCredentialId) filter._id = { $ne: exceptCredentialId };
    return ApiCredential.updateMany(
      filter,
      { $set: { revokedAt: new Date() } },
    ).exec();
  },
  touch(id: string, ipAddress: string) {
    return ApiCredential.updateOne(
      { _id: id, revokedAt: { $exists: false } },
      { $set: { lastUsedAt: new Date(), lastUsedIp: ipAddress } },
    ).exec();
  },
};

export const serviceAccountRepository = {
  create(data: Partial<IServiceAccount>) {
    return ServiceAccount.create(data);
  },
  findActiveById(id: string, workspaceId?: string) {
    const filter: FilterQuery<IServiceAccount> = { _id: id, status: 'active' };
    if (workspaceId) filter.workspaceId = workspaceId;
    return ServiceAccount.findOne(filter).exec();
  },
  list(workspaceId: string) {
    return ServiceAccount.find({ workspaceId }).sort({ createdAt: -1 }).limit(200).exec();
  },
  findById(workspaceId: string, id: string) {
    return ServiceAccount.findOne({ _id: id, workspaceId }).exec();
  },
  disable(workspaceId: string, id: string) {
    return ServiceAccount.findOneAndUpdate(
      { _id: id, workspaceId },
      { $set: { status: 'disabled' } },
      { new: true },
    ).exec();
  },
  touch(id: string) {
    return ServiceAccount.updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } }).exec();
  },
};

export const securityEventRepository = {
  create(data: Record<string, unknown>) {
    return SecurityEvent.create(data);
  },
  async list(filter: FilterQuery<ISecurityEvent>, page: number, limit: number) {
    const [items, total] = await Promise.all([
      SecurityEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      SecurityEvent.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
};

export const challengeRepository = {
  create(data: Partial<IIdentityChallenge>) {
    return IdentityChallenge.create(data);
  },
  findByTokenHash(tokenHash: string) {
    return IdentityChallenge.findOne({
      tokenHash,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).select('+tokenHash +codeHash').exec();
  },
  incrementAttempt(id: string) {
    return IdentityChallenge.updateOne({ _id: id }, { $inc: { attempts: 1 } }).exec();
  },
  consume(id: string) {
    return IdentityChallenge.findOneAndUpdate(
      { _id: id, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
      { new: true },
    ).exec();
  },
};

export const invitationRepository = {
  create(data: Partial<IWorkspaceInvitation>) {
    return WorkspaceInvitation.create(data);
  },
  findPendingByTokenHash(tokenHash: string) {
    return WorkspaceInvitation.findOne({
      tokenHash,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).select('+tokenHash').exec();
  },
  list(workspaceId: string) {
    return WorkspaceInvitation.find({ workspaceId }).sort({ createdAt: -1 }).limit(200).exec();
  },
  findById(workspaceId: string, id: string) {
    return WorkspaceInvitation.findOne({ _id: id, workspaceId }).select('+tokenHash').exec();
  },
  findPending(workspaceId: string, email: string) {
    return WorkspaceInvitation.findOne({
      workspaceId,
      email: email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).exec();
  },
  updateToken(id: string, tokenHash: string, expiresAt: Date) {
    return WorkspaceInvitation.findByIdAndUpdate(
      id,
      { $set: { tokenHash, expiresAt, status: 'pending' } },
      { new: true },
    ).exec();
  },
  accept(id: string, userId: string) {
    return WorkspaceInvitation.findOneAndUpdate(
      { _id: id, status: 'pending', expiresAt: { $gt: new Date() } },
      { $set: { status: 'accepted', acceptedBy: userId, acceptedAt: new Date() } },
      { new: true },
    ).exec();
  },
  async acceptWithMembership(id: string, userId: string) {
    const transaction = await mongoose.startSession();
    let accepted: IWorkspaceInvitation | null = null;
    try {
      await transaction.withTransaction(async () => {
        accepted = await WorkspaceInvitation.findOneAndUpdate(
          { _id: id, status: 'pending', expiresAt: { $gt: new Date() } },
          { $set: { status: 'accepted', acceptedBy: userId, acceptedAt: new Date() } },
          { new: true, session: transaction },
        ).exec();
        if (!accepted) return;
        const invitation = accepted as IWorkspaceInvitation;
        const existing = await Workspace.updateOne(
          { _id: invitation.workspaceId, 'members.user': userId },
          { $set: { 'members.$.role': invitation.role, 'members.$.status': 'active' } },
          { session: transaction },
        ).exec();
        if (existing.matchedCount === 0) {
          await Workspace.updateOne(
            { _id: invitation.workspaceId },
            { $push: { members: { user: userId, role: invitation.role, status: 'active', joinedAt: new Date() } } },
            { session: transaction },
          ).exec();
        }
        if (invitation.organizationId) {
          await Organization.updateOne(
            { _id: invitation.organizationId, 'members.userId': { $ne: userId } },
            { $push: { members: { userId, role: 'guest', status: 'active', joinedAt: new Date() } } },
            { session: transaction },
          ).exec();
        }
      });
      return accepted as IWorkspaceInvitation | null;
    } finally {
      await transaction.endSession();
    }
  },
  revoke(workspaceId: string, id: string) {
    return WorkspaceInvitation.findOneAndUpdate(
      { _id: id, workspaceId, status: 'pending' },
      { $set: { status: 'revoked', revokedAt: new Date() } },
      { new: true },
    ).exec();
  },
  decline(id: string, userId: string) {
    return WorkspaceInvitation.findOneAndUpdate(
      { _id: id, status: 'pending', expiresAt: { $gt: new Date() } },
      { $set: { status: 'declined', acceptedBy: userId } },
      { new: true },
    ).exec();
  },
  restoreToken(id: string, tokenHash: string, expiresAt: Date) {
    return WorkspaceInvitation.updateOne(
      { _id: id, status: 'pending' },
      { $set: { tokenHash, expiresAt } },
    ).exec();
  },
};

export const ssoConfigurationRepository = {
  list(organizationId: string): Promise<ISsoConfiguration[]> {
    return SsoConfiguration.find({ organizationId }).select('-configurationEncrypted').exec();
  },
};
