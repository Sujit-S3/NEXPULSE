export type BillingPlan = 'free' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type BillingSubscriptionStatus =
  | 'provisioning'
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'reconciliation_required'
  | 'failed';

export interface RazorpaySubscription {
  id: string;
  entity: 'subscription';
  plan_id: string;
  customer_id?: string | null;
  status: Exclude<
    BillingSubscriptionStatus,
    'provisioning' | 'reconciliation_required' | 'failed'
  >;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  quantity: number;
  total_count: number;
  paid_count: number;
  remaining_count: number;
  created_at: number;
  short_url?: string | null;
  has_scheduled_changes?: boolean;
  change_scheduled_at?: number | null;
  notes?: Record<string, string>;
}

export interface RazorpayPlan {
  id: string;
  entity: 'plan';
  interval: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  item: {
    active: boolean;
    amount: number;
    currency: string;
    name: string;
  };
}

export interface RazorpayWebhookPayload {
  event: string;
  created_at: number;
  payload?: {
    subscription?: { entity?: RazorpaySubscription };
    payment?: { entity?: { id?: string } };
  };
}
