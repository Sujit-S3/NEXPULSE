import { config } from '../../config/env.js';
import { AppError, AuthorizationError, ConflictError, NotFoundError } from '../../errors/index.js';
import { logger } from '../../logger/index.js';
import { Workspace } from '../auth/model.js';
import { createWorkspaceNotification } from '../notifications/service.js';
import { shouldApplySubscriptionEvent } from './lifecycle.js';
import { BillingSubscription, BillingWebhookEvent, type IBillingSubscription } from './model.js';
import { razorpayClient } from './razorpayClient.js';
import {
  payloadDigest,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from './security.js';
import type {
  BillingCycle,
  BillingSubscriptionStatus,
  RazorpaySubscription,
  RazorpayWebhookPayload,
} from './types.js';

const terminalStatuses: BillingSubscriptionStatus[] = [
  'cancelled',
  'completed',
  'expired',
  'failed',
];
const providerStatuses = new Set<BillingSubscriptionStatus>([
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'paused',
  'cancelled',
  'completed',
  'expired',
]);

function isConfigured(): boolean {
  const razorpay = config.billing.razorpay;
  return Boolean(
    config.features.billing
    && razorpay.keyId
    && razorpay.keySecret
    && razorpay.webhookSecret
    && razorpay.professional.monthlyPlanId
    && razorpay.professional.annualPlanId,
  );
}

function requireBillingConfiguration() {
  if (!isConfigured()) {
    throw new AppError('Subscription billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
  }
  return config.billing.razorpay as typeof config.billing.razorpay & {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    professional: typeof config.billing.razorpay.professional & {
      monthlyPlanId: string;
      annualPlanId: string;
    };
  };
}

function iso(value?: Date): string | undefined {
  return value?.toISOString();
}

function publicSubscription(subscription: IBillingSubscription) {
  return {
    id: subscription._id.toString(),
    provider: subscription.provider,
    providerSubscriptionId: subscription.providerSubscriptionId,
    plan: subscription.plan,
    billingCycle: subscription.billingCycle,
    status: subscription.status,
    currency: subscription.currency,
    amountMinor: subscription.amountMinor,
    quantity: subscription.quantity,
    paidCount: subscription.paidCount,
    remainingCount: subscription.remainingCount,
    cancelAtCycleEnd: subscription.cancelAtCycleEnd,
    currentStart: iso(subscription.currentStart),
    currentEnd: iso(subscription.currentEnd),
    endedAt: iso(subscription.endedAt),
    checkoutUrl: subscription.checkoutUrl,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

function planConfiguration(cycle: BillingCycle) {
  const razorpay = requireBillingConfiguration();
  return cycle === 'monthly'
    ? {
      providerPlanId: razorpay.professional.monthlyPlanId,
      amountMinor: razorpay.professional.monthlyPriceMinor,
      totalCount: 1200,
    }
    : {
      providerPlanId: razorpay.professional.annualPlanId,
      amountMinor: razorpay.professional.annualPriceMinor,
      totalCount: 100,
    };
}

const validatedPlans = new Map<string, number>();

async function assertProviderPlan(input: {
  providerPlanId: string;
  amountMinor: number;
  currency: string;
  billingCycle: BillingCycle;
}): Promise<void> {
  const cachedUntil = validatedPlans.get(input.providerPlanId) ?? 0;
  if (cachedUntil > Date.now()) return;

  const providerPlan = await razorpayClient.fetchPlan(input.providerPlanId);
  const expectedPeriod = input.billingCycle === 'monthly' ? 'monthly' : 'yearly';
  if (
    providerPlan.id !== input.providerPlanId
    || !providerPlan.item.active
    || providerPlan.interval !== 1
    || providerPlan.period !== expectedPeriod
    || providerPlan.item.amount !== input.amountMinor
    || providerPlan.item.currency.toUpperCase() !== input.currency
  ) {
    throw new AppError(
      'Configured pricing does not match the Razorpay plan',
      503,
      'BILLING_PLAN_MISMATCH',
    );
  }
  validatedPlans.set(input.providerPlanId, Date.now() + 5 * 60 * 1000);
}

function dateFromEpoch(value?: number | null): Date | undefined {
  return value ? new Date(value * 1000) : undefined;
}

function providerFields(provider: RazorpaySubscription): Record<string, unknown> {
  return {
    providerSubscriptionId: provider.id,
    providerCustomerId: provider.customer_id ?? undefined,
    status: provider.status,
    paidCount: provider.paid_count ?? 0,
    remainingCount: provider.remaining_count ?? 0,
    checkoutUrl: provider.short_url ?? undefined,
    currentStart: dateFromEpoch(provider.current_start),
    currentEnd: dateFromEpoch(provider.current_end),
    endedAt: dateFromEpoch(provider.ended_at),
    providerCreatedAt: dateFromEpoch(provider.created_at),
    cancelAtCycleEnd: Boolean(provider.has_scheduled_changes),
    failureReason: undefined,
  };
}

async function notify(
  workspaceId: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createWorkspaceNotification(workspaceId, {
      type: 'system',
      title,
      message,
      actionable: true,
      actionLabel: 'Open billing',
      actionPath: '/billing',
      resourceType: 'billing_subscription',
    });
  } catch (error) {
    logger.warn('Billing notification could not be delivered', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function setWorkspacePlan(workspaceId: string, plan: 'free' | 'professional'): Promise<void> {
  await Workspace.updateOne({ _id: workspaceId }, { $set: { plan } }).exec();
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

async function claimWebhook(
  eventId: string,
  eventName: string,
  hash: string,
): Promise<{ duplicate: boolean }> {
  try {
    await BillingWebhookEvent.create({
      provider: 'razorpay',
      providerEventId: eventId,
      eventName,
      payloadHash: hash,
      status: 'processing',
      attempts: 1,
    });
    return { duplicate: false };
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    const existing = await BillingWebhookEvent.findOne({ providerEventId: eventId }).exec();
    if (!existing || existing.payloadHash !== hash) {
      throw new AuthorizationError('Webhook event identifier does not match its original payload');
    }
    if (existing.status !== 'failed') return { duplicate: true };
    await BillingWebhookEvent.updateOne(
      { _id: existing._id, status: 'failed' },
      {
        $set: { status: 'processing', eventName, lastError: undefined },
        $inc: { attempts: 1 },
      },
    ).exec();
    return { duplicate: false };
  }
}

export const billingService = {
  plans() {
    const razorpay = config.billing.razorpay;
    return {
      enabled: config.features.billing,
      configured: isConfigured(),
      provider: 'razorpay' as const,
      currency: razorpay.currency,
      plans: [
        {
          id: 'free' as const,
          name: 'Starter',
          description: 'Core analytics for individuals and small teams.',
          prices: {
            monthly: { amountMinor: 0, available: true },
            annual: { amountMinor: 0, available: true },
          },
        },
        {
          id: 'professional' as const,
          name: 'Professional',
          description: 'AI insights, automation, advanced reporting, and collaboration.',
          prices: {
            monthly: {
              amountMinor: razorpay.professional.monthlyPriceMinor,
              available: Boolean(razorpay.professional.monthlyPlanId),
            },
            annual: {
              amountMinor: razorpay.professional.annualPriceMinor,
              available: Boolean(razorpay.professional.annualPlanId),
            },
          },
        },
        {
          id: 'enterprise' as const,
          name: 'Enterprise',
          description: 'Custom controls, compliance, scale, and support.',
          prices: {
            monthly: { amountMinor: null, available: false },
            annual: { amountMinor: null, available: false },
          },
        },
      ],
    };
  },

  async current(workspaceId: string) {
    const [workspace, current, latest] = await Promise.all([
      Workspace.findById(workspaceId).select('plan').exec(),
      BillingSubscription.findOne({ workspaceId, currentKey: workspaceId }).exec(),
      BillingSubscription.findOne({ workspaceId }).sort({ createdAt: -1 }).exec(),
    ]);
    if (!workspace) throw new NotFoundError('Workspace not found');
    return {
      workspacePlan: workspace.plan,
      subscription: current ? publicSubscription(current) : latest ? publicSubscription(latest) : null,
    };
  },

  async create(input: {
    workspaceId: string;
    userId: string;
    billingCycle: BillingCycle;
  }) {
    const razorpay = requireBillingConfiguration();
    const plan = planConfiguration(input.billingCycle);
    await assertProviderPlan({
      providerPlanId: plan.providerPlanId,
      amountMinor: plan.amountMinor,
      currency: razorpay.currency,
      billingCycle: input.billingCycle,
    });
    const existing = await BillingSubscription.findOne({
      workspaceId: input.workspaceId,
      currentKey: input.workspaceId,
    }).exec();
    if (existing) {
      if (
        existing.status === 'created'
        && existing.billingCycle === input.billingCycle
        && existing.providerSubscriptionId
      ) {
        return {
          keyId: razorpay.keyId,
          subscription: publicSubscription(existing),
          reused: true,
        };
      }
      throw new ConflictError(
        existing.status === 'reconciliation_required'
          ? 'A previous billing request is awaiting Razorpay reconciliation'
          : 'This workspace already has an open or active subscription',
      );
    }

    let local: IBillingSubscription;
    try {
      local = await BillingSubscription.create({
        workspaceId: input.workspaceId,
        createdBy: input.userId,
        provider: 'razorpay',
        providerPlanId: plan.providerPlanId,
        plan: 'professional',
        billingCycle: input.billingCycle,
        status: 'provisioning',
        currentKey: input.workspaceId,
        currency: razorpay.currency,
        amountMinor: plan.amountMinor,
        quantity: 1,
        totalCount: plan.totalCount,
        paidCount: 0,
        remainingCount: plan.totalCount,
        cancelAtCycleEnd: false,
      });
    } catch (error) {
      if (duplicateKey(error)) {
        throw new ConflictError('This workspace already has a subscription request in progress');
      }
      throw error;
    }

    try {
      const provider = await razorpayClient.createSubscription({
        planId: plan.providerPlanId,
        totalCount: plan.totalCount,
        workspaceId: input.workspaceId,
        userId: input.userId,
        billingCycle: input.billingCycle,
      });
      const updated = await BillingSubscription.findByIdAndUpdate(
        local._id,
        { $set: providerFields(provider) },
        { new: true },
      ).exec();
      if (!updated) throw new NotFoundError('Subscription request was not persisted');
      return {
        keyId: razorpay.keyId,
        subscription: publicSubscription(updated),
        reused: false,
      };
    } catch (error) {
      const uncertain = error instanceof AppError && error.code === 'BILLING_PROVIDER_UNAVAILABLE';
      await BillingSubscription.updateOne(
        { _id: local._id },
        uncertain
          ? {
            $set: {
              status: 'reconciliation_required',
              failureReason: 'Provider response was not received; awaiting signed webhook reconciliation',
            },
          }
          : {
            $set: {
              status: 'failed',
              failureReason: error instanceof Error ? error.message : 'Subscription provisioning failed',
            },
            $unset: { currentKey: 1 },
          },
      ).exec();
      throw error;
    }
  },

  async confirm(input: {
    workspaceId: string;
    paymentId: string;
    subscriptionId: string;
    signature: string;
  }) {
    const razorpay = requireBillingConfiguration();
    if (!verifyRazorpayCheckoutSignature(
      input.paymentId,
      input.subscriptionId,
      input.signature,
      razorpay.keySecret,
    )) {
      throw new AuthorizationError('Razorpay checkout signature verification failed');
    }

    const existing = await BillingSubscription.findOne({
      workspaceId: input.workspaceId,
      providerSubscriptionId: input.subscriptionId,
      currentKey: input.workspaceId,
    }).exec();
    if (!existing) throw new NotFoundError('Subscription not found for this workspace');
    if (
      existing.latestPaymentId
      && existing.latestPaymentId !== input.paymentId
    ) {
      throw new ConflictError('A different payment is already linked to this subscription');
    }

    const subscription = await BillingSubscription.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          status: existing.status === 'active' ? 'active' : 'authenticated',
          latestPaymentId: input.paymentId,
          failureReason: undefined,
        },
      },
      { new: true },
    ).exec();
    if (!subscription) throw new NotFoundError('Subscription not found');
    await setWorkspacePlan(input.workspaceId, 'professional');
    await notify(
      input.workspaceId,
      'Subscription authenticated',
      'Razorpay verified your payment authorisation. Professional access is enabled.',
    );
    return publicSubscription(subscription);
  },

  async cancel(workspaceId: string, cancelAtCycleEnd: boolean) {
    requireBillingConfiguration();
    const existing = await BillingSubscription.findOne({
      workspaceId,
      currentKey: workspaceId,
    }).exec();
    if (!existing?.providerSubscriptionId) {
      throw new NotFoundError('No cancellable subscription was found');
    }
    if (terminalStatuses.includes(existing.status)) {
      throw new ConflictError('This subscription has already ended');
    }

    const provider = await razorpayClient.cancelSubscription(
      existing.providerSubscriptionId,
      cancelAtCycleEnd,
    );
    const update: Record<string, unknown> = {
      $set: {
        ...providerFields(provider),
        cancelAtCycleEnd,
      },
    };
    if (!cancelAtCycleEnd || terminalStatuses.includes(provider.status)) {
      update['$unset'] = { currentKey: 1 };
    }
    const subscription = await BillingSubscription.findByIdAndUpdate(
      existing._id,
      update,
      { new: true },
    ).exec();
    if (!subscription) throw new NotFoundError('Subscription not found');
    if (!cancelAtCycleEnd || terminalStatuses.includes(subscription.status)) {
      await setWorkspacePlan(workspaceId, 'free');
    }
    await notify(
      workspaceId,
      cancelAtCycleEnd ? 'Cancellation scheduled' : 'Subscription cancelled',
      cancelAtCycleEnd
        ? 'Professional access remains active until the current billing cycle ends.'
        : 'Recurring billing has stopped and the workspace returned to the Starter plan.',
    );
    return publicSubscription(subscription);
  },

  async webhook(input: {
    rawBody: Buffer;
    signature: string;
    eventId: string;
  }): Promise<{ duplicate: boolean; ignored: boolean }> {
    const razorpay = requireBillingConfiguration();
    if (!verifyRazorpayWebhookSignature(input.rawBody, input.signature, razorpay.webhookSecret)) {
      throw new AuthorizationError('Invalid Razorpay webhook signature');
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(input.rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      throw new AppError('Webhook body is not valid JSON', 400, 'INVALID_WEBHOOK');
    }
    const eventName = typeof payload.event === 'string' ? payload.event.slice(0, 120) : 'unknown';
    const claim = await claimWebhook(
      input.eventId,
      eventName,
      payloadDigest(input.rawBody),
    );
    if (claim.duplicate) return { duplicate: true, ignored: false };

    try {
      const entity = payload.payload?.subscription?.entity;
      if (!entity?.id || !providerStatuses.has(entity.status)) {
        await BillingWebhookEvent.updateOne(
          { providerEventId: input.eventId },
          { $set: { status: 'processed', processedAt: new Date() } },
        ).exec();
        return { duplicate: false, ignored: true };
      }

      let subscription = await BillingSubscription.findOne({
        providerSubscriptionId: entity.id,
      }).exec();
      if (!subscription) {
        const workspaceId = entity.notes?.['workspace_id'];
        if (workspaceId && /^[a-f\d]{24}$/i.test(workspaceId)) {
          subscription = await BillingSubscription.findOne({
            workspaceId,
            currentKey: workspaceId,
            providerPlanId: entity.plan_id,
            status: { $in: ['provisioning', 'reconciliation_required'] },
          }).exec();
        }
      }
      if (!subscription) {
        await BillingWebhookEvent.updateOne(
          { providerEventId: input.eventId },
          { $set: { status: 'processed', processedAt: new Date() } },
        ).exec();
        return { duplicate: false, ignored: true };
      }

      const eventAt = dateFromEpoch(payload.created_at) ?? new Date();
      if (!shouldApplySubscriptionEvent({
        currentStatus: subscription.status,
        lastEventAt: subscription.lastEventAt,
        incomingStatus: entity.status,
        incomingEventAt: eventAt,
      })) {
        await BillingWebhookEvent.updateOne(
          { providerEventId: input.eventId },
          { $set: { status: 'processed', processedAt: new Date() } },
        ).exec();
        return { duplicate: false, ignored: true };
      }

      const wasCurrent = subscription.currentKey === subscription.workspaceId.toString();
      const isTerminal = terminalStatuses.includes(entity.status);
      const update: Record<string, unknown> = {
        $set: {
          ...providerFields(entity),
          latestPaymentId: payload.payload?.payment?.entity?.id ?? subscription.latestPaymentId,
          lastEventAt: eventAt,
        },
      };
      if (isTerminal) update['$unset'] = { currentKey: 1 };
      await BillingSubscription.updateOne({ _id: subscription._id }, update).exec();

      const workspaceId = subscription.workspaceId.toString();
      if (entity.status === 'authenticated' || entity.status === 'active') {
        await setWorkspacePlan(workspaceId, 'professional');
      } else if (isTerminal && wasCurrent) {
        await setWorkspacePlan(workspaceId, 'free');
      }
      if (
        ['subscription.activated', 'subscription.halted', 'subscription.cancelled']
          .includes(eventName)
      ) {
        await notify(
          workspaceId,
          eventName === 'subscription.activated'
            ? 'Professional subscription active'
            : eventName === 'subscription.halted'
              ? 'Subscription payment needs attention'
              : 'Subscription ended',
          eventName === 'subscription.activated'
            ? 'Razorpay confirmed the recurring subscription is active.'
            : eventName === 'subscription.halted'
              ? 'Razorpay halted recurring charges after payment failures. Review your payment method.'
              : 'Razorpay confirmed that recurring billing has ended.',
        );
      }
      await BillingWebhookEvent.updateOne(
        { providerEventId: input.eventId },
        { $set: { status: 'processed', processedAt: new Date(), lastError: undefined } },
      ).exec();
      return { duplicate: false, ignored: false };
    } catch (error) {
      await BillingWebhookEvent.updateOne(
        { providerEventId: input.eventId },
        {
          $set: {
            status: 'failed',
            lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
          },
        },
      ).exec();
      throw error;
    }
  },
};
