import mongoose, { type Document, Schema, type Types } from 'mongoose';
import type { NormalizedAnalytics, PlatformType } from '../platforms/types.js';

const metricPointSchema = new Schema(
  {
    date: { type: String, required: true },
    followers: Number,
    following: Number,
    reach: Number,
    impressions: Number,
    engagement: Number,
    views: Number,
    posts: Number,
  },
  { _id: false },
);

const postSchema = new Schema(
  {
    id: { type: String, required: true },
    content: String,
    publishedAt: String,
    url: String,
    thumbnail: String,
    metrics: {
      reach: Number,
      impressions: Number,
      views: Number,
      likes: Number,
      comments: Number,
      shares: Number,
      saves: Number,
      engagement: Number,
    },
  },
  { _id: false },
);

export interface IAnalyticsSnapshot extends Document {
  workspaceId: Types.ObjectId;
  connectionId: Types.ObjectId;
  provider: PlatformType;
  providerAccountId: string;
  displayName: string;
  rangeFrom: Date;
  rangeTo: Date;
  collectedAt: Date;
  metrics: NormalizedAnalytics['metrics'];
  history: NormalizedAnalytics['history'];
  posts: NormalizedAnalytics['posts'];
  audience: NormalizedAnalytics['audience'];
  unavailable: string[];
  nextCursor?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AnalyticsSnapshotCreate = Pick<
  IAnalyticsSnapshot,
  | 'workspaceId'
  | 'connectionId'
  | 'provider'
  | 'providerAccountId'
  | 'displayName'
  | 'rangeFrom'
  | 'rangeTo'
  | 'collectedAt'
  | 'metrics'
  | 'history'
  | 'posts'
  | 'audience'
  | 'unavailable'
  | 'nextCursor'
>;

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformConnection',
      required: true,
      index: true,
    },
    provider: { type: String, required: true, index: true },
    providerAccountId: { type: String, required: true },
    displayName: { type: String, required: true },
    rangeFrom: { type: Date, required: true },
    rangeTo: { type: Date, required: true },
    collectedAt: { type: Date, required: true, default: Date.now },
    metrics: { type: Schema.Types.Mixed, required: true },
    history: { type: [metricPointSchema], default: [] },
    posts: { type: [postSchema], default: [] },
    audience: { type: Schema.Types.Mixed, default: null },
    unavailable: { type: [String], default: [] },
    nextCursor: { type: String },
  },
  { timestamps: true },
);

analyticsSnapshotSchema.index({ workspaceId: 1, connectionId: 1, collectedAt: -1 });
analyticsSnapshotSchema.index({ workspaceId: 1, providerAccountId: 1, collectedAt: -1 });

export const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>(
  'AnalyticsSnapshot',
  analyticsSnapshotSchema,
);
