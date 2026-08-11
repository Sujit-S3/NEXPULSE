import mongoose, { type Document, Schema, type Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../../config/env.js';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatar?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  organizationId?: Types.ObjectId;
  workspaceId: Types.ObjectId;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  securityStamp: number;
  mfa: {
    enabled: boolean;
    totpSecretEncrypted?: string;
    pendingTotpSecretEncrypted?: string;
    emailOtpEnabled: boolean;
    recoveryCodeHashes: string[];
    trustedDevices: {
      deviceIdHash: string;
      name: string;
      trustedAt: Date;
      expiresAt: Date;
    }[];
  };
  preferences: {
    theme?: string;
    notifications?: boolean;
    timezone?: string;
    language?: string;
    emailReports?: boolean;
    digestFrequency?: 'daily' | 'weekly' | 'monthly';
    autoSync?: boolean;
    syncInterval?: number;
    workspace?: {
      density?: 'compact' | 'comfortable' | 'spacious';
      accentColor?: 'blue' | 'cyan' | 'green' | 'orange';
      motionIntensity?: 'reduced' | 'balanced' | 'full';
      glassTransparency?: number;
      sidebarWidth?: number;
      dashboardWidgetOrder?: string[];
      presets?: {
        id: string;
        name: string;
        density: 'compact' | 'comfortable' | 'spacious';
        accentColor: 'blue' | 'cyan' | 'green' | 'orange';
        motionIntensity: 'reduced' | 'balanced' | 'full';
        glassTransparency: number;
        sidebarWidth: number;
        dashboardWidgetOrder: string[];
        createdAt: Date;
      }[];
    };
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    avatar: { type: String },
    role: {
      type: String,
      enum: [
        'super_admin', 'organization_owner', 'workspace_owner', 'workspace_admin',
        'manager', 'editor', 'analyst', 'viewer', 'guest', 'service_account',
        'owner', 'admin',
      ],
      default: 'workspace_owner',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    lastLogin: { type: Date },
    failedLoginAttempts: { type: Number, min: 0, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
    securityStamp: { type: Number, min: 1, default: 1 },
    mfa: {
      enabled: { type: Boolean, default: false },
      totpSecretEncrypted: { type: String, select: false },
      pendingTotpSecretEncrypted: { type: String, select: false },
      emailOtpEnabled: { type: Boolean, default: false },
      recoveryCodeHashes: { type: [String], default: [], select: false },
      trustedDevices: {
        type: [{
          deviceIdHash: { type: String, required: true },
          name: { type: String, required: true },
          trustedAt: { type: Date, required: true },
          expiresAt: { type: Date, required: true },
        }],
        default: [],
        select: false,
      },
    },
    preferences: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'system' },
      notifications: { type: Boolean, default: true },
      timezone: { type: String, default: 'UTC' },
      language: { type: String, default: 'en' },
      emailReports: { type: Boolean, default: false },
      digestFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
      autoSync: { type: Boolean, default: true },
      syncInterval: { type: Number, min: 15, max: 1440, default: 60 },
      workspace: {
        density: {
          type: String,
          enum: ['compact', 'comfortable', 'spacious'],
          default: 'comfortable',
        },
        accentColor: {
          type: String,
          enum: ['blue', 'cyan', 'green', 'orange'],
          default: 'blue',
        },
        motionIntensity: {
          type: String,
          enum: ['reduced', 'balanced', 'full'],
          default: 'balanced',
        },
        glassTransparency: { type: Number, min: 0.45, max: 0.88, default: 0.72 },
        sidebarWidth: { type: Number, min: 220, max: 340, default: 260 },
        dashboardWidgetOrder: { type: [String], default: [] },
        presets: {
          type: [{
            _id: false,
            id: { type: String, required: true },
            name: { type: String, required: true, maxlength: 80 },
            density: {
              type: String,
              enum: ['compact', 'comfortable', 'spacious'],
              required: true,
            },
            accentColor: {
              type: String,
              enum: ['blue', 'cyan', 'green', 'orange'],
              required: true,
            },
            motionIntensity: {
              type: String,
              enum: ['reduced', 'balanced', 'full'],
              required: true,
            },
            glassTransparency: { type: Number, min: 0.45, max: 0.88, required: true },
            sidebarWidth: { type: Number, min: 220, max: 340, required: true },
            dashboardWidgetOrder: { type: [String], default: [] },
            createdAt: { type: Date, required: true },
          }],
          default: [],
        },
      },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1, deletedAt: 1 });

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this['password'] = await bcrypt.hash(this['password'], config.security.bcryptRounds);
  next();
});

userSchema.methods['comparePassword'] = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this['password']);
};

userSchema.methods['toJSON'] = function () {
  const obj = this['toObject']();
  delete obj.password;
  delete obj.emailVerificationTokenHash;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetTokenHash;
  if (obj.mfa) {
    obj.mfa = { enabled: obj.mfa.enabled, emailOtpEnabled: obj.mfa.emailOtpEnabled };
  }
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  owner: Types.ObjectId;
  organizationId?: Types.ObjectId;
  logo?: string;
  plan: string;
  settings: {
    allowInvitations?: boolean;
    defaultRole?: string;
    passwordMinLength?: number;
    sessionIdleMinutes?: number;
    sessionMaxDays?: number;
    maxActiveSessions?: number;
    requireMfaForRoles?: string[];
    allowedEmailDomains?: string[];
    loginIpAllowlist?: string[];
    allowApiKeys?: boolean;
    allowServiceAccounts?: boolean;
  };
  members: [{
    user: Types.ObjectId;
    role: string;
    joinedAt: Date;
    status?: 'active' | 'inactive' | 'suspended';
  }];
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    logo: { type: String },
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    settings: {
      allowInvitations: { type: Boolean, default: true },
      defaultRole: { type: String, default: 'viewer' },
      passwordMinLength: { type: Number, min: 12, max: 128, default: 15 },
      sessionIdleMinutes: { type: Number, min: 5, max: 1440, default: 60 },
      sessionMaxDays: { type: Number, min: 1, max: 90, default: 30 },
      maxActiveSessions: { type: Number, min: 1, max: 100, default: 10 },
      requireMfaForRoles: { type: [String], default: [] },
      allowedEmailDomains: { type: [String], default: [] },
      loginIpAllowlist: { type: [String], default: [] },
      allowApiKeys: { type: Boolean, default: true },
      allowServiceAccounts: { type: Boolean, default: true },
    },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['active', 'inactive', 'suspended'],
          default: 'active',
        },
      },
    ],
  },
  { timestamps: true },
);



export const User = mongoose.model<IUser>('User', userSchema);
export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
