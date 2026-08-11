import { Queue, type JobsOptions } from 'bullmq';
import { config } from '../config/env.js';
import { logger } from '../logger/index.js';
import { getQueueConnection } from './connection.js';

export const QUEUE_NAMES = {
  webhookDelivery: 'webhook-delivery',
  email: 'email',
  security: 'security',
} as const;

/** Job-type names within the `security` queue — distinct from the queue name itself. */
export const SECURITY_JOB_NAMES = {
  threatEval: 'evaluate-threats',
  complianceCollect: 'collect-compliance',
} as const;

const defaultJobOptions: JobsOptions = {
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

let webhookQueue: Queue | null = null;
let emailQueue: Queue | null = null;
let securityQueue: Queue | null = null;

export function getWebhookQueue(): Queue {
  webhookQueue ??= new Queue(QUEUE_NAMES.webhookDelivery, {
    connection: getQueueConnection(),
    defaultJobOptions: { ...defaultJobOptions, attempts: 8, backoff: { type: 'exponential', delay: 15_000 } },
  });
  return webhookQueue;
}

export function getEmailQueue(): Queue {
  emailQueue ??= new Queue(QUEUE_NAMES.email, {
    connection: getQueueConnection(),
    defaultJobOptions: { ...defaultJobOptions, attempts: 5, backoff: { type: 'exponential', delay: 10_000 } },
  });
  return emailQueue;
}

export function getSecurityQueue(): Queue {
  securityQueue ??= new Queue(QUEUE_NAMES.security, {
    connection: getQueueConnection(),
    defaultJobOptions: { ...defaultJobOptions, attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
  });
  return securityQueue;
}

/**
 * Fire-and-forget enqueue: logs and swallows failures instead of propagating them to
 * the caller, matching this codebase's existing degrade-gracefully pattern for optional
 * infrastructure (see emailService's no-SMTP-configured handling). An unreachable Redis
 * should never fail the HTTP request that triggered the enqueue.
 */
export function enqueue(queue: Queue, name: string, data: unknown, opts?: JobsOptions): void {
  if (!config.features.queues) {
    logger.warn('Skipped enqueueing job — queues disabled (ENABLE_QUEUES=false)', { queue: queue.name, job: name });
    return;
  }
  void queue.add(name, data, opts).catch((error: Error) => {
    logger.error('Failed to enqueue job', { queue: queue.name, job: name, error: error.message });
  });
}
