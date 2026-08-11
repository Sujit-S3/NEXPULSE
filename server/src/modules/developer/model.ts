import mongoose, { type Document, Schema, type Types } from 'mongoose';
import { PERMISSIONS, type Permission } from '../identity/permissions.js';

export type DeveloperGrantType = 'authorization_code' | 'refresh_token' | 'client_credentials';

export interface IDeveloperApplication extends Document {
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  scopes: Permission[];
  grantTypes: DeveloperGrantType[];
  status: 'active' | 'suspended' | 'revoked';
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const developerApplicationSchema = new Schema<IDeveloperApplication>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  clientId: { type: String, required: true, unique: true, index: true },
  clientSecretHash: { type: String, required: true, select: false },
  redirectUris: { type: [String], required: true, default: [] },
  scopes: [{ type: String, enum: PERMISSIONS, required: true }],
  grantTypes: [{
    type: String,
    enum: ['authorization_code', 'refresh_token', 'client_credentials'],
    required: true,
  }],
  status: { type: String, enum: ['active', 'suspended', 'revoked'], default: 'active', index: true },
  lastUsedAt: { type: Date },
}, { timestamps: true });
developerApplicationSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export interface IOAuthAuthorizationCode extends Document {
  applicationId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  prefix: string;
  secretHash: string;
  redirectUri: string;
  scopes: Permission[];
  codeChallenge: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const authorizationCodeSchema = new Schema<IOAuthAuthorizationCode>({
  applicationId: { type: Schema.Types.ObjectId, ref: 'DeveloperApplication', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prefix: { type: String, required: true, unique: true, index: true },
  secretHash: { type: String, required: true, select: false },
  redirectUri: { type: String, required: true },
  scopes: [{ type: String, enum: PERMISSIONS, required: true }],
  codeChallenge: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

export interface IOAuthToken extends Document {
  applicationId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId?: Types.ObjectId;
  accessPrefix: string;
  accessSecretHash: string;
  refreshPrefix?: string;
  refreshSecretHash?: string;
  scopes: Permission[];
  grantType: Exclude<DeveloperGrantType, 'refresh_token'>;
  expiresAt: Date;
  refreshExpiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  revokedAt?: Date;
  revokeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const oauthTokenSchema = new Schema<IOAuthToken>({
  applicationId: { type: Schema.Types.ObjectId, ref: 'DeveloperApplication', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  accessPrefix: { type: String, required: true, unique: true, index: true },
  accessSecretHash: { type: String, required: true, select: false },
  refreshPrefix: { type: String, unique: true, sparse: true, index: true },
  refreshSecretHash: { type: String, select: false },
  scopes: [{ type: String, enum: PERMISSIONS, required: true }],
  grantType: { type: String, enum: ['authorization_code', 'client_credentials'], required: true },
  expiresAt: { type: Date, required: true, index: true },
  refreshExpiresAt: { type: Date },
  lastUsedAt: { type: Date },
  lastUsedIp: { type: String },
  revokedAt: { type: Date, index: true },
  revokeReason: { type: String, maxlength: 200 },
}, { timestamps: true });
oauthTokenSchema.index({ applicationId: 1, revokedAt: 1, createdAt: -1 });

export interface IWebhookEndpoint extends Document {
  workspaceId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name: string;
  url: string;
  description?: string;
  events: string[];
  secretEncrypted: string;
  status: 'active' | 'paused' | 'disabled';
  apiVersion: string;
  consecutiveFailures: number;
  lastDeliveredAt?: Date;
  lastFailedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEndpointSchema = new Schema<IWebhookEndpoint>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  url: { type: String, required: true, maxlength: 2048 },
  description: { type: String, trim: true, maxlength: 500 },
  events: { type: [String], required: true, default: [] },
  secretEncrypted: { type: String, required: true, select: false },
  status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active', index: true },
  apiVersion: { type: String, default: 'v1' },
  consecutiveFailures: { type: Number, default: 0, min: 0 },
  lastDeliveredAt: { type: Date },
  lastFailedAt: { type: Date },
}, { timestamps: true });
webhookEndpointSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export interface IWebhookDelivery extends Document {
  workspaceId: Types.ObjectId;
  endpointId: Types.ObjectId;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivering' | 'retrying' | 'succeeded' | 'dead_letter';
  attemptCount: number;
  nextAttemptAt: Date;
  deliveredAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  lastError?: string;
  attempts: {
    attemptedAt: Date;
    durationMs: number;
    statusCode?: number;
    outcome: 'succeeded' | 'failed';
    error?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  endpointId: { type: Schema.Types.ObjectId, ref: 'WebhookEndpoint', required: true, index: true },
  eventId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['pending', 'delivering', 'retrying', 'succeeded', 'dead_letter'],
    default: 'pending',
    index: true,
  },
  attemptCount: { type: Number, default: 0, min: 0 },
  nextAttemptAt: { type: Date, required: true, default: Date.now, index: true },
  deliveredAt: { type: Date },
  responseStatus: { type: Number },
  responseBody: { type: String, maxlength: 2000 },
  lastError: { type: String, maxlength: 1000 },
  attempts: {
    type: [{
      attemptedAt: { type: Date, required: true },
      durationMs: { type: Number, required: true },
      statusCode: { type: Number },
      outcome: { type: String, enum: ['succeeded', 'failed'], required: true },
      error: { type: String, maxlength: 1000 },
    }],
    default: [],
  },
}, { timestamps: true });
webhookDeliverySchema.index({ status: 1, nextAttemptAt: 1 });
webhookDeliverySchema.index({ workspaceId: 1, createdAt: -1 });

export interface IApiRateLimitBucket extends Document {
  key: string;
  bucketStart: Date;
  count: number;
  expiresAt: Date;
}

const apiRateLimitBucketSchema = new Schema<IApiRateLimitBucket>({
  key: { type: String, required: true },
  bucketStart: { type: Date, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: false });
apiRateLimitBucketSchema.index({ key: 1, bucketStart: 1 }, { unique: true });

export interface IApiUsageMetric extends Document {
  workspaceId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  credentialId?: Types.ObjectId;
  applicationId?: Types.ObjectId;
  bucketStart: Date;
  endpoint: string;
  method: string;
  sdk?: string;
  requestCount: number;
  errorCount: number;
  rateLimitedCount: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const apiUsageMetricSchema = new Schema<IApiUsageMetric>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  credentialId: { type: Schema.Types.ObjectId, ref: 'ApiCredential', index: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'DeveloperApplication', index: true },
  bucketStart: { type: Date, required: true, index: true },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  sdk: { type: String },
  requestCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  rateLimitedCount: { type: Number, default: 0 },
  totalLatencyMs: { type: Number, default: 0 },
  maxLatencyMs: { type: Number, default: 0 },
}, { timestamps: true });
apiUsageMetricSchema.index(
  { workspaceId: 1, applicationId: 1, bucketStart: 1, endpoint: 1, method: 1, sdk: 1 },
  { unique: true },
);
apiUsageMetricSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export interface IApiQuotaPolicy extends Document {
  workspaceId: Types.ObjectId;
  requestsPerMinute: number;
  burstPerTenSeconds: number;
  requestsPerMonth: number;
  endpointOverrides: Record<string, number>;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const apiQuotaPolicySchema = new Schema<IApiQuotaPolicy>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true, index: true },
  requestsPerMinute: { type: Number, required: true, default: 10_000, min: 60, max: 10_000_000 },
  burstPerTenSeconds: { type: Number, required: true, default: 2_000, min: 10, max: 1_000_000 },
  requestsPerMonth: { type: Number, required: true, default: 10_000_000, min: 1000, max: 1_000_000_000 },
  endpointOverrides: { type: Schema.Types.Mixed, default: {} },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export type PluginCapability =
  | 'dashboard'
  | 'reports'
  | 'automation'
  | 'ai'
  | 'notifications'
  | 'analytics'
  | 'storage';

export interface IPluginPackage extends Document {
  slug: string;
  name: string;
  description: string;
  publisher: string;
  homepage?: string;
  capabilities: PluginCapability[];
  requiredPermissions: Permission[];
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  versions: {
    version: string;
    runtimeApiVersion: string;
    entrypoint: string;
    checksum: string;
    dependencies: Record<string, string>;
    releasedAt?: Date;
  }[];
  reviews: {
    userId: Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pluginPackageSchema = new Schema<IPluginPackage>({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  publisher: { type: String, required: true, trim: true, maxlength: 120 },
  homepage: { type: String, maxlength: 2048 },
  capabilities: [{
    type: String,
    enum: ['dashboard', 'reports', 'automation', 'ai', 'notifications', 'analytics', 'storage'],
    required: true,
  }],
  requiredPermissions: [{ type: String, enum: PERMISSIONS, required: true }],
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'suspended'],
    default: 'draft',
    index: true,
  },
  versions: {
    type: [{
      version: { type: String, required: true },
      runtimeApiVersion: { type: String, required: true, default: 'v1' },
      entrypoint: { type: String, required: true },
      checksum: { type: String, required: true },
      dependencies: { type: Schema.Types.Mixed, default: {} },
      releasedAt: { type: Date },
    }],
    default: [],
  },
  reviews: {
    type: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, maxlength: 1000 },
      createdAt: { type: Date, required: true, default: Date.now },
    }],
    default: [],
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export interface IPluginInstallation extends Document {
  workspaceId: Types.ObjectId;
  pluginId: Types.ObjectId;
  version: string;
  grantedPermissions: Permission[];
  status: 'active' | 'disabled' | 'uninstalled';
  configuration: Record<string, unknown>;
  installedBy: Types.ObjectId;
  installedAt: Date;
  updatedAt: Date;
}

const pluginInstallationSchema = new Schema<IPluginInstallation>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  pluginId: { type: Schema.Types.ObjectId, ref: 'PluginPackage', required: true, index: true },
  version: { type: String, required: true },
  grantedPermissions: [{ type: String, enum: PERMISSIONS, required: true }],
  status: { type: String, enum: ['active', 'disabled', 'uninstalled'], default: 'active', index: true },
  configuration: { type: Schema.Types.Mixed, default: {} },
  installedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  installedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: { createdAt: false, updatedAt: true } });
pluginInstallationSchema.index({ workspaceId: 1, pluginId: 1 }, { unique: true });

export const DeveloperApplication = mongoose.model<IDeveloperApplication>('DeveloperApplication', developerApplicationSchema);
export const OAuthAuthorizationCode = mongoose.model<IOAuthAuthorizationCode>('OAuthAuthorizationCode', authorizationCodeSchema);
export const OAuthToken = mongoose.model<IOAuthToken>('OAuthToken', oauthTokenSchema);
export const WebhookEndpoint = mongoose.model<IWebhookEndpoint>('WebhookEndpoint', webhookEndpointSchema);
export const WebhookDelivery = mongoose.model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema);
export const ApiRateLimitBucket = mongoose.model<IApiRateLimitBucket>('ApiRateLimitBucket', apiRateLimitBucketSchema);
export const ApiUsageMetric = mongoose.model<IApiUsageMetric>('ApiUsageMetric', apiUsageMetricSchema);
export const ApiQuotaPolicy = mongoose.model<IApiQuotaPolicy>('ApiQuotaPolicy', apiQuotaPolicySchema);
export const PluginPackage = mongoose.model<IPluginPackage>('PluginPackage', pluginPackageSchema);
export const PluginInstallation = mongoose.model<IPluginInstallation>('PluginInstallation', pluginInstallationSchema);
