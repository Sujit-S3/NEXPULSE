import { connectDatabase, disconnectDatabase } from '../database/index.js';
import { logger } from '../logger/index.js';
import {
  ApiQuotaPolicy,
  ApiRateLimitBucket,
  ApiUsageMetric,
  DeveloperApplication,
  OAuthAuthorizationCode,
  OAuthToken,
  PluginInstallation,
  PluginPackage,
  WebhookDelivery,
  WebhookEndpoint,
} from '../modules/developer/model.js';

async function migrate(): Promise<void> {
  await connectDatabase();
  const models = [
    DeveloperApplication,
    OAuthAuthorizationCode,
    OAuthToken,
    WebhookEndpoint,
    WebhookDelivery,
    ApiRateLimitBucket,
    ApiUsageMetric,
    ApiQuotaPolicy,
    PluginPackage,
    PluginInstallation,
  ];
  for (const model of models) {
    await model.createIndexes();
    logger.info('Developer platform indexes ready', { model: model.modelName });
  }
}

migrate()
  .then(async () => {
    await disconnectDatabase();
    logger.info('Developer platform migration complete');
  })
  .catch(async (error) => {
    logger.error('Developer platform migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await disconnectDatabase();
    process.exitCode = 1;
  });
