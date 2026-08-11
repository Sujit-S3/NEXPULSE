import mongoose, { type Document, Schema, type Types } from 'mongoose';
import type { BillingCycle, BillingPlan, BillingSubscriptionStatus } from './types.js';

export interface IBillingSubscription extends Document {
  workspaceId: Types.ObjectId;
  createdBy: Types.ObjectId;
  provider: 'razorpay';
  providerSubscriptionId?: string;
  providerPlanId: string;
  providerCustomerId?: string;
  latestPaymentId?: string;
  plan: BillingPlan;
  billingCycle: BillingCycle;
  status: BillingSubscriptionStatus;
  currentKey?: string;
  currency: string;
  amountMinor: number;
  quantity: number;
  totalCount: number;
  paidCount: number;
  remainingCount: number;
  checkoutUrl?: string;
  cancelAtCycleEnd: boolean;
  currentStart?: Date;
  currentEnd?: Date;
  endedAt?: Date;
  providerCreatedAt?: Date;
  lastEventAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingSubscriptionSchema = new Schema<IBillingSubscription>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['razorpay'], default: 'razorpay', required: true },
    providerSubscriptionId: { type: String, unique: true, sparse: true, index: true },
    providerPlanId: { type: String, required: true },
    providerCustomerId: { type: String },
    latestPaymentId: { type: String },
    plan: {
      type: String,
      enum: ['free', 'professional', 'enterprise'],
      required: true,
    },
    billingCycle: { type: String, enum: ['monthly', 'annual'], required: true },
    status: {
      type: String,
      enum: [
        'provisioning', 'created', 'authenticated', 'active', 'pending', 'halted',
        'paused', 'cancelled', 'completed', 'expired', 'reconciliation_required', 'failed',
      ],
      required: true,
      index: true,
    },
    currentKey: { type: String, unique: true, sparse: true, index: true },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    amountMinor: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    totalCount: { type: Number, required: true, min: 1 },
    paidCount: { type: Number, required: true, min: 0, default: 0 },
    remainingCount: { type: Number, required: true, min: 0 },
    checkoutUrl: { type: String },
    cancelAtCycleEnd: { type: Boolean, default: false },
    currentStart: { type: Date },
    currentEnd: { type: Date },
    endedAt: { type: Date },
    providerCreatedAt: { type: Date },
    lastEventAt: { type: Date },
    failureReason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

billingSubscriptionSchema.index({ workspaceId: 1, createdAt: -1 });

export interface IBillingWebhookEvent extends Document {
  provider: 'razorpay';
  providerEventId: string;
  eventName: string;
  payloadHash: string;
  status: 'processing' | 'processed' | 'failed';
  attempts: number;
  processedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingWebhookEventSchema = new Schema<IBillingWebhookEvent>(
  {
    provider: { type: String, enum: ['razorpay'], default: 'razorpay', required: true },
    providerEventId: { type: String, required: true, unique: true, index: true },
    eventName: { type: String, required: true, maxlength: 120 },
    payloadHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      required: true,
      index: true,
    },
    attempts: { type: Number, min: 1, default: 1 },
    processedAt: { type: Date },
    lastError: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

billingWebhookEventSchema.index({ status: 1, updatedAt: 1 });

export const BillingSubscription = mongoose.model<IBillingSubscription>(
  'BillingSubscription',
  billingSubscriptionSchema,
);
export const BillingWebhookEvent = mongoose.model<IBillingWebhookEvent>(
  'BillingWebhookEvent',
  billingWebhookEventSchema,
);
