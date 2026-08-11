import type { Job } from 'bullmq';
import { logger } from '../../logger/index.js';
import { SecurityEvent } from '../../modules/identity/model.js';
import { complianceService, threatService } from '../../modules/security/service.js';
import { SECURITY_JOB_NAMES } from '../queues.js';

async function activeWorkspaceIds(since: Date): Promise<string[]> {
  const values = await SecurityEvent.distinct('workspaceId', {
    workspaceId: { $exists: true },
    createdAt: { $gte: since },
  }).exec();
  return values.map(String).filter((value) => /^[a-f\d]{24}$/i.test(value));
}

async function evaluateThreats(): Promise<void> {
  const workspaces = await activeWorkspaceIds(new Date(Date.now() - 24 * 60 * 60_000));
  for (const workspaceId of workspaces) {
    await threatService.evaluate(workspaceId);
  }
}

async function collectCompliance(): Promise<void> {
  const workspaces = await activeWorkspaceIds(new Date(Date.now() - 30 * 24 * 60 * 60_000));
  for (const workspaceId of workspaces) {
    await complianceService.collect(workspaceId);
  }
}

export async function processSecurityJob(job: Job): Promise<void> {
  if (job.name === SECURITY_JOB_NAMES.threatEval) {
    await evaluateThreats();
    return;
  }
  if (job.name === SECURITY_JOB_NAMES.complianceCollect) {
    await collectCompliance();
    return;
  }
  logger.warn('Unknown security job name', { name: job.name });
}
