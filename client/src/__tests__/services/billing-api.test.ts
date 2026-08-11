import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("../../lib/axios", () => ({ default: mocks }));

import { billingApi } from "../../features/billing";

describe("Razorpay billing API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { success: true, data: {} } });
    mocks.post.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it("creates only a Professional subscription with an explicit billing cycle", async () => {
    await billingApi.create("annual");
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/billing/subscriptions", {
      plan: "professional",
      billingCycle: "annual",
    });
  });

  it("sends Razorpay confirmation fields to the server for signature verification", async () => {
    await billingApi.confirm({
      razorpay_payment_id: "pay_A1",
      razorpay_subscription_id: "sub_B2",
      razorpay_signature: "signature",
    });
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/billing/subscriptions/confirm", {
      razorpayPaymentId: "pay_A1",
      razorpaySubscriptionId: "sub_B2",
      razorpaySignature: "signature",
    });
  });

  it("defaults cancellation to the end of the current billing cycle", async () => {
    await billingApi.cancel();
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/billing/subscription/cancel", {
      cancelAtCycleEnd: true,
    });
  });
});
