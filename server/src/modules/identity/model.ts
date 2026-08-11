import mongoose, { type Document, Schema, type Types } from 'mongoose';
import { PERMISSIONS, ROLES, type IdentityRole, type Permission } from './permissions.js';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  status: 'active' | 'suspended';
  members: { userId: Types.ObjectId; role: IdentityRole; status: 'active' | 'suspended'; joinedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  members: {
    type: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ROLES, required: true },
      status: { type: String, enum: ['active', 'suspended'], default: 'active' },
      joinedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
}, { timestamps: true });
organizationSchema.index({ 'members.userId': 1, status: 1 });

export interface IIdentitySession extends Document {
  userId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  usedTokenHashes: string[];
  rotationCounter: number;
  authMethods: string[];
  mfaVerifiedAt?: Date;
  deviceIdHash: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  userAgent: string;
  ipAddress: string;
  location?: { country?: string; region?: string; city?: string };
  riskScore: number;
  lastActiveAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const identitySessionSchema = new Schema<IIdentitySession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  familyId: { type: String, required: true, unique: true, index: true },
  tokenHash: { type: String, required: true, select: false },
  usedTokenHashes: { type: [String], default: [], select: false },
  rotationCounter: { type: Number, default: 0 },
  authMethods: { type: [String], default: ['password'] },
  mfaVerifiedAt: { type: Date },
  deviceIdHash: { type: String, required: true, index: true },
  deviceName: { type: String, required: true },
  browser: { type: String, required: true },
  os: { type: String, required: true },
  deviceType: { type: String, required: true },
  userAgent: { type: String, required: true, maxlength: 1000 },
  ipAddress: { type: String, required: true, maxlength: 100 },
  location: { country: String, region: String, city: String },
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  lastActiveAt: { type: Date, required: true, default: Date.now },
  idleExpiresAt: { type: Date, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, index: true },
  revokeReason: { type: String, maxlength: 200 },
}, { timestamps: true });
identitySessionSchema.index({ userId: 1, revokedAt: 1, lastActiveAt: -1 });

export type CredentialType = 'api_key' | 'personal_access_token' | 'service_token';
export interface IApiCredential extends Document {
  workspaceId: Types.ObjectId;
  userId?: Types.ObjectId;
  serviceAccountId?: Types.ObjectId;
  type: CredentialType;
  name: string;
  prefix: string;
  secretHash: string;
  permissions: Permission[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiCredentialSchema = new Schema<IApiCredential>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  serviceAccountId: { type: Schema.Types.ObjectId, ref: 'ServiceAccount', index: true },
  type: { type: String, enum: ['api_key', 'personal_access_token', 'service_token'], required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  prefix: { type: String, required: true, unique: true, index: true },
  secretHash: { type: String, required: true, select: false },
  permissions: [{ type: String, enum: PERMISSIONS }],
  expiresAt: { type: Date },
  lastUsedAt: { type: Date },
  lastUsedIp: { type: String },
  revokedAt: { type: Date, index: true },
}, { timestamps: true });
apiCredentialSchema.index({ workspaceId: 1, type: 1, revokedAt: 1 });

export interface IServiceAccount extends Document {
  workspaceId: Types.ObjectId;
  name: string;
  description?: string;
  purpose: 'automation' | 'integration' | 'bot' | 'ci_cd';
  permissions: Permission[];
  status: 'active' | 'disabled';
  createdBy: Types.ObjectId;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const serviceAccountSchema = new Schema<IServiceAccount>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  purpose: { type: String, enum: ['automation', 'integration', 'bot', 'ci_cd'], default: 'integration' },
  permissions: [{ type: String, enum: PERMISSIONS }],
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastUsedAt: { type: Date },
}, { timestamps: true });
serviceAccountSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export interface ISecurityEvent extends Document {
  workspaceId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  userId?: Types.ObjectId;
  actorType: 'user' | 'service_account' | 'system' | 'anonymous';
  actorId?: string;
  sessionId?: Types.ObjectId;
  type: string;
  outcome: 'success' | 'failure' | 'denied';
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
const securityEventSchema = new Schema<ISecurityEvent>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  actorType: { type: String, enum: ['user', 'service_account', 'system', 'anonymous'], required: true },
  actorId: { type: String },
  sessionId: { type: Schema.Types.ObjectId, ref: 'IdentitySession' },
  type: { type: String, required: true, index: true },
  outcome: { type: String, enum: ['success', 'failure', 'denied'], required: true },
  ipAddress: { type: String },
  userAgent: { type: String, maxlength: 1000 },
  requestId: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { timestamps: false });
securityEventSchema.index({ workspaceId: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, createdAt: -1 });
for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'] as const) {
  securityEventSchema.pre(operation, function rejectSecurityEventMutation() {
    throw new Error('Security events are append-only');
  });
}

export interface IIdentityChallenge extends Document {
  userId: Types.ObjectId;
  type: 'mfa_login' | 'email_otp' | 'mfa_email_setup';
  tokenHash: string;
  codeHash?: string;
  attempts: number;
  maxAttempts: number;
  metadata: Record<string, unknown>;
  usedAt?: Date;
  expiresAt: Date;
}
const identityChallengeSchema = new Schema<IIdentityChallenge>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['mfa_login', 'email_otp', 'mfa_email_setup'], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  codeHash: { type: String, select: false },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  usedAt: { type: Date },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export interface IWorkspaceInvitation extends Document {
  workspaceId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  email: string;
  role: IdentityRole;
  tokenHash: string;
  invitedBy: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: Date;
  acceptedBy?: Types.ObjectId;
  acceptedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const invitationSchema = new Schema<IWorkspaceInvitation>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  role: { type: String, enum: ROLES, required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'revoked', 'expired'], default: 'pending', index: true },
  expiresAt: { type: Date, required: true, index: true },
  acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: { type: Date },
  revokedAt: { type: Date },
}, { timestamps: true });
invitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

export interface ISsoConfiguration extends Document {
  organizationId: Types.ObjectId;
  provider: 'saml' | 'oidc' | 'azure_ad' | 'google_workspace' | 'okta' | 'auth0';
  enabled: boolean;
  domains: string[];
  configurationEncrypted?: string;
}
const ssoConfigurationSchema = new Schema<ISsoConfiguration>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  provider: { type: String, enum: ['saml', 'oidc', 'azure_ad', 'google_workspace', 'okta', 'auth0'], required: true },
  enabled: { type: Boolean, default: false },
  domains: { type: [String], default: [] },
  configurationEncrypted: { type: String, select: false },
}, { timestamps: true });
ssoConfigurationSchema.index({ organizationId: 1, provider: 1 }, { unique: true });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
export const IdentitySession = mongoose.model<IIdentitySession>('IdentitySession', identitySessionSchema);
export const ApiCredential = mongoose.model<IApiCredential>('ApiCredential', apiCredentialSchema);
export const ServiceAccount = mongoose.model<IServiceAccount>('ServiceAccount', serviceAccountSchema);
export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);
export const IdentityChallenge = mongoose.model<IIdentityChallenge>('IdentityChallenge', identityChallengeSchema);
export const WorkspaceInvitation = mongoose.model<IWorkspaceInvitation>('WorkspaceInvitation', invitationSchema);
export const SsoConfiguration = mongoose.model<ISsoConfiguration>('SsoConfiguration', ssoConfigurationSchema);
