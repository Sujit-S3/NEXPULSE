import IORedis from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../logger/index.js';

let producerConnection: IORedis | null = null;
let workerConnection: IORedis | null = null;

function logConnectionEvents(client: IORedis, role: string): void {
  client.on('error', (error) => {
    logger.error('Redis connection error', { role, error: error.message });
  });
  client.on('connect', () => logger.info('Redis connected', { role }));
  client.on('close', () => logger.warn('Redis connection closed', { role }));
}

/**
 * Connection used by Queue producers (`.add()` calls from request-handling code).
 *
 * `retryStrategy` never returns null — the connection keeps trying to reconnect
 * indefinitely in the background (capped backoff) so it recovers on its own once Redis
 * comes back, rather than permanently entering ioredis's terminal "end" state, where
 * every subsequent command synchronously throws "Connection is closed" instead of
 * rejecting a catchable promise — that previously crashed the whole process on an
 * unrelated command once Redis had been unreachable for a few seconds.
 * `maxRetriesPerRequest`/`connectTimeout` bound how long any *one* command waits
 * before its own promise rejects, which is what actually keeps `.add()` calls fast.
 */
export function getQueueConnection(): IORedis {
  if (!producerConnection) {
    producerConnection = new IORedis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 5_000,
      retryStrategy: (attempt) => Math.min(attempt * 500, 10_000),
    });
    logConnectionEvents(producerConnection, 'queue-producer');
  }
  return producerConnection;
}

/**
 * Connection used by BullMQ Workers. BullMQ requires `maxRetriesPerRequest: null` on
 * worker connections (blocking commands); reconnection is handled indefinitely since
 * this only runs inside the long-lived server process (never during tests).
 */
export function getWorkerConnection(): IORedis {
  if (!workerConnection) {
    workerConnection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (attempt) => Math.min(attempt * 500, 10_000),
    });
    logConnectionEvents(workerConnection, 'queue-worker');
  }
  return workerConnection;
}

export async function closeQueueConnections(): Promise<void> {
  await Promise.all([
    producerConnection?.quit().catch(() => producerConnection?.disconnect()),
    workerConnection?.quit().catch(() => workerConnection?.disconnect()),
  ]);
  producerConnection = null;
  workerConnection = null;
}
