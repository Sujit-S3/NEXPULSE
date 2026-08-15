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

async function runPerWorkspace(
  label: string,
  workspaces: string[],
  run: (workspaceId: string) => Promise<unknown>,
): Promise<void> {
  const results = await Promise.allSettled(workspaces.map((workspaceId) => run(workspaceId)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(`${label} failed for workspace`, {
        workspaceId: workspaces[index],
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });
}

async function evaluateThreats(): Promise<void> {
  const workspaces = await activeWorkspaceIds(new Date(Date.now() - 24 * 60 * 60_000));
  await runPerWorkspace('Threat evaluation', workspaces, (workspaceId) => threatService.evaluate(workspaceId));
}

async function collectCompliance(): Promise<void> {
  const workspaces = await activeWorkspaceIds(new Date(Date.now() - 30 * 24 * 60 * 60_000));
  await runPerWorkspace('Compliance collection', workspaces, (workspaceId) => complianceService.collect(workspaceId));
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
