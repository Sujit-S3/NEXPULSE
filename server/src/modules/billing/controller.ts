import type { Request, Response } from 'express';
import { ValidationError } from '../../errors/index.js';
import { logger } from '../../logger/index.js';
import { recordSecurityEvent } from '../identity/securityEvents.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { billingService } from './service.js';

function identity(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

function requiredHeader(req: Request, name: string): string {
  const value = req.headers[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError({ [name]: [`${name} header is required`] });
  }
  return value;
}

async function audit(
  req: Request,
  type: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const user = identity(req);
  try {
    await recordSecurityEvent({
      workspaceId: user.workspaceId,
      organizationId: user.organizationId,
      userId: user.id,
      actorType: 'user',
      actorId: user.id,
      sessionId: user.sessionId,
      type,
      outcome: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
      metadata,
    });
  } catch (error) {
    logger.warn('Billing audit event could not be persisted', {
      type,
      requestId: req.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const billingController = {
  plans(_req: Request, res: Response): void {
    res.status(200).json(apiResponse(billingService.plans()));
  },

  async current(req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(await billingService.current(identity(req).workspaceId)));
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = identity(req);
    const result = await billingService.create({
      workspaceId: user.workspaceId,
      userId: user.id,
      billingCycle: req.body.billingCycle,
    });
    await audit(req, 'billing.subscription_checkout_created', {
      billingCycle: req.body.billingCycle,
      reused: result.reused,
      status: result.subscription.status,
    });
    res.status(result.reused ? 200 : 201).json(apiResponse(result));
  },

  async confirm(req: Request, res: Response): Promise<void> {
    const user = identity(req);
    const subscription = await billingService.confirm({
      workspaceId: user.workspaceId,
      paymentId: req.body.razorpayPaymentId,
      subscriptionId: req.body.razorpaySubscriptionId,
      signature: req.body.razorpaySignature,
    });
    await audit(req, 'billing.subscription_authenticated', {
      billingCycle: subscription.billingCycle,
      status: subscription.status,
    });
    res.status(200).json(apiResponse(subscription, 'Subscription payment verified'));
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const subscription = await billingService.cancel(
      identity(req).workspaceId,
      req.body.cancelAtCycleEnd,
    );
    await audit(req, 'billing.subscription_cancellation_scheduled', {
      cancelAtCycleEnd: req.body.cancelAtCycleEnd,
      status: subscription.status,
    });
    res.status(200).json(apiResponse(subscription, 'Subscription cancellation updated'));
  },

  async webhook(req: Request, res: Response): Promise<void> {
    if (!req.rawBody) {
      throw new ValidationError({ body: ['Raw webhook body is required'] });
    }
    const result = await billingService.webhook({
      rawBody: req.rawBody,
      signature: requiredHeader(req, 'x-razorpay-signature'),
      eventId: requiredHeader(req, 'x-razorpay-event-id'),
    });
    res.status(200).json(apiResponse({ received: true, ...result }));
  },
};
