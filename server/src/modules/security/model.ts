import mongoose, { type Document, Schema, type Types } from 'mongoose';

export const POLICY_TARGETS = [
  'access', 'resource', 'api', 'workspace', 'organization', 'automation', 'ai',
] as const;
export type PolicyTarget = (typeof POLICY_TARGETS)[number];

export interface PolicyConditions {
  roles?: string[];
  actorTypes?: ('user' | 'service_account')[];
  requireMfa?: boolean;
  maxRiskScore?: number;
  allowedCountries?: string[];
  ipAllowlist?: string[];
}

export interface ISecurityPolicy extends Document {
  workspaceId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  name: string;
  description?: string;
  target: PolicyTarget;
  actionPattern: string;
  resourcePattern: string;
  effect: 'allow' | 'deny' | 'step_up';
  conditions: PolicyConditions;
  priority: number;
  status: 'draft' | 'enforced' | 'disabled';
  version: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const policyConditionsSchema = new Schema<PolicyConditions>({
  roles: { type: [String], default: undefined },
  actorTypes: { type: [String], enum: ['user', 'service_account'], default: undefined },
  requireMfa: { type: Boolean },
  maxRiskScore: { type: Number, min: 0, max: 100 },
  allowedCountries: { type: [String], default: undefined },
  ipAllowlist: { type: [String], default: undefined },
}, { _id: false });

const securityPolicySchema = new Schema<ISecurityPolicy>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  target: { type: String, enum: POLICY_TARGETS, required: true, index: true },
  actionPattern: { type: String, required: true, trim: true, maxlength: 160 },
  resourcePattern: { type: String, required: true, trim: true, maxlength: 300, default: '*' },
  effect: { type: String, enum: ['allow', 'deny', 'step_up'], required: true },
  conditions: { type: policyConditionsSchema, default: {} },
  priority: { type: Number, min: 0, max: 10_000, default: 100 },
  status: { type: String, enum: ['draft', 'enforced', 'disabled'], default: 'draft', index: true },
  version: { type: Number, min: 1, default: 1 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, optimisticConcurrency: true });
securityPolicySchema.index({ workspaceId: 1, name: 1 }, { unique: true });
securityPolicySchema.index({ workspaceId: 1, status: 1, priority: -1 });

export interface IPolicyRevision extends Document {
  policyId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  version: number;
  snapshot: Record<string, unknown>;
  changedBy: Types.ObjectId;
  changeReason: string;
  createdAt: Date;
}
const policyRevisionSchema = new Schema<IPolicyRevision>({
  policyId: { type: Schema.Types.ObjectId, ref: 'SecurityPolicy', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  version: { type: Number, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changeReason: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, immutable: true, default: Date.now },
}, { timestamps: false });
policyRevisionSchema.index({ policyId: 1, version: 1 }, { unique: true });

export interface IPolicyDecision extends Document {
  workspaceId: Types.ObjectId;
  policyId?: Types.ObjectId;
  actorId: string;
  actorType: 'user' | 'service_account';
  action: string;
  resource: string;
  target: PolicyTarget;
  decision: 'allow' | 'deny' | 'step_up';
  reasons: string[];
  requestId?: string;
  contextFingerprint: string;
  createdAt: Date;
}
const policyDecisionSchema = new Schema<IPolicyDecision>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: 'SecurityPolicy', index: true },
  actorId: { type: String, required: true, index: true },
  actorType: { type: String, enum: ['user', 'service_account'], required: true },
  action: { type: String, required: true, maxlength: 160 },
  resource: { type: String, required: true, maxlength: 300 },
  target: { type: String, enum: POLICY_TARGETS, required: true },
  decision: { type: String, enum: ['allow', 'deny', 'step_up'], required: true, index: true },
  reasons: { type: [String], default: [] },
  requestId: { type: String },
  contextFingerprint: { type: String, required: true },
  createdAt: { type: Date, immutable: true, default: Date.now, index: true },
}, { timestamps: false });
policyDecisionSchema.index({ workspaceId: 1, createdAt: -1 });

