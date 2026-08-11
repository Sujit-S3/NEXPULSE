import crypto from 'node:crypto';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/index.js';
import { ApiCredential, IdentitySession, SecurityEvent, ServiceAccount } from '../identity/model.js';
import {
  decryptIdentitySecret,
  encryptIdentitySecret,
  hashSecret,
  randomSecret,
} from '../identity/crypto.js';
import { recordSecurityEvent } from '../identity/securityEvents.js';
import {
  COMPLIANCE_FRAMEWORKS,
  ComplianceEvidence,
  DataAsset,
  ManagedSecret,
  PolicyDecision,
  PolicyRevision,
  SecretVersion,
  SecurityIncident,
  SecurityPolicy,
  ThreatSignal,
  type IManagedSecret,
  type ISecurityIncident,
  type ISecurityPolicy,
} from './model.js';
import { inspectSensitiveData } from './dlp.js';
import { detectThreats } from './threatDetection.js';

function policyDto(policy: ISecurityPolicy) {
  return {
    id: policy._id.toString(),
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
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

function secretDto(secret: IManagedSecret) {
  const rotationDueAt = new Date(secret.lastRotatedAt.getTime() + secret.rotateEveryDays * 86_400_000);
  return {
    id: secret._id.toString(),
    name: secret.name,
    purpose: secret.purpose,
    scope: secret.scope,
    status: secret.status,
    currentVersion: secret.currentVersion,
    rotateEveryDays: secret.rotateEveryDays,
    lastRotatedAt: secret.lastRotatedAt.toISOString(),
    rotationDueAt: rotationDueAt.toISOString(),
    expiresAt: secret.expiresAt?.toISOString(),
    createdAt: secret.createdAt.toISOString(),
  };
}

function incidentDto(incident: ISecurityIncident) {
  return {
    id: incident._id.toString(),
    title: incident.title,
    summary: incident.summary,
    severity: incident.severity,
    status: incident.status,
    signalIds: incident.signalIds.map(String),
    assignedTo: incident.assignedTo?.toString(),
    timeline: incident.timeline,
    containmentActions: incident.containmentActions,
    detectedAt: incident.detectedAt.toISOString(),
    containedAt: incident.containedAt?.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString(),
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  };
}

function dataAssetDto(asset: {
  _id: unknown;
  name: string;
  system: string;
  description?: string;
  ownerId: unknown;
  classification: string;
  categories: string[];
  retentionDays: number;
  legalHold: boolean;
  residencyRegion?: string;
  upstreamAssets: unknown[];
  lifecycleStatus: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(asset._id),
    name: asset.name,
    system: asset.system,
    description: asset.description,
    ownerId: String(asset.ownerId),
    classification: asset.classification,
    categories: asset.categories,
    retentionDays: asset.retentionDays,
    legalHold: asset.legalHold,
    residencyRegion: asset.residencyRegion,
    upstreamAssets: asset.upstreamAssets.map(String),
    lifecycleStatus: asset.lifecycleStatus,
    createdAt: asset.createdAt?.toISOString(),
    updatedAt: asset.updatedAt?.toISOString(),
  };
}

function threatDto(signal: {
  _id: unknown;
  ruleId: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  summary: string;
  score: number;
  fingerprint: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt?: Date;
}) {
  return {
    id: String(signal._id),
    ruleId: signal.ruleId,
    category: signal.category,
    severity: signal.severity,
    status: signal.status,
    title: signal.title,
    summary: signal.summary,
    score: signal.score,
    fingerprint: signal.fingerprint,
    firstSeenAt: signal.firstSeenAt.toISOString(),
    lastSeenAt: signal.lastSeenAt.toISOString(),
    createdAt: signal.createdAt?.toISOString(),
  };
}

function policySnapshot(policy: ISecurityPolicy): Record<string, unknown> {
  return {
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
  };
}

async function audit(input: {
  workspaceId: string;
  organizationId?: string;
  actorId: string;
  sessionId?: string;
  type: string;
  metadata?: Record<string, unknown>;
}) {
  await recordSecurityEvent({
    workspaceId: input.workspaceId,
    organizationId: input.organizationId,
    userId: input.actorId,
    actorType: 'user',
    actorId: input.actorId,
    sessionId: input.sessionId,
    type: input.type,
    outcome: 'success',
    metadata: input.metadata,
  });
}

export const policyService = {
  async list(workspaceId: string) {
    return (await SecurityPolicy.find({ workspaceId }).sort({ priority: -1, createdAt: -1 }).exec())
      .map(policyDto);
  },

  async create(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    name: string;
    description?: string;
    target: ISecurityPolicy['target'];
    actionPattern: string;
    resourcePattern: string;
    effect: ISecurityPolicy['effect'];
    conditions: ISecurityPolicy['conditions'];
    priority: number;
    status: ISecurityPolicy['status'];
  }) {
    let policy;
    try {
      policy = await SecurityPolicy.create({
        ...input,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictError('A policy with this name already exists');
      throw error;
    }
    await PolicyRevision.create({
      policyId: policy._id,
      workspaceId: input.workspaceId,
      version: 1,
      snapshot: policySnapshot(policy),
      changedBy: input.actorId,
      changeReason: 'Initial policy version',
    });
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'security.policy.created',
      metadata: { policyId: policy._id.toString(), status: policy.status, target: policy.target },
    });
    return policyDto(policy);
  },

  async update(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    policyId: string;
    expectedVersion: number;
    changeReason: string;
    changes: Partial<Pick<ISecurityPolicy,
      'name' | 'description' | 'target' | 'actionPattern' | 'resourcePattern' |
      'effect' | 'conditions' | 'priority' | 'status'
    >>;
  }) {
    const current = await SecurityPolicy.findOne({ _id: input.policyId, workspaceId: input.workspaceId }).exec();
    if (!current) throw new NotFoundError('Security policy not found');
    if (current.version !== input.expectedVersion) {
      throw new ConflictError(`Policy changed since version ${input.expectedVersion}; refresh and retry`);
    }
    Object.assign(current, input.changes, {
      updatedBy: input.actorId,
      version: current.version + 1,
    });
    try {
      await current.save();
    } catch (error) {
      if ((error as { name?: string }).name === 'VersionError') {
        throw new ConflictError('Policy was modified concurrently; refresh and retry');
      }
      throw error;
    }
    await PolicyRevision.create({
      policyId: current._id,
      workspaceId: input.workspaceId,
      version: current.version,
      snapshot: policySnapshot(current),
      changedBy: input.actorId,
      changeReason: input.changeReason,
    });
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'security.policy.updated',
      metadata: { policyId: current._id.toString(), version: current.version, status: current.status },
    });
    return policyDto(current);
  },
};

