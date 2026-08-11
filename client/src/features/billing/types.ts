export type BillingCycle = "monthly" | "annual";
export type BillingPlanId = "free" | "professional" | "enterprise";
export type BillingSubscriptionStatus =
  | "provisioning"
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "paused"
  | "cancelled"
  | "completed"
  | "expired"
  | "reconciliation_required"
  | "failed";

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  description: string;
  prices: Record<
    BillingCycle,
    { amountMinor: number | null; available: boolean }
  >;
}

export interface BillingPlansResponse {
  enabled: boolean;
  configured: boolean;
  provider: "razorpay";
  currency: string;
  plans: BillingPlan[];
}

export interface BillingSubscription {
  id: string;
  provider: "razorpay";
  providerSubscriptionId?: string;
  plan: BillingPlanId;
  billingCycle: BillingCycle;
  status: BillingSubscriptionStatus;
  currency: string;
  amountMinor: number;
  quantity: number;
  paidCount: number;
  remainingCount: number;
  cancelAtCycleEnd: boolean;
  currentStart?: string;
  currentEnd?: string;
  endedAt?: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingState {
  workspacePlan: BillingPlanId | "starter";
  subscription: BillingSubscription | null;
}

export interface CheckoutSession {
  keyId: string;
  subscription: BillingSubscription;
  reused: boolean;
}

export interface RazorpayCheckoutResult {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailure {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
}
