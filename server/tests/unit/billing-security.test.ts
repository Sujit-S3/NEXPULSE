import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  payloadDigest,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../../src/modules/billing/security.js';
import {
  cancelSubscriptionSchema,
  confirmSubscriptionSchema,
  createSubscriptionSchema,
} from '../../src/modules/billing/validator.js';
import { shouldApplySubscriptionEvent } from '../../src/modules/billing/lifecycle.js';

describe('Razorpay billing security', () => {
  it('verifies the mandatory payment and subscription checkout signature', () => {
    const paymentId = 'pay_A1b2C3d4';
    const subscriptionId = 'sub_Z9y8X7w6';
    const secret = 'razorpay-test-secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');

    expect(verifyRazorpayCheckoutSignature(paymentId, subscriptionId, signature, secret)).toBe(true);
    expect(verifyRazorpayCheckoutSignature(paymentId, subscriptionId, signature, 'wrong-secret')).toBe(false);
    expect(verifyRazorpayCheckoutSignature(paymentId, subscriptionId, 'not-hex', secret)).toBe(false);
  });

  it('verifies webhooks against the exact raw request bytes', () => {
    const secret = 'dedicated-webhook-secret';
    const raw = Buffer.from('{\n  "event": "subscription.activated"\n}');
    const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    expect(verifyRazorpayWebhookSignature(raw, signature, secret)).toBe(true);
    expect(
      verifyRazorpayWebhookSignature(
        Buffer.from('{"event":"subscription.activated"}'),
        signature,
        secret,
      ),
    ).toBe(false);
    expect(payloadDigest(raw)).toHaveLength(64);
  });

  it('accepts only the supported workspace subscription contract', () => {
    expect(createSubscriptionSchema.safeParse({
      plan: 'professional',
      billingCycle: 'annual',
    }).success).toBe(true);
    expect(createSubscriptionSchema.safeParse({
      plan: 'enterprise',
      billingCycle: 'annual',
    }).success).toBe(false);
    expect(confirmSubscriptionSchema.safeParse({
      razorpayPaymentId: 'pay_A1b2C3d4',
      razorpaySubscriptionId: 'sub_Z9y8X7w6',
      razorpaySignature: 'a'.repeat(64),
    }).success).toBe(true);
    expect(cancelSubscriptionSchema.parse({})).toEqual({ cancelAtCycleEnd: true });
  });

  it('does not let duplicate, stale, or post-terminal webhooks corrupt entitlement state', () => {
    const now = new Date('2026-07-27T12:00:00.000Z');
    expect(shouldApplySubscriptionEvent({
      currentStatus: 'active',
      lastEventAt: now,
      incomingStatus: 'pending',
      incomingEventAt: new Date(now.getTime() - 1000),
    })).toBe(false);
    expect(shouldApplySubscriptionEvent({
      currentStatus: 'active',
      lastEventAt: now,
      incomingStatus: 'active',
      incomingEventAt: now,
    })).toBe(false);
    expect(shouldApplySubscriptionEvent({
      currentStatus: 'cancelled',
      lastEventAt: now,
      incomingStatus: 'active',
      incomingEventAt: new Date(now.getTime() + 1000),
    })).toBe(false);
    expect(shouldApplySubscriptionEvent({
      currentStatus: 'halted',
      lastEventAt: now,
      incomingStatus: 'active',
      incomingEventAt: new Date(now.getTime() + 1000),
    })).toBe(true);
  });
});