export const secretService = {
  async list(workspaceId: string) {
    const now = new Date();
    await ManagedSecret.updateMany(
      {
        workspaceId,
        status: 'active',
        $or: [
          { expiresAt: { $lte: now } },
          { $expr: { $lte: [{ $add: ['$lastRotatedAt', { $multiply: ['$rotateEveryDays', 86_400_000] }] }, now] } },
        ],
      },
      [{ $set: { status: { $cond: [{ $lte: ['$expiresAt', now] }, 'expired', 'rotation_due'] } } }],
    ).exec();
    return (await ManagedSecret.find({ workspaceId }).sort({ updatedAt: -1 }).exec()).map(secretDto);
  },

  async create(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    name: string;
    purpose: string;
    scope: IManagedSecret['scope'];
    value?: string;
    rotateEveryDays: number;
    expiresAt?: Date;
  }) {
    const value = input.value ?? randomSecret(36);
    const findings = inspectSensitiveData({ value });
    if (value.length < 16) throw new ValidationError({ value: ['Secret values must be at least 16 characters'] });
    let secret;
    try {
      secret = await ManagedSecret.create({
        ...input,
        currentVersion: 1,
        status: 'active',
        lastRotatedAt: new Date(),
        createdBy: input.actorId,
      });
      await SecretVersion.create({
        secretId: secret._id,
        workspaceId: input.workspaceId,
        version: 1,
        encryptedValue: encryptIdentitySecret(value),
        checksum: hashSecret(value),
        createdBy: input.actorId,
        expiresAt: input.expiresAt,
      });
    } catch (error) {
      if (secret) await ManagedSecret.deleteOne({ _id: secret._id }).exec();
      if ((error as { code?: number }).code === 11000) throw new ConflictError('A managed secret with this name already exists');
      throw error;
    }
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'security.secret.created',
      metadata: {
        secretId: secret._id.toString(),
        scope: secret.scope,
        suppliedByUser: Boolean(input.value),
        dlpFindingTypes: [...new Set(findings.map((finding) => finding.type))],
      },
    });
    return {
      secret: secretDto(secret),
      generatedValue: input.value ? undefined : value,
    };
  },

  async rotate(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    secretId: string;
    value?: string;
  }) {
    const secret = await ManagedSecret.findOne({
      _id: input.secretId,
      workspaceId: input.workspaceId,
      status: { $ne: 'revoked' },
    }).exec();
    if (!secret) throw new NotFoundError('Managed secret not found');
    const value = input.value ?? randomSecret(36);
    if (value.length < 16) throw new ValidationError({ value: ['Secret values must be at least 16 characters'] });
    const nextVersion = secret.currentVersion + 1;
    await SecretVersion.create({
      secretId: secret._id,
      workspaceId: input.workspaceId,
      version: nextVersion,
      encryptedValue: encryptIdentitySecret(value),
      checksum: hashSecret(value),
      createdBy: input.actorId,
      expiresAt: secret.expiresAt,
    });
    secret.currentVersion = nextVersion;
    secret.lastRotatedAt = new Date();
    secret.status = 'active';
    await secret.save();
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'security.secret.rotated',
      metadata: { secretId: secret._id.toString(), version: nextVersion },
    });
    return { secret: secretDto(secret), generatedValue: input.value ? undefined : value };
  },

  async revoke(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    secretId: string;
  }) {
    const secret = await ManagedSecret.findOneAndUpdate(
      { _id: input.secretId, workspaceId: input.workspaceId, status: { $ne: 'revoked' } },
      { $set: { status: 'revoked' } },
      { new: true },
    ).exec();
    if (!secret) throw new NotFoundError('Managed secret not found');
    await audit({ ...input, type: 'security.secret.revoked', metadata: { secretId: input.secretId } });
    return secretDto(secret);
  },

  async resolve(workspaceId: string, secretId: string, accessor: {
    actorId: string;
    actorType: 'user' | 'service_account' | 'system';
    purpose: string;
  }): Promise<string> {
    const secret = await ManagedSecret.findOne({ _id: secretId, workspaceId, status: 'active' }).exec();
    if (!secret || (secret.expiresAt && secret.expiresAt <= new Date())) {
      throw new NotFoundError('Active managed secret not found');
    }
    const version = await SecretVersion.findOne({
      secretId,
      workspaceId,
      version: secret.currentVersion,
      destroyedAt: { $exists: false },
    }).select('+encryptedValue').exec();
    if (!version) throw new NotFoundError('Active managed secret version not found');
    await recordSecurityEvent({
      workspaceId,
      actorType: accessor.actorType,
      actorId: accessor.actorId,
      userId: accessor.actorType === 'user' ? accessor.actorId : undefined,
      type: 'security.secret.accessed',
      outcome: 'success',
      metadata: { secretId, version: version.version, purpose: accessor.purpose },
    });
    return decryptIdentitySecret(version.encryptedValue);
  },
};

