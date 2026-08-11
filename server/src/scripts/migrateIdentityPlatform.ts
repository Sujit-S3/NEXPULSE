import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { Workspace } from '../modules/auth/model.js';
import { hashSecret } from '../modules/identity/crypto.js';
import { Organization } from '../modules/identity/model.js';

async function migrateRecoveryTokens(): Promise<number> {
  const database = mongoose.connection.db;
  if (!database) return 0;
  const users = database.collection('users');
  const cursor = users.find({
    $or: [
      { emailVerificationToken: { $type: 'string' } },
      { passwordResetToken: { $type: 'string' } },
    ],
  });
  let migrated = 0;
  for await (const user of cursor) {
    const set: Record<string, unknown> = {};
    if (typeof user['emailVerificationToken'] === 'string') {
      set['emailVerificationTokenHash'] = hashSecret(user['emailVerificationToken']);
    }
    if (typeof user['passwordResetToken'] === 'string') {
      set['passwordResetTokenHash'] = hashSecret(user['passwordResetToken']);
    }
    await users.updateOne(
      { _id: user['_id'] },
      { $set: set, $unset: { emailVerificationToken: '', passwordResetToken: '' } },
    );
    migrated += 1;
  }
  return migrated;
}

async function removeLegacyRefreshTokens(): Promise<number> {
  const database = mongoose.connection.db;
  if (!database) return 0;
  const exists = await database.listCollections({ name: 'refreshtokens' }, { nameOnly: true }).hasNext();
  if (!exists) return 0;
  const result = await database.collection('refreshtokens').deleteMany({});
  return result.deletedCount;
}

async function normalizeIdentityFields(): Promise<void> {
  const database = mongoose.connection.db;
  if (!database) return;
  const users = database.collection('users');
  const workspaces = database.collection('workspaces');

  await Promise.all([
    users.updateMany({ role: 'owner' }, { $set: { role: 'workspace_owner' } }),
    users.updateMany({ role: 'admin' }, { $set: { role: 'workspace_admin' } }),
    users.updateMany({ securityStamp: { $exists: false } }, { $set: { securityStamp: 1 } }),
    users.updateMany({ 'mfa.enabled': { $exists: false } }, { $set: { 'mfa.enabled': false } }),
    users.updateMany({ 'mfa.emailOtpEnabled': { $exists: false } }, { $set: { 'mfa.emailOtpEnabled': false } }),
    users.updateMany({ 'mfa.recoveryCodeHashes': { $exists: false } }, { $set: { 'mfa.recoveryCodeHashes': [] } }),
    users.updateMany({ 'mfa.trustedDevices': { $exists: false } }, { $set: { 'mfa.trustedDevices': [] } }),
    workspaces.updateMany(
      { 'members.role': 'owner' },
      { $set: { 'members.$[member].role': 'workspace_owner' } },
      { arrayFilters: [{ 'member.role': 'owner' }] },
    ),
    workspaces.updateMany(
      { 'members.role': 'admin' },
      { $set: { 'members.$[member].role': 'workspace_admin' } },
      { arrayFilters: [{ 'member.role': 'admin' }] },
    ),
    workspaces.updateMany(
      { 'members.status': { $exists: false } },
      { $set: { 'members.$[member].status': 'active' } },
      { arrayFilters: [{ 'member.status': { $exists: false } }] },
    ),
    workspaces.updateMany({ 'settings.maxActiveSessions': { $exists: false } }, { $set: { 'settings.maxActiveSessions': 10 } }),
  ]);
}

async function backfillOrganizations(): Promise<number> {
  const workspaces = await Workspace.find({ organizationId: { $exists: false }, owner: { $exists: true } }).exec();
  let created = 0;
  for (const workspace of workspaces) {
    let organization = await Organization.findOne({ ownerId: workspace.owner }).exec();
    if (!organization) {
      organization = await Organization.create({
        name: `${workspace.name} Organization`,
        slug: `${workspace.slug}-org-${workspace._id.toString().slice(-6)}`,
        ownerId: workspace.owner,
        members: [{ userId: workspace.owner, role: 'organization_owner', status: 'active', joinedAt: new Date() }],
      });
      created += 1;
    }
    await Promise.all([
      Workspace.updateOne({ _id: workspace._id }, { $set: { organizationId: organization._id } }).exec(),
      mongoose.connection.collection('users').updateOne(
        { _id: workspace.owner, organizationId: { $exists: false } },
        { $set: { organizationId: organization._id } },
      ),
    ]);
  }
  return created;
}

async function migrate(): Promise<void> {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const [recoveryTokensMigrated, legacyRefreshTokensRevoked] = await Promise.all([
    migrateRecoveryTokens(),
    removeLegacyRefreshTokens(),
  ]);
  await normalizeIdentityFields();
  const organizationsCreated = await backfillOrganizations();
  console.info('Identity platform migration complete', {
    recoveryTokensMigrated,
    legacyRefreshTokensRevoked,
    organizationsCreated,
    actionRequired: 'Existing users must sign in again because legacy refresh tokens were revoked.',
  });
}

migrate()
  .catch((error: unknown) => {
    console.error('Identity platform migration failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
