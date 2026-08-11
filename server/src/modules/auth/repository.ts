import type { FilterQuery, Types } from 'mongoose';
import { User, Workspace } from './model.js';
import type { IUser, IWorkspace } from './model.js';

export const userRepository = {
  async create(data: Partial<IUser>): Promise<IUser> {
    return User.create(data);
  },

  async findById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, deletedAt: null }).exec();
  },

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase(), deletedAt: null }).exec();
  },

  async findByIds(ids: string[]): Promise<IUser[]> {
    return User.find({ _id: { $in: ids }, deletedAt: null }).exec();
  },

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase(), deletedAt: null })
      .select('+password +failedLoginAttempts +lockedUntil +mfa.totpSecretEncrypted +mfa.recoveryCodeHashes +mfa.trustedDevices')
      .exec();
  },

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, deletedAt: null })
      .select('+password')
      .exec();
  },

  async findByIdWithMfa(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, deletedAt: null })
      .select('+password +mfa.totpSecretEncrypted +mfa.pendingTotpSecretEncrypted +mfa.recoveryCodeHashes +mfa.trustedDevices')
      .exec();
  },

  async updateById(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  async softDelete(id: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true },
    ).exec();
  },

  async findByVerificationTokenHash(tokenHash: string): Promise<IUser | null> {
    return User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
      deletedAt: null,
    }).select('+emailVerificationTokenHash').exec();
  },

  async findByPasswordResetTokenHash(tokenHash: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
      deletedAt: null,
    }).select('+passwordResetTokenHash').exec();
  },

  async recordFailedLogin(id: string, lockUntil?: Date): Promise<void> {
    const update: Record<string, unknown> = { $inc: { failedLoginAttempts: 1 } };
    if (lockUntil) update['$set'] = { lockedUntil: lockUntil };
    await User.updateOne({ _id: id }, update).exec();
  },

  async clearFailedLogins(id: string): Promise<void> {
    await User.updateOne(
      { _id: id },
      { $set: { failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } },
    ).exec();
  },

  async count(filter: FilterQuery<IUser> = {}): Promise<number> {
    return User.countDocuments({ ...filter, deletedAt: null }).exec();
  },

  async updateWorkspace(
    id: string,
    workspaceId: string,
    role: string,
  ): Promise<IUser | null> {
    return User.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { workspaceId, role } },
      { new: true },
    ).exec();
  },
};

export const workspaceRepository = {
  async create(data: Partial<IWorkspace>): Promise<IWorkspace> {
    return Workspace.create(data);
  },

  async findById(id: string): Promise<IWorkspace | null> {
    return Workspace.findById(id).exec();
  },

  async findBySlug(slug: string): Promise<IWorkspace | null> {
    return Workspace.findOne({ slug: slug.toLowerCase() }).exec();
  },

  async findByOwner(ownerId: string): Promise<IWorkspace | null> {
    return Workspace.findOne({ owner: ownerId }).exec();
  },

  async updateById(id: string, data: Partial<IWorkspace>): Promise<IWorkspace | null> {
    return Workspace.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  },

  async addMember(
    workspaceId: string,
    member: { user: Types.ObjectId; role: string },
  ): Promise<IWorkspace | null> {
    return Workspace.findByIdAndUpdate(
      workspaceId,
      { $addToSet: { members: { ...member, status: 'active', joinedAt: new Date() } } },
      { new: true },
    ).exec();
  },

  async upsertMember(
    workspaceId: string,
    userId: string,
    role: string,
  ): Promise<IWorkspace | null> {
    const updated = await Workspace.findOneAndUpdate(
      { _id: workspaceId, 'members.user': userId },
      { $set: { 'members.$.role': role, 'members.$.status': 'active' } },
      { new: true },
    ).exec();
    if (updated) return updated;
    return Workspace.findByIdAndUpdate(
      workspaceId,
      { $push: { members: { user: userId, role, status: 'active', joinedAt: new Date() } } },
      { new: true },
    ).exec();
  },

  async updateMemberRole(workspaceId: string, userId: string, role: string): Promise<IWorkspace | null> {
    return Workspace.findOneAndUpdate(
      { _id: workspaceId, owner: { $ne: userId }, 'members.user': userId },
      { $set: { 'members.$.role': role } },
      { new: true },
    ).exec();
  },

  async removeMember(workspaceId: string, userId: string): Promise<IWorkspace | null> {
    return Workspace.findOneAndUpdate(
      { _id: workspaceId, owner: { $ne: userId }, 'members.user': userId },
      { $pull: { members: { user: userId } } },
      { new: true },
    ).exec();
  },

  async findByUser(userId: string): Promise<IWorkspace[]> {
    return Workspace.find({
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, status: { $ne: 'suspended' } } } },
      ],
    })
      .sort({ createdAt: 1 })
      .exec();
  },

  async findForMember(workspaceId: string, userId: string): Promise<IWorkspace | null> {
    return Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, status: { $ne: 'suspended' } } } },
      ],
    }).exec();
  },

  async findMembership(workspaceId: string, userId: string): Promise<{ workspace: IWorkspace; role: string } | null> {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, status: { $ne: 'suspended' } } } },
      ],
    }).exec();
    if (!workspace) return null;
    if (workspace.owner?.toString() === userId) return { workspace, role: 'workspace_owner' };
    const member = workspace.members.find((candidate) => candidate.user.toString() === userId);
    return member ? { workspace, role: member.role } : null;
  },

  async memberIds(workspaceId: string): Promise<string[]> {
    const workspace = await Workspace.findById(workspaceId).select('owner members.user').exec();
    if (!workspace) return [];
    return Array.from(
      new Set([
        workspace.owner?.toString(),
        ...workspace.members
          .filter((member) => member.status !== 'suspended' && member.status !== 'inactive')
          .map((member) => member.user.toString()),
      ].filter((value): value is string => Boolean(value))),
    );
  },
};