export const governanceService = {
  async list(workspaceId: string) {
    return (await DataAsset.find({ workspaceId }).sort({ classification: -1, name: 1 }).lean().exec())
      .map(dataAssetDto);
  },

  async create(input: {
    workspaceId: string;
    actorId: string;
    organizationId?: string;
    sessionId?: string;
    name: string;
    system: string;
    description?: string;
    ownerId?: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    categories: string[];
    retentionDays: number;
    legalHold: boolean;
    residencyRegion?: string;
    upstreamAssets: string[];
  }) {
    let asset;
    try {
      asset = await DataAsset.create({ ...input, ownerId: input.ownerId ?? input.actorId });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictError('This data asset is already catalogued');
      throw error;
    }
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'governance.asset.catalogued',
      metadata: { assetId: asset._id.toString(), classification: asset.classification },
    });
    return dataAssetDto(asset.toObject());
  },

  async queueDeletion(input: {
    workspaceId: string;
    actorId: string;
    organizationId?: string;
    sessionId?: string;
    assetId: string;
  }) {
    const asset = await DataAsset.findOne({ _id: input.assetId, workspaceId: input.workspaceId }).exec();
    if (!asset) throw new NotFoundError('Data asset not found');
    if (asset.legalHold) throw new ConflictError('This data asset is subject to legal hold');
    asset.lifecycleStatus = 'deletion_queued';
    await asset.save();
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'governance.deletion.queued',
      metadata: { assetId: asset._id.toString(), classification: asset.classification },
    });
    return dataAssetDto(asset.toObject());
  },

  inspect(input: unknown) {
    const findings = inspectSensitiveData(input);
    return {
      decision: findings.some((finding) => finding.severity === 'critical') ? 'block' : findings.length ? 'review' : 'allow',
      findings,
      scannedAt: new Date().toISOString(),
    };
  },
};

