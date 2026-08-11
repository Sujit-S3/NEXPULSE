import { randomUUID } from 'node:crypto';
import { AuthorizationError, NotFoundError } from '../../errors/index.js';
import { enqueue, getWebhookQueue, QUEUE_NAMES } from '../../jobs/queues.js';
import { encryptIdentitySecret, randomSecret } from '../identity/crypto.js';
import type { PlatformEventType } from './catalog.js';
import { matchesEventSubscription } from './catalog.js';
import { WebhookDelivery, WebhookEndpoint, type IWebhookDelivery, type IWebhookEndpoint } from './model.js';
import { assertWebhookUrlSafe } from './security.js';

function enqueueDelivery(deliveryId: string): void {
  enqueue(getWebhookQueue(), QUEUE_NAMES.webhookDelivery, { deliveryId }, { jobId: deliveryId });
}

function publicEndpoint(endpoint: IWebhookEndpoint) {
  return {
    id: endpoint._id.toString(),
    name: endpoint.name,
    url: endpoint.url,
    description: endpoint.description,
    events: endpoint.events,
    status: endpoint.status,
    apiVersion: endpoint.apiVersion,
    consecutiveFailures: endpoint.consecutiveFailures,
    lastDeliveredAt: endpoint.lastDeliveredAt?.toISOString(),
    lastFailedAt: endpoint.lastFailedAt?.toISOString(),
    createdAt: endpoint.createdAt.toISOString(),
    updatedAt: endpoint.updatedAt.toISOString(),
  };
}

function publicDelivery(delivery: IWebhookDelivery) {
  return {
    id: delivery._id.toString(),
    endpointId: delivery.endpointId.toString(),
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    status: delivery.status,
    attemptCount: delivery.attemptCount,
    nextAttemptAt: delivery.nextAttemptAt.toISOString(),
    deliveredAt: delivery.deliveredAt?.toISOString(),
    responseStatus: delivery.responseStatus,
    lastError: delivery.lastError,
    attempts: delivery.attempts,
    createdAt: delivery.createdAt.toISOString(),
  };
}

export interface PlatformEventEnvelope {
  id: string;
  type: PlatformEventType;
  apiVersion: 'v1';
  createdAt: string;
  workspaceId: string;
  organizationId?: string;
  actorId?: string;
  data: Record<string, unknown>;
}

