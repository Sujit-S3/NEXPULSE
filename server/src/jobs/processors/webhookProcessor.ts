import type { Job } from 'bullmq';
import { decryptIdentitySecret } from '../../modules/identity/crypto.js';
import { WebhookDelivery, WebhookEndpoint } from '../../modules/developer/model.js';
import { assertWebhookUrlSafe, webhookSignature } from '../../modules/developer/security.js';

const DELIVERY_TIMEOUT_MS = 10_000;

export interface WebhookDeliveryJobData {
  deliveryId: string;
}

/**
 * Delivers one webhook by delivery ID. Throws on failure so BullMQ schedules a retry
 * per the queue's backoff policy; the Mongo delivery/endpoint records are updated for
 * the developer-facing API regardless of outcome, but retry *timing* is owned by BullMQ,
 * not by the `nextAttemptAt` field (which is now advisory/display-only).
 */
export async function processWebhookDelivery(job: Job<WebhookDeliveryJobData>): Promise<void> {
  const { deliveryId } = job.data;
  const delivery = await WebhookDelivery.findById(deliveryId).exec();
  if (!delivery || delivery.status === 'succeeded' || delivery.status === 'dead_letter') return;

  const endpoint = await WebhookEndpoint.findOne({ _id: delivery.endpointId, status: 'active' })
    .select('+secretEncrypted')
    .exec();
  if (!endpoint) {
    await WebhookDelivery.updateOne(
      { _id: delivery._id },
      { $set: { status: 'dead_letter', lastError: 'Webhook endpoint is unavailable' } },
    ).exec();
    return;
  }

  await WebhookDelivery.updateOne({ _id: delivery._id }, { $set: { status: 'delivering' } }).exec();

  const startedAt = Date.now();
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? attemptNumber;
  const isFinalAttempt = attemptNumber >= maxAttempts;

  try {
    await assertWebhookUrlSafe(endpoint.url);
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'NEXPULSE-Webhooks/1.0',
        'x-nexpulse-delivery': delivery.eventId,
        'x-nexpulse-event': delivery.eventType,
        'x-nexpulse-signature': webhookSignature(
          decryptIdentitySecret(endpoint.secretEncrypted),
          timestamp,
          body,
        ),
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    const responseBody = (await response.text()).slice(0, 2000);
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}: ${responseBody.slice(0, 300)}`);

    const completedAt = new Date();
    await Promise.all([
      WebhookDelivery.updateOne({ _id: delivery._id }, {
        $set: {
          status: 'succeeded',
          attemptCount: attemptNumber,
          deliveredAt: completedAt,
          responseStatus: response.status,
          responseBody,
        },
        $push: {
          attempts: {
            attemptedAt: completedAt,
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            outcome: 'succeeded',
          },
        },
      }).exec(),
      WebhookEndpoint.updateOne(
        { _id: endpoint._id },
        { $set: { consecutiveFailures: 0, lastDeliveredAt: completedAt } },
      ).exec(),
    ]);
  } catch (error) {
    const failedAt = new Date();
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Webhook delivery failed';
    await Promise.all([
      WebhookDelivery.updateOne({ _id: delivery._id }, {
        $set: {
          status: isFinalAttempt ? 'dead_letter' : 'retrying',
          attemptCount: attemptNumber,
          lastError: message,
        },
        $push: {
          attempts: {
            attemptedAt: failedAt,
            durationMs: Date.now() - startedAt,
            outcome: 'failed',
            error: message,
          },
        },
      }).exec(),
      WebhookEndpoint.updateOne(
        { _id: endpoint._id },
        { $inc: { consecutiveFailures: 1 }, $set: { lastFailedAt: failedAt } },
      ).exec(),
    ]);
    throw error;
  }
}
