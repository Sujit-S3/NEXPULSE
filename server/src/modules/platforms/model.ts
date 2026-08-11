import mongoose, { type Document, Schema, type Types } from 'mongoose';
import { PLATFORMS } from './types.js';
import type { ConnectionStatus, PlatformType } from './types.js';

export interface IPlatformConnection extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  provider: PlatformType;
  providerAccountId: string;
  providerUserId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  selectedAccount: true;
  displayName: string;
  avatar?: string;
  username?: string;
  followers?: number;
  accountType: string;
  isPrimary: boolean;
  status: ConnectionStatus;
  scopes: string[];
  oauthVersion: 1;
  tokenVersion: number;
  refreshLockUntil?: Date;
  lastHealthCheckAt?: Date;
  lastSyncAt?: Date;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  connectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const platformConnectionSchema = new Schema<IPlatformConnection>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true, enum: PLATFORMS, index: true },
    providerAccountId: { type: String, required: true },
    providerUserId: { type: String, required: true },
    accessTokenEncrypted: { type: String, required: true, select: false },
    refreshTokenEncrypted: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    selectedAccount: { type: Boolean, required: true, default: true, immutable: true },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String },
    username: { type: String, trim: true },
    followers: { type: Number, min: 0 },
    accountType: { type: String, required: true },
    isPrimary: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: ['connected', 'expired', 'revoked', 'permissions_required', 'error'],
      default: 'connected',
    },
    scopes: [{ type: String }],
    oauthVersion: { type: Number, required: true, default: 1, immutable: true },
    tokenVersion: { type: Number, required: true, default: 1 },
    refreshLockUntil: { type: Date, select: false },
    lastHealthCheckAt: { type: Date },
    lastSyncAt: { type: Date },
    lastErrorCode: { type: String },
    lastErrorMessage: { type: String, maxlength: 500 },
    connectedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

platformConnectionSchema.index(
  { workspaceId: 1, provider: 1, providerAccountId: 1 },
  { unique: true },
);
platformConnectionSchema.index(
  { workspaceId: 1, provider: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true, oauthVersion: 1 } },
);
platformConnectionSchema.index({ workspaceId: 1, selectedAccount: 1, updatedAt: -1 });

export const PlatformConnection = mongoose.model<IPlatformConnection>(
  'PlatformConnection',
  platformConnectionSchema,
);

export type OAuthSessionStatus =
  | 'pending_authorization'
  | 'exchanging'
  | 'awaiting_selection'
  | 'completed'
  | 'failed';

export interface IOAuthSessionAccount {
  providerAccountId: string;
  providerUserId: string;
  displayName: string;
  username?: string;
  avatar?: string;
  followers?: number;
  accountType: string;
  accessTokenEncrypted?: string;
}

export interface IOAuthSession extends Document {
  publicIdHash: string;
  publicIdEncrypted: string;
  stateHash: string;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  provider: PlatformType;
  status: OAuthSessionStatus;
  returnTo: string;
  codeVerifierEncrypted?: string;
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  providerUserId?: string;
  grantedScopes: string[];
  accounts: IOAuthSessionAccount[];
  errorCode?: string;
  errorMessage?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const oauthSessionAccountSchema = new Schema<IOAuthSessionAccount>(
  {
    providerAccountId: { type: String, required: true },
    providerUserId: { type: String, required: true },
    displayName: { type: String, required: true },
    username: { type: String },
    avatar: { type: String },
    followers: { type: Number, min: 0 },
    accountType: { type: String, required: true },
    accessTokenEncrypted: { type: String, select: false },
  },
  { _id: false },
);

const oauthSessionSchema = new Schema<IOAuthSession>(
  {
    publicIdHash: { type: String, required: true, unique: true, index: true },
    publicIdEncrypted: { type: String, required: true, select: false },
    stateHash: { type: String, required: true, unique: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true, enum: PLATFORMS },
    status: {
      type: String,
      required: true,
      enum: ['pending_authorization', 'exchanging', 'awaiting_selection', 'completed', 'failed'],
      default: 'pending_authorization',
    },
    returnTo: { type: String, required: true, default: '/platforms' },
    codeVerifierEncrypted: { type: String, select: false },
    accessTokenEncrypted: { type: String, select: false },
    refreshTokenEncrypted: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    providerUserId: { type: String },
    grantedScopes: [{ type: String }],
    accounts: { type: [oauthSessionAccountSchema], default: [] },
    errorCode: { type: String },
    errorMessage: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const OAuthSession = mongoose.model<IOAuthSession>('OAuthSession', oauthSessionSchema);