export const webhookService = {
  async createEndpoint(input: {
    workspaceId: string;
    userId: string;
    name: string;
    url: string;
    description?: string;
    events: string[];
  }) {
    await assertWebhookUrlSafe(input.url);
    const secret = `whsec_${randomSecret(32)}`;
    const endpoint = await WebhookEndpoint.create({
      workspaceId: input.workspaceId,
      createdBy: input.userId,
      name: input.name,
      url: input.url,
      description: input.description,
      events: Array.from(new Set(input.events)),
      secretEncrypted: encryptIdentitySecret(secret),
    });
    return { endpoint: publicEndpoint(endpoint), signingSecret: secret };
  },

  async listEndpoints(workspaceId: string) {
    const endpoints = await WebhookEndpoint.find({ workspaceId, status: { $ne: 'disabled' } })
      .sort({ createdAt: -1 })
      .exec();
    return endpoints.map(publicEndpoint);
  },

  async updateEndpoint(input: {
    workspaceId: string;
    endpointId: string;
    name?: string;
    url?: string;
    description?: string;
    events?: string[];
    status?: 'active' | 'paused';
  }) {
    if (input.url) await assertWebhookUrlSafe(input.url);
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'url', 'description', 'status'] as const) {
      if (input[key] !== undefined) updates[key] = input[key];
    }
    if (input.events) updates['events'] = Array.from(new Set(input.events));
    const endpoint = await WebhookEndpoint.findOneAndUpdate(
      { _id: input.endpointId, workspaceId: input.workspaceId, status: { $ne: 'disabled' } },
      { $set: updates },
      { new: true },
    ).exec();
    if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
    return publicEndpoint(endpoint);
  },

  async rotateSecret(workspaceId: string, endpointId: string) {
    const secret = `whsec_${randomSecret(32)}`;
    const endpoint = await WebhookEndpoint.findOneAndUpdate(
      { _id: endpointId, workspaceId, status: { $ne: 'disabled' } },
      { $set: { secretEncrypted: encryptIdentitySecret(secret), consecutiveFailures: 0 } },
      { new: true },
    ).exec();
    if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
    return { endpoint: publicEndpoint(endpoint), signingSecret: secret };
  },

  async disableEndpoint(workspaceId: string, endpointId: string) {
    const endpoint = await WebhookEndpoint.findOneAndUpdate(
      { _id: endpointId, workspaceId, status: { $ne: 'disabled' } },
      { $set: { status: 'disabled' } },
      { new: true },
    ).exec();
    if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
    await WebhookDelivery.updateMany(
      { endpointId: endpoint._id, status: { $in: ['pending', 'retrying'] } },
      { $set: { status: 'dead_letter', lastError: 'Webhook endpoint disabled' } },
    ).exec();
  },

  async publish(input: {
    type: PlatformEventType;
    workspaceId: string;
    organizationId?: string;
    actorId?: string;
    data: Record<string, unknown>;
  }) {
    const envelope: PlatformEventEnvelope = {
      id: `evt_${randomUUID()}`,
      type: input.type,
      apiVersion: 'v1',
      createdAt: new Date().toISOString(),
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      actorId: input.actorId,
      data: input.data,
    };
    const candidates = await WebhookEndpoint.find({ workspaceId: input.workspaceId, status: 'active' }).exec();
    const endpoints = candidates.filter((endpoint) => endpoint.events.some(
      (subscription) => matchesEventSubscription(subscription, input.type),
    ));
    if (endpoints.length > 0) {
      const created = await WebhookDelivery.insertMany(endpoints.map((endpoint) => ({
        workspaceId: input.workspaceId,
        endpointId: endpoint._id,
        eventId: envelope.id,
        eventType: input.type,
        payload: envelope,
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: new Date(),
      })));
      for (const delivery of created) enqueueDelivery(delivery._id.toString());
    }
    return { event: envelope, queuedDeliveries: endpoints.length };
  },

  async testEndpoint(workspaceId: string, endpointId: string, actorId: string) {
    const endpoint = await WebhookEndpoint.findOne({ _id: endpointId, workspaceId, status: 'active' }).exec();
    if (!endpoint) throw new NotFoundError('Active webhook endpoint not found');
    const envelope: PlatformEventEnvelope = {
      id: `evt_${randomUUID()}`,
      type: 'webhook.test',
      apiVersion: 'v1',
      createdAt: new Date().toISOString(),
      workspaceId,
      actorId,
      data: { endpointId, message: 'NEXPULSE webhook verification event' },
    };
    const delivery = await WebhookDelivery.create({
      workspaceId,
      endpointId: endpoint._id,
      eventId: envelope.id,
      eventType: envelope.type,
      payload: envelope,
      nextAttemptAt: new Date(),
    });
    enqueueDelivery(delivery._id.toString());
    return publicDelivery(delivery);
  },

  async listDeliveries(workspaceId: string, input: { endpointId?: string; limit?: number }) {
    const deliveries = await WebhookDelivery.find({
      workspaceId,
      ...(input.endpointId ? { endpointId: input.endpointId } : {}),
    }).sort({ createdAt: -1 }).limit(Math.min(input.limit ?? 50, 100)).exec();
    return deliveries.map(publicDelivery);
  },

  async replay(workspaceId: string, deliveryId: string) {
    const delivery = await WebhookDelivery.findOneAndUpdate(
      { _id: deliveryId, workspaceId, status: { $in: ['succeeded', 'dead_letter'] } },
      {
        $set: { status: 'pending', nextAttemptAt: new Date(), attemptCount: 0 },
        $unset: { deliveredAt: 1, lastError: 1, responseStatus: 1, responseBody: 1 },
      },
      { new: true },
    ).exec();
    if (!delivery) throw new AuthorizationError('Only completed deliveries in this workspace can be replayed');
    enqueueDelivery(delivery._id.toString());
    return publicDelivery(delivery);
  },
};
