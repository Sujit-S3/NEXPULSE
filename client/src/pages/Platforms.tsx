import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassButton } from "@components/glass/GlassButton";
import { GlassCard } from "@components/glass/GlassCard";
import { OAuthAccountPicker } from "@components/platforms/OAuthAccountPicker";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Link2,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  TimerReset,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useDisconnectPlatformAccount,
  useOAuthProviderStatus,
  usePlatformConnections,
  useProviderHealth,
  useSetPrimaryPlatformAccount,
  useStartPlatformOAuth,
} from "../features/core/hooks/usePlatforms";
import type { OAuthProviderStatus, PlatformConnection, PlatformType, ProviderHealth } from "../types";

const OAUTH_ERRORS: Record<string, string> = {
  OAUTH_DENIED: "Authorization was cancelled. No accounts were connected.",
  OAUTH_SESSION_EXPIRED: "The authorization session expired. Start the connection again.",
  OAUTH_STATE_INVALID: "The provider returned an invalid security state. Start again.",
  OAUTH_CODE_MISSING: "The provider did not return an authorization code.",
  OAUTH_PERMISSIONS_MISSING: "Required provider permissions were not granted or approved for this app.",
  OAUTH_TOKEN_EXPIRED: "The provider token expired before account discovery completed.",
  OAUTH_RATE_LIMITED: "The provider rate limit was reached. Wait a moment and try again.",
  OAUTH_NETWORK_ERROR: "The provider could not be reached. Check the network and try again.",
  OAUTH_PROVIDER_ERROR: "The provider could not complete authorization.",
};

