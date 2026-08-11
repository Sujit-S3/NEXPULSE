import { useCallback, useMemo, useState } from "react";
import { GlassButton } from "@components/glass/GlassButton";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { OAuthAccountPicker } from "./OAuthAccountPicker";
import {
  useDisconnectPlatformAccount,
  useOAuthProviders,
  usePlatformConnections,
  useSetPrimaryPlatformAccount,
  useStartPlatformOAuth,
} from "../../features/core/hooks/usePlatforms";
import type { PlatformConnection, PlatformType } from "../../types";

function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "The connected-account request failed";
}

const callbackErrors: Record<string, string> = {
  OAUTH_DENIED: "Authorization was cancelled. Your current connection was not changed.",
  OAUTH_SESSION_EXPIRED: "The authorization session expired. Reconnect to try again.",
  OAUTH_PERMISSIONS_MISSING: "The required provider permissions were not granted.",
  OAUTH_RATE_LIMITED: "The provider rate limit was reached. Try again later.",
  OAUTH_NETWORK_ERROR: "The provider could not be reached.",
  OAUTH_PROVIDER_ERROR: "The provider could not complete authorization.",
};

export function ConnectedAccountsSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { data: connections = [], isLoading, refetch } = usePlatformConnections({ enabled: true });
  const providersQuery = useOAuthProviders();
  const startOAuth = useStartPlatformOAuth();
  const disconnect = useDisconnectPlatformAccount();
  const setPrimary = useSetPrimaryPlatformAccount();
  const sessionId = searchParams.get("oauth_session");
  const callbackError = searchParams.get("oauth_error");
  const providerNames = useMemo(
    () => new Map((providersQuery.data ?? []).map((provider) => [provider.id, provider.name])),
    [providersQuery.data],
  );

  const clearOAuthParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("oauth_session");
    next.delete("oauth_error");
    next.delete("provider");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const reauthorize = async (provider: PlatformType) => {
    setError(null);
    try {
      const result = await startOAuth.mutateAsync({
        provider,
        returnTo: "/settings",
        forceConsent: true,
      });
      window.location.assign(result.authorizationUrl);
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const makePrimary = async (connectionId: string) => {
    setError(null);
    try {
      await setPrimary.mutateAsync(connectionId);
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const remove = async (connection: PlatformConnection) => {
    if (!window.confirm(`Disconnect ${connection.displayName}?`)) return;
    setError(null);
    try {
      await disconnect.mutateAsync(connection.id);
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const busy = startOAuth.isPending || disconnect.isPending || setPrimary.isPending;

  return (
    <section className="rounded-[var(--radius-2xl)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-5 shadow-[var(--shadow-lg)] backdrop-blur-[var(--glass-blur-md)]" aria-labelledby="connected-accounts-settings-title">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
          <ShieldCheck className="size-4" />
        </div>
        <div>
          <h2 id="connected-accounts-settings-title" className="font-semibold">Connected Accounts</h2>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">Manage primary accounts, provider permissions, and disconnections.</p>
        </div>
      </div>

      {(error || callbackError) && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm" role="alert">
          <span className="flex gap-2 text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error ?? callbackErrors[callbackError ?? ""] ?? callbackErrors["OAUTH_PROVIDER_ERROR"]}
          </span>
          {callbackError && <button type="button" onClick={clearOAuthParams} aria-label="Dismiss OAuth error"><X className="size-4" /></button>}
        </div>
      )}

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)]" role="status" />
      ) : connections.length === 0 ? (
        <p className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-fg-muted)]">
          No provider accounts are connected to this workspace.
        </p>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <article key={connection.id} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]">
                  {connection.avatar ? (
                    <img src={connection.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserRound className="size-4 text-[var(--color-fg-subtle)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{connection.displayName}</p>
                    {connection.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-muted)] px-2 py-0.5 text-[10px] text-[var(--color-accent)]"><Star className="size-3" /> Primary</span>}
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-success)]"><CheckCircle2 className="size-3" /> {connection.status}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                    {providerNames.get(connection.provider) ?? connection.provider}
                    {connection.username ? ` · @${connection.username.replace(/^@/, "")}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                {!connection.isPrimary && (
                  <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => void makePrimary(connection.id)}>
                    <Star className="size-3.5" /> Switch account
                  </GlassButton>
                )}
                <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => void reauthorize(connection.provider)}>
                  <RefreshCw className="size-3.5" /> Reconnect
                </GlassButton>
                <GlassButton variant="secondary" size="sm" disabled={busy} onClick={() => void reauthorize(connection.provider)}>
                  <KeyRound className="size-3.5" /> Refresh permissions
                </GlassButton>
                <GlassButton variant="ghost" size="sm" disabled={busy} onClick={() => void remove(connection)}>
                  <Trash2 className="size-3.5 text-[var(--color-error)]" />
                  <span className="text-[var(--color-error)]">Disconnect</span>
                </GlassButton>
              </div>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-[var(--color-fg-muted)]">View scopes</summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {connection.scopes.map((scope) => <code key={scope} className="rounded bg-[var(--color-bg)] px-2 py-1 text-[10px]">{scope}</code>)}
                </div>
              </details>
            </article>
          ))}
        </div>
      )}

      <OAuthAccountPicker
        sessionId={sessionId}
        onClose={clearOAuthParams}
        onConnected={() => {
          clearOAuthParams();
          void refetch();
        }}
      />
    </section>
  );
}
