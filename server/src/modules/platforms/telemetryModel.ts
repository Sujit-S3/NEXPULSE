import mongoose, { type Document, Schema, type Types } from 'mongoose';
import { PLATFORMS } from './types.js';
import type { PlatformType } from './types.js';

export interface IProviderTelemetry extends Document {
  workspaceId: Types.ObjectId;
  connectionId: Types.ObjectId;
  provider: PlatformType;
  operation: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  tokenRefreshed: boolean;
  createdAt: Date;
}

const providerTelemetrySchema = new Schema<IProviderTelemetry>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    connectionId: { type: Schema.Types.ObjectId, ref: 'PlatformConnection', required: true, index: true },
    provider: { type: String, enum: PLATFORMS, required: true, index: true },
    operation: { type: String, required: true, trim: true, maxlength: 120 },
    latencyMs: { type: Number, required: true, min: 0 },
    success: { type: Boolean, required: true },
    errorCode: { type: String, maxlength: 120 },
    tokenRefreshed: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);

providerTelemetrySchema.index({ workspaceId: 1, connectionId: 1, createdAt: -1 });
providerTelemetrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const ProviderTelemetry = mongoose.model<IProviderTelemetry>(
  'ProviderTelemetry',
  providerTelemetrySchema,
);
