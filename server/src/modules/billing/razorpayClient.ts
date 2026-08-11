import { config } from '../../config/env.js';
import { AppError } from '../../errors/index.js';
import type { RazorpayPlan, RazorpaySubscription } from './types.js';

function credentials(): { keyId: string; keySecret: string } {
  const { keyId, keySecret } = config.billing.razorpay;
  if (!config.features.billing || !keyId || !keySecret) {
    throw new AppError('Subscription billing is not configured', 503, 'BILLING_NOT_CONFIGURED');
  }
  return { keyId, keySecret };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      signal: AbortSignal.timeout(12_000),
      headers: {
        authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new AppError('The billing provider is temporarily unavailable', 502, 'BILLING_PROVIDER_UNAVAILABLE');
  }

  if (!response.ok) {
    let errorDescription = 'The billing provider rejected the subscription request';
    try {
      const errJson = (await response.json()) as { error?: { description?: string; code?: string } };
      if (errJson.error?.description) {
        errorDescription = `Razorpay API error: ${errJson.error.description}`;
      }
    } catch {
      // Fallback if response body is not JSON
    }
    throw new AppError(
      errorDescription,
      502,
      'BILLING_PROVIDER_ERROR',
    );
  }
  return response.json() as Promise<T>;
}

export const razorpayClient = {
  fetchPlan(planId: string): Promise<RazorpayPlan> {
    return request<RazorpayPlan>(`/plans/${encodeURIComponent(planId)}`, {
      method: 'GET',
    });
  },

  createSubscription(input: {
    planId: string;
    totalCount: number;
    workspaceId: string;
    userId: string;
    billingCycle: string;
  }): Promise<RazorpaySubscription> {
    return request<RazorpaySubscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: input.planId,
        total_count: input.totalCount,
        quantity: 1,
        customer_notify: true,
        notes: {
          workspace_id: input.workspaceId,
          created_by: input.userId,
          billing_cycle: input.billingCycle,
          product: 'NEXPULSE AI',
        },
      }),
    });
  },

  cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean,
  ): Promise<RazorpaySubscription> {
    return request<RazorpaySubscription>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd }),
      },
    );
  },
};
