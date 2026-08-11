import { app } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import { closeQueueConnections, startJobWorkers } from './jobs/index.js';
import { logger } from './logger/index.js';
import { startOperationsMonitor } from './operations/monitor.js';

// Registered before any async work (DB/Redis connections, worker startup) below, so
// a rejection surfacing from background activity kicked off during startup — e.g. a
// BullMQ Worker's internal read loop retrying against an unreachable Redis — can never
// fire before these safety nets exist.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

async function main(): Promise<void> {
  logger.info('Starting server', { env: config.env, port: config.port });

  await connectDatabase();
  const stopOperationsMonitor = startOperationsMonitor();

  const server = app.listen(config.port, () => {
    logger.info(`Server listening on http://localhost:${config.port}`);
  });

  let stopJobWorkers: (() => Promise<void>) | null = null;
  if (config.features.queues) {
    try {
      stopJobWorkers = await startJobWorkers();
    } catch (error) {
      logger.error('Failed to start job workers', { error: error instanceof Error ? error.message : String(error) });
    }
  } else {
    logger.warn('Background job queues are disabled (ENABLE_QUEUES=false) — webhooks, security jobs, and queued email will not be processed.');
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    await stopJobWorkers?.();
    await closeQueueConnections();
    stopOperationsMonitor();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start server', { error: error instanceof Error ? error.message : error });
  process.exit(1);
});

export { app };
