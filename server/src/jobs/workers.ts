import { Worker } from 'bullmq';
import { logger } from '../logger/index.js';
import { getWorkerConnection } from './connection.js';
import { processEmailJob } from './processors/emailProcessor.js';
import { processSecurityJob } from './processors/securityProcessor.js';
import { processWebhookDelivery } from './processors/webhookProcessor.js';
import { getSecurityQueue, QUEUE_NAMES, SECURITY_JOB_NAMES } from './queues.js';

const THREAT_EVAL_INTERVAL_MS = 60_000;
const COMPLIANCE_COLLECT_INTERVAL_MS = 24 * 60 * 60_000;

function onWorkerEvents(worker: Worker, queueName: string): void {
  worker.on('failed', (job, error) => {
    logger.error('Job failed', { queue: queueName, job: job?.name, id: job?.id, attempt: job?.attemptsMade, error: error.message });
  });
  worker.on('error', (error) => {
    logger.error('Worker error', { queue: queueName, error: error.message });
  });
}

/**
 * Registers the two security jobs as BullMQ repeatable jobs. Idempotent: BullMQ keys
 * a repeatable job by name + repeat options, so calling this on every startup does not
 * create duplicate schedulers.
 */
async function scheduleRecurringSecurityJobs(): Promise<void> {
  const queue = getSecurityQueue();
  await queue.add(SECURITY_JOB_NAMES.threatEval, {}, {
    repeat: { every: THREAT_EVAL_INTERVAL_MS },
    jobId: 'evaluate-threats-recurring',
  });
  await queue.add(SECURITY_JOB_NAMES.complianceCollect, {}, {
    repeat: { every: COMPLIANCE_COLLECT_INTERVAL_MS },
    jobId: 'collect-compliance-recurring',
  });
  // Run an immediate pass on startup too, matching the previous interval-loop behavior
  // of evaluating on boot rather than waiting a full interval for the first run.
  await queue.add(SECURITY_JOB_NAMES.threatEval, {}, { jobId: `evaluate-threats-boot-${Date.now()}` });
}

export async function startJobWorkers(): Promise<() => Promise<void>> {
  const connection = getWorkerConnection();

  const webhookWorker = new Worker(QUEUE_NAMES.webhookDelivery, processWebhookDelivery, { connection, concurrency: 10 });
  const emailWorker = new Worker(QUEUE_NAMES.email, processEmailJob, { connection, concurrency: 5 });
  const securityWorker = new Worker(QUEUE_NAMES.security, processSecurityJob, { connection, concurrency: 1 });

  onWorkerEvents(webhookWorker, QUEUE_NAMES.webhookDelivery);
  onWorkerEvents(emailWorker, QUEUE_NAMES.email);
  onWorkerEvents(securityWorker, QUEUE_NAMES.security);

  try {
    await scheduleRecurringSecurityJobs();
  } catch (error) {
    logger.error('Failed to schedule recurring security jobs', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('Job workers started', { queues: Object.values(QUEUE_NAMES) });

  return async () => {
    await Promise.all([webhookWorker.close(), emailWorker.close(), securityWorker.close()]);
  };
}