export interface IManagedSecret extends Document {
  workspaceId: Types.ObjectId;
  name: string;
  purpose: string;
  scope: 'workspace' | 'integration' | 'automation' | 'ai_provider';
  status: 'active' | 'rotation_due' | 'expired' | 'revoked';
  currentVersion: number;
  rotateEveryDays: number;
  lastRotatedAt: Date;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const managedSecretSchema = new Schema<IManagedSecret>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  purpose: { type: String, required: true, trim: true, maxlength: 500 },
  scope: { type: String, enum: ['workspace', 'integration', 'automation', 'ai_provider'], required: true },
  status: { type: String, enum: ['active', 'rotation_due', 'expired', 'revoked'], default: 'active', index: true },
  currentVersion: { type: Number, min: 1, default: 1 },
  rotateEveryDays: { type: Number, min: 1, max: 365, default: 90 },
  lastRotatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
managedSecretSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export interface ISecretVersion extends Document {
  secretId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  version: number;
  encryptedValue: string;
  checksum: string;
  createdBy: Types.ObjectId;
  expiresAt?: Date;
  destroyedAt?: Date;
  createdAt: Date;
}
const secretVersionSchema = new Schema<ISecretVersion>({
  secretId: { type: Schema.Types.ObjectId, ref: 'ManagedSecret', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  version: { type: Number, min: 1, required: true },
  encryptedValue: { type: String, required: true, select: false },
  checksum: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date },
  destroyedAt: { type: Date },
  createdAt: { type: Date, immutable: true, default: Date.now },
}, { timestamps: false });
secretVersionSchema.index({ secretId: 1, version: 1 }, { unique: true });

export const DATA_CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted'] as const;
export interface IDataAsset extends Document {
  workspaceId: Types.ObjectId;
  name: string;
  system: string;
  description?: string;
  ownerId: Types.ObjectId;
  classification: (typeof DATA_CLASSIFICATIONS)[number];
  categories: string[];
  retentionDays: number;
  legalHold: boolean;
  residencyRegion?: string;
  upstreamAssets: Types.ObjectId[];
  lifecycleStatus: 'active' | 'archived' | 'deletion_queued' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}
const dataAssetSchema = new Schema<IDataAsset>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  system: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 500 },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  classification: { type: String, enum: DATA_CLASSIFICATIONS, required: true, index: true },
  categories: { type: [String], default: [] },
  retentionDays: { type: Number, min: 1, max: 3650, default: 365 },
  legalHold: { type: Boolean, default: false },
  residencyRegion: { type: String, maxlength: 80 },
  upstreamAssets: [{ type: Schema.Types.ObjectId, ref: 'DataAsset' }],
  lifecycleStatus: {
    type: String,
    enum: ['active', 'archived', 'deletion_queued', 'deleted'],
    default: 'active',
    index: true,
  },
}, { timestamps: true });
dataAssetSchema.index({ workspaceId: 1, name: 1, system: 1 }, { unique: true });

export const COMPLIANCE_FRAMEWORKS = ['SOC2', 'ISO27001', 'GDPR', 'CCPA', 'HIPAA'] as const;
export interface IComplianceEvidence extends Document {
  workspaceId: Types.ObjectId;
  framework: (typeof COMPLIANCE_FRAMEWORKS)[number];
  controlId: string;
  controlName: string;
  status: 'passing' | 'attention' | 'failing';
  evidence: Record<string, unknown>;
  evidenceHash: string;
  collectedAt: Date;
  expiresAt: Date;
}
const complianceEvidenceSchema = new Schema<IComplianceEvidence>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  framework: { type: String, enum: COMPLIANCE_FRAMEWORKS, required: true, index: true },
  controlId: { type: String, required: true, maxlength: 80 },
  controlName: { type: String, required: true, maxlength: 200 },
  status: { type: String, enum: ['passing', 'attention', 'failing'], required: true, index: true },
  evidence: { type: Schema.Types.Mixed, required: true },
  evidenceHash: { type: String, required: true },
  collectedAt: { type: Date, immutable: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: false });
complianceEvidenceSchema.index({ workspaceId: 1, framework: 1, controlId: 1, collectedAt: -1 });

