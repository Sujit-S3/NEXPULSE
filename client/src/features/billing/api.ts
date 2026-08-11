import type {
  BillingCycle,
  BillingPlansResponse,
  BillingState,
  BillingSubscription,
  CheckoutSession,
  RazorpayCheckoutResult,
} from "./types";
import api from "../../lib/axios";
import type { ApiResponse } from "../../types";

export const billingApi = {
  async plans(): Promise<BillingPlansResponse> {
    const response = await api.get<ApiResponse<BillingPlansResponse>>("/api/v1/billing/plans");
    return response.data.data;
  },

  async current(): Promise<BillingState> {
    const response = await api.get<ApiResponse<BillingState>>("/api/v1/billing/subscription");
    return response.data.data;
  },

  async create(billingCycle: BillingCycle): Promise<CheckoutSession> {
    const response = await api.post<ApiResponse<CheckoutSession>>("/api/v1/billing/subscriptions", {
      plan: "professional",
      billingCycle,
    });
    return response.data.data;
  },

  async confirm(result: RazorpayCheckoutResult): Promise<BillingSubscription> {
    const response = await api.post<ApiResponse<BillingSubscription>>(
      "/api/v1/billing/subscriptions/confirm",
      {
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySubscriptionId: result.razorpay_subscription_id,
        razorpaySignature: result.razorpay_signature,
      },
    );
    return response.data.data;
  },

  async cancel(cancelAtCycleEnd = true): Promise<BillingSubscription> {
    const response = await api.post<ApiResponse<BillingSubscription>>(
      "/api/v1/billing/subscription/cancel",
      { cancelAtCycleEnd },
    );
    return response.data.data;
  },
};
