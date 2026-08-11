import { connectDatabase, disconnectDatabase } from '../database/index.js';
import { logger } from '../logger/index.js';
import { BillingSubscription, BillingWebhookEvent } from '../modules/billing/model.js';

async function migrate(): Promise<void> {
  await connectDatabase();
  for (const model of [BillingSubscription, BillingWebhookEvent]) {
    await model.createIndexes();
    logger.info('Billing platform indexes ready', { model: model.modelName });
  }
}

migrate()
  .then(async () => {
    await disconnectDatabase();
    logger.info('Billing platform migration complete');
  })
  .catch(async (error) => {
    logger.error('Billing platform migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await disconnectDatabase();
    process.exitCode = 1;
  });
