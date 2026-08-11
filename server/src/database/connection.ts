import mongoose from 'mongoose';
import type { MongoMemoryReplSet } from 'mongodb-memory-server';
import { config } from '../config/env.js';
import { logger } from '../logger/index.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;
let memoryReplicaSet: MongoMemoryReplSet | undefined;

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info(`MongoDB connected successfully (attempt ${attempt})`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed`, {
        error: message,
      });

      if (attempt >= MAX_RETRIES) {
        if (config.env === 'production') {
          throw new Error('MongoDB is unavailable; refusing to start production with ephemeral storage');
        }
        logger.warn('All MongoDB connection retries exhausted, starting an ephemeral development replica set');
        await startInMemoryMongo();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function startInMemoryMongo(): Promise<void> {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  memoryReplicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = memoryReplicaSet.getUri();
  logger.info('In-memory MongoDB replica set started');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  logger.info('MongoDB connected to in-memory instance');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryReplicaSet) {
    await memoryReplicaSet.stop();
    memoryReplicaSet = undefined;
  }
  logger.info('MongoDB connection closed');
}