const controls = [
  { framework: 'SOC2', controlId: 'CC6.1', controlName: 'Logical access controls' },
  { framework: 'SOC2', controlId: 'CC7.2', controlName: 'Security event monitoring' },
  { framework: 'ISO27001', controlId: 'A.5.15', controlName: 'Access control policy' },
  { framework: 'ISO27001', controlId: 'A.8.15', controlName: 'Logging' },
  { framework: 'GDPR', controlId: 'ART.5', controlName: 'Data minimization and retention' },
  { framework: 'CCPA', controlId: '1798.105', controlName: 'Deletion workflow readiness' },
  { framework: 'HIPAA', controlId: '164.312(b)', controlName: 'Audit controls' },
] as const;

export const complianceService = {
  async collect(workspaceId: string) {
    const [policyCount, auditCount, threatCount, assets, sessions] = await Promise.all([
      SecurityPolicy.countDocuments({ workspaceId, status: 'enforced' }),
      SecurityEvent.countDocuments({ workspaceId }),
      ThreatSignal.countDocuments({ workspaceId, status: { $in: ['open', 'investigating'] } }),
      DataAsset.find({ workspaceId }).select('classification retentionDays legalHold lifecycleStatus').lean().exec(),
      IdentitySession.find({ workspaceId, revokedAt: { $exists: false } }).select('mfaVerifiedAt riskScore').lean().exec(),
    ]);
    const evidenceContext = {
      enforcedPolicies: policyCount,
      immutableAuditEvents: auditCount,
      openThreatSignals: threatCount,
      cataloguedAssets: assets.length,
      assetsWithRetention: assets.filter((asset) => asset.retentionDays > 0).length,
      deletionReadyAssets: assets.filter((asset) => !asset.legalHold).length,
      activeSessions: sessions.length,
      mfaVerifiedSessions: sessions.filter((session) => Boolean(session.mfaVerifiedAt)).length,
    };
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000);
    const snapshots = controls.map((control) => {
      let status: 'passing' | 'attention' | 'failing' = 'passing';
      if (['CC6.1', 'A.5.15'].includes(control.controlId) && policyCount === 0) status = 'attention';
      if (['CC7.2', 'A.8.15', '164.312(b)'].includes(control.controlId) && auditCount === 0) status = 'attention';
      if (['ART.5', '1798.105'].includes(control.controlId) && assets.length === 0) status = 'attention';
      const evidence = { ...evidenceContext, generatedBy: 'nexpulse-security-control-plane-v1' };
      return {
        workspaceId,
        ...control,
        status,
        evidence,
        evidenceHash: crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
        collectedAt: now,
        expiresAt,
      };
    });
    await ComplianceEvidence.insertMany(snapshots);
    return snapshots;
  },

  async summary(workspaceId: string) {
    const latest = await ComplianceEvidence.aggregate<{
      framework: string;
      controls: number;
      passing: number;
      attention: number;
      failing: number;
      collectedAt: Date;
    }>([
      { $match: { workspaceId: new (ComplianceEvidence.db.base.Types.ObjectId)(workspaceId) } },
      { $sort: { collectedAt: -1 } },
      { $group: {
        _id: { framework: '$framework', controlId: '$controlId' },
        status: { $first: '$status' },
        collectedAt: { $first: '$collectedAt' },
      } },
      { $group: {
        _id: '$_id.framework',
        controls: { $sum: 1 },
        passing: { $sum: { $cond: [{ $eq: ['$status', 'passing'] }, 1, 0] } },
        attention: { $sum: { $cond: [{ $eq: ['$status', 'attention'] }, 1, 0] } },
        failing: { $sum: { $cond: [{ $eq: ['$status', 'failing'] }, 1, 0] } },
        collectedAt: { $max: '$collectedAt' },
      } },
      { $project: { _id: 0, framework: '$_id', controls: 1, passing: 1, attention: 1, failing: 1, collectedAt: 1 } },
    ]).exec();
    return COMPLIANCE_FRAMEWORKS.map((framework) => (
      latest.find((item) => item.framework === framework) ?? {
        framework, controls: 0, passing: 0, attention: 0, failing: 0,
      }
    ));
  },
};

