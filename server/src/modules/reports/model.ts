import mongoose, { type Document, Schema, type Types } from 'mongoose';
import type { NormalizedAnalytics, PlatformType } from '../platforms/types.js';

export interface IReport extends Document {
  workspaceId: Types.ObjectId;
  connectionId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  provider: PlatformType;
  providerAccountId: string;
  rangeFrom: Date;
  rangeTo: Date;
  collectedAt: Date;
  metrics: NormalizedAnalytics['metrics'];
  unavailable: string[];
  status: 'ready';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformConnection',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    rangeFrom: { type: Date, required: true },
    rangeTo: { type: Date, required: true },
    collectedAt: { type: Date, required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    unavailable: { type: [String], default: [] },
    status: { type: String, enum: ['ready'], default: 'ready' },
  },
  { timestamps: true },
);

reportSchema.index({ workspaceId: 1, connectionId: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
