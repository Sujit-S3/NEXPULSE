import { connectDatabase, disconnectDatabase } from '../database/index.js';
import { logger } from '../logger/index.js';
import { Workspace } from '../modules/auth/model.js';
import {
  ComplianceEvidence,
  DataAsset,
  ManagedSecret,
  PolicyDecision,
  PolicyRevision,
  SecretVersion,
  SecurityIncident,
  SecurityPolicy,
  ThreatSignal,
  type PolicyTarget,
} from '../modules/security/model.js';

const protectedTargets: PolicyTarget[] = ['access', 'resource', 'workspace', 'organization'];

async function migrate(): Promise<void> {
  await connectDatabase();
  await Promise.all([
    SecurityPolicy.syncIndexes(),
    PolicyRevision.syncIndexes(),
    PolicyDecision.syncIndexes(),
    ManagedSecret.syncIndexes(),
    SecretVersion.syncIndexes(),
    DataAsset.syncIndexes(),
    ComplianceEvidence.syncIndexes(),
    ThreatSignal.syncIndexes(),
    SecurityIncident.syncIndexes(),
  ]);

  const workspaces = await Workspace.find({}).select('_id organizationId owner').lean().exec();
  let seeded = 0;
  for (const workspace of workspaces) {
    for (const target of protectedTargets) {
      const name = `Baseline zero-trust guard (${target})`;
      const exists = await SecurityPolicy.exists({ workspaceId: workspace._id, name });
      if (exists) continue;
      const policy = await SecurityPolicy.create({
        workspaceId: workspace._id,
        organizationId: workspace.organizationId,
        name,
        description: 'Allows authorized requests only while the authenticated session remains below the elevated-risk threshold.',
        target,
        actionPattern: '*',
        resourcePattern: '*',
        effect: 'allow',
        conditions: { maxRiskScore: 70 },
        priority: 100,
        status: 'enforced',
        version: 1,
        createdBy: workspace.owner,
        updatedBy: workspace.owner,
      });
      await PolicyRevision.create({
        policyId: policy._id,
        workspaceId: workspace._id,
        version: 1,
        snapshot: {
          name: policy.name,
          description: policy.description,
          target: policy.target,
          actionPattern: policy.actionPattern,
          resourcePattern: policy.resourcePattern,
          effect: policy.effect,
          conditions: policy.conditions,
          priority: policy.priority,
          status: policy.status,
          version: policy.version,
        },
        changedBy: workspace.owner,
        changeReason: 'Phase 21 zero-trust baseline',
      });
      seeded += 1;
    }
  }
  logger.info('Security platform migration complete', { workspaces: workspaces.length, seededPolicies: seeded });
}

migrate()
  .catch((error) => {
    logger.error('Security platform migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