export const threatService = {
  async evaluate(workspaceId: string) {
    const since = new Date(Date.now() - 15 * 60_000);
    const events = await SecurityEvent.find({ workspaceId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .limit(5000)
      .lean()
      .exec();
    const candidates = detectThreats(events.map((event) => ({
      id: event._id.toString(),
      type: event.type,
      outcome: event.outcome,
      actorId: event.actorId,
      ipAddress: event.ipAddress,
      createdAt: event.createdAt,
      metadata: event.metadata,
    })));
    for (const candidate of candidates) {
      await ThreatSignal.findOneAndUpdate(
        { workspaceId, fingerprint: candidate.fingerprint, status: { $in: ['open', 'investigating'] } },
        {
          $set: {
            ruleId: candidate.ruleId,
            category: candidate.category,
            severity: candidate.severity,
            title: candidate.title,
            summary: candidate.summary,
            score: candidate.score,
            eventIds: candidate.eventIds,
            indicators: candidate.indicators,
            lastSeenAt: new Date(),
          },
          $setOnInsert: { firstSeenAt: new Date(), status: 'open' },
        },
        { upsert: true, new: true },
      ).exec();
    }
    return candidates.length;
  },

  async list(workspaceId: string) {
    return (await ThreatSignal.find({ workspaceId }).sort({ createdAt: -1 }).limit(200).lean().exec())
      .map(threatDto);
  },

  async updateStatus(workspaceId: string, signalId: string, status: 'investigating' | 'contained' | 'dismissed') {
    const signal = await ThreatSignal.findOneAndUpdate(
      { _id: signalId, workspaceId },
      { $set: { status } },
      { new: true },
    ).lean().exec();
    if (!signal) throw new NotFoundError('Threat signal not found');
    return threatDto(signal);
  },
};

export const incidentService = {
  async list(workspaceId: string) {
    return (await SecurityIncident.find({ workspaceId }).sort({ createdAt: -1 }).limit(200).exec()).map(incidentDto);
  },

  async create(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    title: string;
    summary: string;
    severity: ISecurityIncident['severity'];
    signalIds: string[];
    assignedTo?: string;
  }) {
    if (input.signalIds.length) {
      const count = await ThreatSignal.countDocuments({ _id: { $in: input.signalIds }, workspaceId: input.workspaceId });
      if (count !== input.signalIds.length) throw new ValidationError({ signalIds: ['One or more signals are outside this workspace'] });
    }
    const incident = await SecurityIncident.create({
      ...input,
      createdBy: input.actorId,
      timeline: [{ at: new Date(), actorId: input.actorId, action: 'incident.created' }],
    });
    if (input.signalIds.length) {
      await ThreatSignal.updateMany(
        { _id: { $in: input.signalIds }, workspaceId: input.workspaceId },
        { $set: { status: 'investigating' } },
      ).exec();
    }
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'security.incident.created',
      metadata: { incidentId: incident._id.toString(), severity: incident.severity },
    });
    return incidentDto(incident);
  },

  async transition(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    incidentId: string;
    status: 'investigating' | 'contained' | 'resolved' | 'postmortem';
    note?: string;
  }) {
    const incident = await SecurityIncident.findOne({ _id: input.incidentId, workspaceId: input.workspaceId }).exec();
    if (!incident) throw new NotFoundError('Security incident not found');
    const allowed: Record<ISecurityIncident['status'], ISecurityIncident['status'][]> = {
      open: ['investigating', 'contained'],
      investigating: ['contained', 'resolved'],
      contained: ['resolved'],
      resolved: ['postmortem'],
      postmortem: [],
    };
    if (!allowed[incident.status].includes(input.status)) {
      throw new ConflictError(`Incident cannot transition from ${incident.status} to ${input.status}`);
    }
    incident.status = input.status;
    if (input.status === 'contained') incident.containedAt = new Date();
    if (input.status === 'resolved') incident.resolvedAt = new Date();
    incident.timeline.push({ at: new Date(), actorId: input.actorId, action: `incident.${input.status}`, note: input.note });
    await incident.save();
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: `security.incident.${input.status}`,
      metadata: { incidentId: incident._id.toString() },
    });
    return incidentDto(incident);
  },

  async contain(input: {
    workspaceId: string;
    organizationId?: string;
    actorId: string;
    sessionId?: string;
    incidentId: string;
    action: 'mark_contained' | 'revoke_actor_sessions' | 'revoke_workspace_credentials';
  }) {
    const incident = await SecurityIncident.findOne({ _id: input.incidentId, workspaceId: input.workspaceId }).exec();
    if (!incident) throw new NotFoundError('Security incident not found');
    if (input.action === 'revoke_actor_sessions') {
      const signals = await ThreatSignal.find({ _id: { $in: incident.signalIds }, workspaceId: input.workspaceId })
        .select('indicators').lean().exec();
      const actorIds = [...new Set(signals.map((signal) => signal.indicators['actorId']).filter(
        (value): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value),
      ))];
      await IdentitySession.updateMany(
        { workspaceId: input.workspaceId, userId: { $in: actorIds }, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date(), revokeReason: `incident:${incident._id.toString()}` } },
      ).exec();
    }
    if (input.action === 'revoke_workspace_credentials') {
      await ApiCredential.updateMany(
        { workspaceId: input.workspaceId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      ).exec();
      await ServiceAccount.updateMany(
        { workspaceId: input.workspaceId, status: 'active' },
        { $set: { status: 'disabled' } },
      ).exec();
    }
    incident.status = 'contained';
    incident.containedAt = new Date();
    incident.containmentActions.push({ action: input.action, status: 'completed', executedAt: new Date() });
    incident.timeline.push({ at: new Date(), actorId: input.actorId, action: `containment.${input.action}` });
    await incident.save();
    await audit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      sessionId: input.sessionId,
      type: 'security.incident.contained',
      metadata: { incidentId: incident._id.toString(), action: input.action },
    });
    return incidentDto(incident);
  },
};

