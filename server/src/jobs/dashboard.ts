import type { RequestHandler } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getEmailQueue, getSecurityQueue, getWebhookQueue } from './queues.js';

const DASHBOARD_BASE_PATH = '/api/v1/developer/queues';

let router: RequestHandler | null = null;

function buildRouter(): RequestHandler {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(DASHBOARD_BASE_PATH);
  createBullBoard({
    queues: [
      new BullMQAdapter(getWebhookQueue()),
      new BullMQAdapter(getEmailQueue()),
      new BullMQAdapter(getSecurityQueue()),
    ],
    serverAdapter,
  });
  return serverAdapter.getRouter();
}

/**
 * Lazily builds the bull-board router on first request rather than at module import
 * time — constructing it eagerly would touch the Queue/Redis layer as a side effect of
 * importing this module, which would fire during test runs (`app.ts` is imported by
 * integration tests) even though no test ever requests this path.
 */
export const queueDashboard: RequestHandler = (req, res, next) => {
  router ??= buildRouter();
  router(req, res, next);
};

export { DASHBOARD_BASE_PATH };