function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "The platform request failed";
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function ProviderMark({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-accent)]/25 bg-[var(--color-accent-muted)] text-sm font-bold text-[var(--color-accent)]">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function ConnectProviderModal({
  open,
  providers,
  loading,
  error,
  onClose,
  onConnect,
}: {
  open: boolean;
  providers: OAuthProviderStatus[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConnect: (provider: PlatformType) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] grid place-items-center bg-black/65 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-provider-title"
            className="w-full max-w-2xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-glass-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-xl)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5">
              <div>
                <h2 id="connect-provider-title" className="text-xl font-semibold">Connect a provider</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  You will authenticate on the provider site, then choose the accounts to save.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)]"
                aria-label="Close provider selection"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="p-5">
              {loading && providers.length === 0 ? (
                <div className="grid min-h-44 place-items-center" role="status">
                  <RefreshCw className="size-6 animate-spin text-[var(--color-accent)]" />
                </div>
              ) : providers.length === 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-5">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-warning)]" />
                    <div>
                      <h3 className="font-semibold">No OAuth providers are configured</h3>
                      <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                        A provider appears here only after its backend credentials and token-encryption key are configured.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      disabled={loading || !provider.configured}
                      onClick={() => onConnect(provider.id)}
                      className="premium-panel flex items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)]/40 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <ProviderMark name={provider.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{provider.name}</span>
                        <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${provider.configured ? "text-[var(--color-success)]" : "text-[var(--color-fg-subtle)]"}`}>
                          {provider.configured ? <ShieldCheck className="size-3" /> : <LockKeyhole className="size-3" />}
                          {provider.configured ? "Ready to connect" : "Admin setup required"}
                        </span>
                      </span>
                      {provider.configured && <ExternalLink className="size-4 text-[var(--color-fg-subtle)]" />}
                    </button>
                  ))}
                </div>
              )}
              {error && (
                <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-error)]" role="alert">
                  <AlertCircle className="size-4" /> {error}
                </p>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConnectedAccountCard({
  connection,
  health,
  providerName,
  busy,
  onPrimary,
  onReconnect,
  onDisconnect,
}: {
  connection: PlatformConnection;
  health?: ProviderHealth;
  providerName: string;
  busy: boolean;
  onPrimary: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <GlassCard className="!p-5" spotlight={false}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          {connection.avatar ? (
            <img src={connection.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserRound className="size-6 text-[var(--color-fg-subtle)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{connection.displayName}</h3>
            {connection.isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                <Star className="size-3" /> Primary
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              connection.status === "connected"
                ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
            }`}>
              <CheckCircle2 className="size-3" /> {connection.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-fg-muted)]">
            <span>{providerName}</span>
            {connection.username && <span>@{connection.username.replace(/^@/, "")}</span>}
            <span className="capitalize">{connection.accountType.replace(/[:_]/g, " ")}</span>
            {typeof connection.followers === "number" && <span>{compactNumber(connection.followers)} followers</span>}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">
            Provider account ID: {connection.providerAccountId}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:max-w-[240px] sm:justify-end">
          {!connection.isPrimary && (
            <GlassButton variant="secondary" size="sm" disabled={busy} onClick={onPrimary}>
              <Star className="size-3.5" /> Make primary
            </GlassButton>
          )}
          <GlassButton variant="secondary" size="sm" disabled={busy} onClick={onReconnect}>
            <RefreshCw className="size-3.5" /> Reconnect
          </GlassButton>
          <GlassButton variant="ghost" size="sm" disabled={busy} onClick={onDisconnect}>
            <Trash2 className="size-3.5 text-[var(--color-error)]" />
            <span className="text-[var(--color-error)]">Disconnect</span>
          </GlassButton>
        </div>
      </div>

      <div className="provider-health-strip" aria-label={`Live health for ${connection.displayName}`}>
        <div>
          <Activity aria-hidden="true" />
          <span>Availability</span>
          <strong>{health?.availability == null ? "Collecting" : `${health.availability.toFixed(2)}%`}</strong>
        </div>
        <div>
          <TimerReset aria-hidden="true" />
          <span>Average latency</span>
          <strong>{health?.averageLatencyMs == null ? "Collecting" : `${health.averageLatencyMs} ms`}</strong>
        </div>
        <div>
          <AlertCircle aria-hidden="true" />
          <span>Error rate</span>
          <strong>{health?.errorRate == null ? "Collecting" : `${health.errorRate.toFixed(2)}%`}</strong>
        </div>
        <div>
          <CircleDollarSign aria-hidden="true" />
          <span>Provider cost</span>
          <strong>{health?.costUsd == null ? "Not reported" : `$${health.costUsd.toFixed(2)}`}</strong>
        </div>
        <div className="provider-health-trend">
          <span>7-day health trend</span>
          <div aria-label="Seven day provider availability">
            {(health?.history ?? Array.from({ length: 7 }, (_, index) => ({
              date: String(index), availability: null,
            }))).map((point) => (
              <i
                key={point.date}
                title={`${point.date}: ${point.availability == null ? "No requests" : `${point.availability}% available`}`}
                style={{ height: `${point.availability == null ? 14 : Math.max(28, point.availability)}%` }}
                className={point.availability == null ? "is-empty" : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs">
        <summary className="cursor-pointer text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">View granted scopes</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {connection.scopes.map((scope) => (
            <code key={scope} className="rounded bg-[var(--color-bg-surface)] px-2 py-1 text-[10px] text-[var(--color-fg-muted)]">{scope}</code>
          ))}
        </div>
      </details>
    </GlassCard>
  );
}

export function PlatformsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectOpen, setConnectOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const providerStatusQuery = useOAuthProviderStatus();
  const connectionsQuery = usePlatformConnections({ enabled: true });
  const healthQuery = useProviderHealth({ enabled: true });
  const startOAuth = useStartPlatformOAuth();
  const disconnect = useDisconnectPlatformAccount();
  const setPrimary = useSetPrimaryPlatformAccount();
  const sessionId = searchParams.get("oauth_session");
  const oauthErrorCode = searchParams.get("oauth_error");
  const providers = useMemo(() => providerStatusQuery.data ?? [], [providerStatusQuery.data]);
  const providerNames = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers],
  );

  const clearOAuthParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("oauth_session");
    next.delete("oauth_error");
    next.delete("provider");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const beginOAuth = async (provider: PlatformType, forceConsent = false) => {
    setActionError(null);
    try {
      const result = await startOAuth.mutateAsync({
        provider,
        returnTo: "/platforms",
        forceConsent,
      });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setActionError(apiError(error));
    }
  };

  const handleDisconnect = async (connection: PlatformConnection) => {
    const confirmed = window.confirm(`Disconnect ${connection.displayName}?`);
    if (!confirmed) return;
    setActionError(null);
    try {
      await disconnect.mutateAsync(connection.id);
    } catch (error) {
      setActionError(apiError(error));
    }
  };

  const handlePrimary = async (connectionId: string) => {
    setActionError(null);
    try {
      await setPrimary.mutateAsync(connectionId);
    } catch (error) {
      setActionError(apiError(error));
    }
  };

  const connections = connectionsQuery.data ?? [];
  const healthByConnection = useMemo(
    () => new Map((healthQuery.data ?? []).map((item) => [item.connectionId, item])),
    [healthQuery.data],
  );
  const busy = startOAuth.isPending || disconnect.isPending || setPrimary.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <div className="premium-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--color-accent)]">
            <ShieldCheck className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Provider-authorized accounts only</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connected accounts</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Connect pages and channels through OAuth, then explicitly choose which accounts this workspace may use.
          </p>
        </div>
        <GlassButton variant="primary" onClick={() => setConnectOpen(true)}>
          <Plus className="size-4" /> Connect account
        </GlassButton>
      </div>

      {oauthErrorCode && (
        <div className="flex items-start justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4" role="alert">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--color-error)]" />
            <div>
              <h2 className="font-semibold">OAuth connection not completed</h2>
              <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{OAUTH_ERRORS[oauthErrorCode] ?? OAUTH_ERRORS["OAUTH_PROVIDER_ERROR"]}</p>
            </div>
          </div>
          <button type="button" onClick={clearOAuthParams} aria-label="Dismiss OAuth error" className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
            <X className="size-4" />
          </button>
        </div>
      )}

      {(actionError || connectionsQuery.error || providerStatusQuery.error) && (
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          {actionError ?? apiError(connectionsQuery.error ?? providerStatusQuery.error)}
        </div>
      )}

      {connectionsQuery.isLoading ? (
        <div className="grid gap-4" role="status" aria-label="Loading connected accounts">
          {[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-glass)]" />)}
        </div>
      ) : connections.length === 0 ? (
        <GlassCard className="premium-empty-state !p-10 text-center" variant="hero" spotlight={false}>
          <span className="premium-logo-shell relative mx-auto grid size-20 place-items-center rounded-[28px] bg-[var(--color-bg-surface)]">
            <Users className="size-9 text-[var(--color-accent)]" />
          </span>
          <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Connection hub</p>
          <h2 className="relative mt-3 text-2xl font-semibold">Bring every account into focus</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--color-fg-muted)]">
            Authenticate directly with each provider, choose the exact pages or channels this workspace may use, and keep every metric traceable to its source.
          </p>
          <GlassButton variant="primary" className="relative mt-6" onClick={() => setConnectOpen(true)}>
            <Link2 className="size-4" /> Start OAuth connection
          </GlassButton>
          <div className="relative mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
            {providers.map((provider) => (
              <span key={provider.id} className="rounded-full border border-[var(--color-border)] bg-[var(--color-glass)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-fg-muted)]">
                {provider.name} · {provider.configured ? "Ready" : "Setup needed"}
              </span>
            ))}
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <ConnectedAccountCard
              key={connection.id}
              connection={connection}
              health={healthByConnection.get(connection.id)}
              providerName={providerNames.get(connection.provider) ?? connection.provider}
              busy={busy}
              onPrimary={() => void handlePrimary(connection.id)}
              onReconnect={() => void beginOAuth(connection.provider, true)}
              onDisconnect={() => void handleDisconnect(connection)}
            />
          ))}
        </div>
      )}

      <ConnectProviderModal
        open={connectOpen}
        providers={providers}
        loading={startOAuth.isPending || providerStatusQuery.isLoading}
        error={actionError}
        onClose={() => setConnectOpen(false)}
        onConnect={(provider) => void beginOAuth(provider)}
      />

      <OAuthAccountPicker
        sessionId={sessionId}
        onClose={clearOAuthParams}
        onConnected={() => {
          clearOAuthParams();
          void connectionsQuery.refetch();
        }}
      />
    </div>
  );
}
