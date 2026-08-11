import { useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "@components/common";
import { GlassModal, GlassSkeleton } from "@components/enterprise";
import { GlassBadge, GlassButton, GlassCard } from "@components/glass";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeIndianRupee,
  CalendarClock,
  Check,
  CreditCard,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { MainDarkLogo } from "@/brand";
import { billingApi, loadRazorpayCheckout, type BillingCycle } from "../features/billing";
import { useNotificationStore } from "../features/core/store/notificationStore";
import { useAuth } from "../hooks/useAuth";

const billingKey = ["billing"] as const;

function errorMessage(error: unknown): string {
  const apiError = error as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  return apiError.response?.data?.error?.message ?? apiError.message ?? "Billing request failed";
}

function money(amountMinor: number | null, currency: string): string {
  if (amountMinor === null) return "Custom";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function date(value?: string): string {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
    : "Not available";
}

const activeStatuses = new Set(["authenticated", "active", "pending", "halted", "paused"]);

function BillingContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);
  const [cycle, setCycle] = useState<BillingCycle>(() => (
    new URLSearchParams(window.location.search).get("cycle") === "monthly" ? "monthly" : "annual"
  ));
  const [cancelOpen, setCancelOpen] = useState(false);
  const permitted = user?.permissions.includes("billing.manage") ?? false;
  const plans = useQuery({
    queryKey: [...billingKey, "plans"],
    queryFn: billingApi.plans,
    staleTime: 10 * 60 * 1000,
  });
  const current = useQuery({
    queryKey: [...billingKey, "current"],
    queryFn: billingApi.current,
    enabled: permitted,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: billingKey }),
      queryClient.invalidateQueries({ queryKey: ["workspace"] }),
    ]);
  };

  const confirm = useMutation({
    mutationFn: billingApi.confirm,
    onSuccess: async () => {
      await refresh();
      addToast({
        type: "success",
        title: "Professional access enabled",
        message: "Razorpay verified the subscription authorisation.",
      });
    },
    onError: (error) => addToast({
      type: "error",
      title: "Verification failed",
      message: errorMessage(error),
    }),
  });

  const create = useMutation({
    mutationFn: billingApi.create,
    onSuccess: async (session) => {
      const providerSubscriptionId = session.subscription.providerSubscriptionId;
      if (!providerSubscriptionId) {
        addToast({
          type: "warning",
          title: "Subscription is reconciling",
          message: "No duplicate charge will be attempted. Refresh after Razorpay sends its signed update.",
        });
        return;
      }
      try {
        const Razorpay = await loadRazorpayCheckout();
        const checkout = new Razorpay({
          key: session.keyId,
          subscription_id: providerSubscriptionId,
          name: "NEXPULSE AI",
          description: `Professional · ${cycle === "annual" ? "Annual" : "Monthly"}`,
          image: `${window.location.origin}${MainDarkLogo}`,
          prefill: {
            name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
            email: user?.email ?? "",
            contact: "9876543210",
          },
          theme: { color: "#3B82F6", backdrop_color: "#08090C" },
          handler: (result) => {
            void confirm.mutateAsync(result);
          },
          modal: {
            ondismiss: () => addToast({
              type: "info",
              title: "Checkout closed",
              message: "Your Razorpay subscription request remains available to resume.",
            }),
            escape: true,
            backdropclose: false,
          },
        });
        checkout.on("payment.failed", (failure) => addToast({
          type: "error",
          title: "Payment authorisation failed",
          message: failure.error?.description ?? failure.error?.reason ?? "Razorpay could not authorise the payment.",
        }));
        checkout.open();
      } catch (error) {
        addToast({ type: "error", title: "Checkout unavailable", message: errorMessage(error) });
      }
    },
    onError: (error) => addToast({
      type: "error",
      title: "Subscription could not start",
      message: errorMessage(error),
    }),
  });

  const cancel = useMutation({
    mutationFn: () => billingApi.cancel(true),
    onSuccess: async () => {
      setCancelOpen(false);
      await refresh();
      addToast({
        type: "success",
        title: "Cancellation scheduled",
        message: "Access remains active through the current billing period.",
      });
    },
    onError: (error) => addToast({
      type: "error",
      title: "Cancellation failed",
      message: errorMessage(error),
    }),
  });

  const professional = plans.data?.plans.find((plan) => plan.id === "professional");
  const selectedPrice = professional?.prices[cycle];
  const monthlyEquivalent = useMemo(() => (
    cycle === "annual" && selectedPrice?.amountMinor
      ? selectedPrice.amountMinor / 12
      : selectedPrice?.amountMinor ?? null
  ), [cycle, selectedPrice?.amountMinor]);
  const subscription = current.data?.subscription;
  const active = subscription ? activeStatuses.has(subscription.status) : false;
  const checkoutBlocked = subscription
    ? ["provisioning", "reconciliation_required"].includes(subscription.status)
    : false;

  useEffect(() => {
    if (subscription?.status === "created") setCycle(subscription.billingCycle);
  }, [subscription?.billingCycle, subscription?.status]);

  if (!permitted) {
    return (
      <GlassCard variant="hero" className="mx-auto max-w-2xl">
        <div className="flex items-start gap-4">
          <LockKeyhole className="size-6 text-[var(--color-warning)]" />
          <div>
            <h1 className="text-xl font-semibold">Billing administrator access required</h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Ask a workspace owner or administrator with the billing.manage permission to manage subscriptions.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            <ShieldCheck className="size-4" /> Secure subscription control
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & subscription</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-fg-muted)]">
            Manage the workspace plan through Razorpay. Entitlements follow verified checkout signatures and signed webhooks.
          </p>
        </div>
        <GlassButton type="button" variant="secondary" onClick={() => void refresh()}>
          <RefreshCw className="size-4" /> Refresh
        </GlassButton>
      </header>

      {!plans.data?.configured && !plans.isLoading && (
        <div role="status" className="flex gap-3 rounded-[var(--radius-xl)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4">
          <TriangleAlert className="size-5 shrink-0 text-[var(--color-warning)]" />
          <div>
            <p className="text-sm font-semibold">Razorpay checkout is not configured</p>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Add the API keys, webhook secret, plan IDs, and enable billing on the server before accepting subscriptions.
            </p>
          </div>
        </div>
      )}

      {current.isLoading || plans.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassSkeleton lines={6} />
          <GlassSkeleton lines={6} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard variant="hero" spotlight>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">Current workspace</p>
                <h2 className="mt-2 text-2xl font-semibold capitalize">
                  {current.data?.workspacePlan ?? "free"}
                </h2>
              </div>
              <GlassBadge variant={active ? "success" : subscription?.status === "halted" ? "error" : "info"} dot>
                {subscription?.status.replaceAll("_", " ") ?? "No subscription"}
              </GlassBadge>
            </div>

            {subscription ? (
              <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-glass)] p-4">
                  <dt className="text-[11px] text-[var(--color-fg-subtle)]">Billing cycle</dt>
                  <dd className="mt-1 text-sm font-semibold capitalize">{subscription.billingCycle}</dd>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-glass)] p-4">
                  <dt className="text-[11px] text-[var(--color-fg-subtle)]">Current period ends</dt>
                  <dd className="mt-1 text-sm font-semibold">{date(subscription.currentEnd)}</dd>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-glass)] p-4">
                  <dt className="text-[11px] text-[var(--color-fg-subtle)]">Paid cycles</dt>
                  <dd className="mt-1 text-sm font-semibold">{subscription.paidCount}</dd>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-glass)] p-4">
                  <dt className="text-[11px] text-[var(--color-fg-subtle)]">Provider</dt>
                  <dd className="mt-1 text-sm font-semibold">Razorpay</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-sm text-[var(--color-fg-muted)]">
                This workspace is currently using the Starter plan with no recurring charge.
              </p>
            )}

            {active && !subscription?.cancelAtCycleEnd && (
              <GlassButton className="mt-6" type="button" variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel at cycle end
              </GlassButton>
            )}
            {subscription?.cancelAtCycleEnd && (
              <p className="mt-6 flex items-center gap-2 text-sm text-[var(--color-warning)]">
                <CalendarClock className="size-4" /> Cancellation is scheduled for {date(subscription.currentEnd)}.
              </p>
            )}
          </GlassCard>

          <GlassCard variant="glow" glow>
            <div className="flex flex-col justify-between gap-5 sm:flex-row">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-[var(--color-accent)]" />
                  <h2 className="text-xl font-semibold">Professional</h2>
                </div>
                <p className="mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
                  Unlock AI recommendations, advanced reports, unlimited publishing, collaboration, and priority support.
                </p>
              </div>
              <div className="inline-flex self-start rounded-full border border-[var(--color-border)] bg-[var(--color-glass)] p-1">
                {(["monthly", "annual"] as BillingCycle[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCycle(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      cycle === option
                        ? "bg-[var(--color-accent)] text-white"
                        : "text-[var(--color-fg-muted)]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-7 flex items-end gap-2">
              <strong className="text-4xl font-bold">
                {money(monthlyEquivalent, plans.data?.currency ?? "INR")}
              </strong>
              <span className="pb-1 text-sm text-[var(--color-fg-muted)]">/ month</span>
            </div>
            {cycle === "annual" && selectedPrice?.amountMinor && (
              <p className="-mt-5 mb-6 text-xs text-[var(--color-success)]">
                {money(selectedPrice.amountMinor, plans.data?.currency ?? "INR")} billed annually
              </p>
            )}

            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                "Unlimited social platforms",
                "AI-powered recommendations",
                "90-day analytics history",
                "Advanced performance reports",
                "Five team seats",
                "Priority support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--color-success)]" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GlassButton
                type="button"
                size="lg"
                loading={create.isPending || confirm.isPending}
                disabled={!plans.data?.configured || active || checkoutBlocked || !selectedPrice?.available}
                onClick={() => create.mutate(cycle)}
              >
                <BadgeIndianRupee className="size-4" />
                {active
                  ? "Current subscription"
                  : checkoutBlocked
                    ? "Awaiting reconciliation"
                    : subscription?.status === "created"
                      ? "Resume Razorpay checkout"
                      : "Continue with Razorpay"}
              </GlassButton>
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)]">
                <CreditCard className="size-3.5" /> Payment details are collected by Razorpay.
              </span>
            </div>
          </GlassCard>
        </div>
      )}

      <GlassModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Schedule subscription cancellation?"
        description="Recurring charges will stop after the current billing cycle."
      >
        <p className="text-sm text-[var(--color-fg-muted)]">
          Your workspace keeps Professional access until {date(subscription?.currentEnd)}, then automatically returns to Starter.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <GlassButton type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
            Keep subscription
          </GlassButton>
          <GlassButton type="button" variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
            Schedule cancellation
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}

export function BillingPage() {
  return (
    <ErrorBoundary>
      <BillingContent />
    </ErrorBoundary>
  );
}