export const THREAT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export interface IThreatSignal extends Document {
  workspaceId: Types.ObjectId;
  ruleId: string;
  category: string;
  severity: (typeof THREAT_SEVERITIES)[number];
  status: 'open' | 'investigating' | 'contained' | 'dismissed';
  title: string;
  summary: string;
  score: number;
  fingerprint: string;
  eventIds: Types.ObjectId[];
  indicators: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
const threatSignalSchema = new Schema<IThreatSignal>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  ruleId: { type: String, required: true, index: true },
  category: { type: String, required: true, maxlength: 100 },
  severity: { type: String, enum: THREAT_SEVERITIES, required: true, index: true },
  status: { type: String, enum: ['open', 'investigating', 'contained', 'dismissed'], default: 'open', index: true },
  title: { type: String, required: true, maxlength: 200 },
  summary: { type: String, required: true, maxlength: 1000 },
  score: { type: Number, min: 0, max: 100, required: true },
  fingerprint: { type: String, required: true },
  eventIds: [{ type: Schema.Types.ObjectId, ref: 'SecurityEvent' }],
  indicators: { type: Schema.Types.Mixed, default: {} },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
}, { timestamps: true });
threatSignalSchema.index({ workspaceId: 1, fingerprint: 1, status: 1 });
threatSignalSchema.index({ workspaceId: 1, createdAt: -1 });

export interface ISecurityIncident extends Document {
  workspaceId: Types.ObjectId;
  title: string;
  summary: string;
  severity: (typeof THREAT_SEVERITIES)[number];
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'postmortem';
  signalIds: Types.ObjectId[];
  assignedTo?: Types.ObjectId;
  timeline: { at: Date; actorId: string; action: string; note?: string }[];
  containmentActions: { action: string; status: 'pending' | 'completed' | 'failed'; executedAt?: Date }[];
  detectedAt: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const securityIncidentSchema = new Schema<ISecurityIncident>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  summary: { type: String, required: true, maxlength: 2000 },
  severity: { type: String, enum: THREAT_SEVERITIES, required: true, index: true },
  status: {
    type: String,
    enum: ['open', 'investigating', 'contained', 'resolved', 'postmortem'],
    default: 'open',
    index: true,
  },
  signalIds: [{ type: Schema.Types.ObjectId, ref: 'ThreatSignal' }],
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  timeline: {
    type: [{
      at: { type: Date, required: true },
      actorId: { type: String, required: true },
      action: { type: String, required: true },
      note: { type: String, maxlength: 1000 },
    }],
    default: [],
  },
  containmentActions: {
    type: [{
      action: { type: String, required: true },
      status: { type: String, enum: ['pending', 'completed', 'failed'], required: true },
      executedAt: Date,
    }],
    default: [],
  },
  detectedAt: { type: Date, default: Date.now },
  containedAt: Date,
  resolvedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
securityIncidentSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

function appendOnly(schema: Schema) {
  for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'] as const) {
    schema.pre(operation, function rejectMutation() {
      throw new Error('Append-only security record cannot be mutated');
    });
  }
}
appendOnly(policyRevisionSchema);
appendOnly(policyDecisionSchema);
appendOnly(complianceEvidenceSchema);

export const SecurityPolicy = mongoose.model<ISecurityPolicy>('SecurityPolicy', securityPolicySchema);
export const PolicyRevision = mongoose.model<IPolicyRevision>('PolicyRevision', policyRevisionSchema);
export const PolicyDecision = mongoose.model<IPolicyDecision>('PolicyDecision', policyDecisionSchema);
export const ManagedSecret = mongoose.model<IManagedSecret>('ManagedSecret', managedSecretSchema);
export const SecretVersion = mongoose.model<ISecretVersion>('SecretVersion', secretVersionSchema);
export const DataAsset = mongoose.model<IDataAsset>('DataAsset', dataAssetSchema);
export const ComplianceEvidence = mongoose.model<IComplianceEvidence>('ComplianceEvidence', complianceEvidenceSchema);
export const ThreatSignal = mongoose.model<IThreatSignal>('ThreatSignal', threatSignalSchema);
export const SecurityIncident = mongoose.model<ISecurityIncident>('SecurityIncident', securityIncidentSchema);