export const securityDashboardService = {
  async dashboard(workspaceId: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
    const [
      policies,
      enforcedPolicies,
      secrets,
      rotationDue,
      assets,
      restrictedAssets,
      threats,
      criticalThreats,
      incidents,
      decisionsDenied,
      recentEvents,
      compliance,
    ] = await Promise.all([
      SecurityPolicy.countDocuments({ workspaceId }),
      SecurityPolicy.countDocuments({ workspaceId, status: 'enforced' }),
      ManagedSecret.countDocuments({ workspaceId, status: { $ne: 'revoked' } }),
      ManagedSecret.countDocuments({ workspaceId, status: { $in: ['rotation_due', 'expired'] } }),
      DataAsset.countDocuments({ workspaceId, lifecycleStatus: { $ne: 'deleted' } }),
      DataAsset.countDocuments({ workspaceId, classification: 'restricted', lifecycleStatus: { $ne: 'deleted' } }),
      ThreatSignal.countDocuments({ workspaceId, status: { $in: ['open', 'investigating'] } }),
      ThreatSignal.countDocuments({ workspaceId, severity: 'critical', status: { $in: ['open', 'investigating'] } }),
      SecurityIncident.countDocuments({ workspaceId, status: { $in: ['open', 'investigating', 'contained'] } }),
      PolicyDecision.countDocuments({ workspaceId, decision: { $ne: 'allow' }, createdAt: { $gte: dayAgo } }),
      SecurityEvent.find({ workspaceId }).sort({ createdAt: -1 }).limit(12).lean().exec(),
      complianceService.summary(workspaceId),
    ]);
    const controlTotals = compliance.reduce((result, item) => ({
      controls: result.controls + item.controls,
      passing: result.passing + item.passing,
      attention: result.attention + item.attention,
      failing: result.failing + item.failing,
    }), { controls: 0, passing: 0, attention: 0, failing: 0 });
    const deductions = rotationDue * 4 + criticalThreats * 15 + threats * 3 + incidents * 5 + controlTotals.failing * 10;
    return {
      postureScore: Math.max(0, Math.min(100, 100 - deductions)),
      generatedAt: now.toISOString(),
      metrics: {
        policies, enforcedPolicies, secrets, rotationDue, assets, restrictedAssets,
        openThreats: threats, criticalThreats, activeIncidents: incidents, deniedDecisions24h: decisionsDenied,
      },
      compliance: { frameworks: compliance, totals: controlTotals },
      recentEvents: recentEvents.map((event) => ({
        id: event._id.toString(),
        type: event.type,
        outcome: event.outcome,
        actorType: event.actorType,
        createdAt: event.createdAt.toISOString(),
        metadata: event.metadata,
      })),
    };
  },
};
