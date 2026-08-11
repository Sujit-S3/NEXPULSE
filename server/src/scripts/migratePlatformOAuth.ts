import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { PlatformConnection } from '../modules/platforms/model.js';

async function clearCollectionIfPresent(name: string): Promise<number> {
  const database = mongoose.connection.db;
  if (!database) return 0;
  const exists = await database.listCollections({ name }, { nameOnly: true }).hasNext();
  if (!exists) return 0;
  const result = await database.collection(name).deleteMany({});
  return result.deletedCount;
}

async function migrate(): Promise<void> {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const legacyConnections = await PlatformConnection.deleteMany({ oauthVersion: { $ne: 1 } });
  const upgradedConnections = await PlatformConnection.updateMany(
    { oauthVersion: 1, tokenVersion: { $exists: false } },
    { $set: { tokenVersion: 1 } },
  );
  const legacyAccounts = await clearCollectionIfPresent('socialaccounts');

  console.info('Platform OAuth migration complete', {
    legacyConnections: legacyConnections.deletedCount,
    upgradedConnections: upgradedConnections.modifiedCount,
    legacyAccounts,
  });
}

migrate()
  .catch((error: unknown) => {
    console.error('Platform OAuth migration failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
