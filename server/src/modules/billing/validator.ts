import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  plan: z.literal('professional'),
  billingCycle: z.enum(['monthly', 'annual']),
}).strict();

export const confirmSubscriptionSchema = z.object({
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpaySubscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/),
  razorpaySignature: z.string().regex(/^[a-f\d]{64}$/i),
}).strict();

export const cancelSubscriptionSchema = z.object({
  cancelAtCycleEnd: z.boolean().default(true),
}).strict();
