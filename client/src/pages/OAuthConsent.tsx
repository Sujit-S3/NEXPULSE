import { useMemo } from "react";
import { BrandLogo } from "@components/common";
import { GlassButton, GlassCard } from "@components/glass";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AlertTriangle, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { developerApi } from "../features/developer";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error?.message ?? error.message;
  return error instanceof Error ? error.message : "The authorization request is invalid";
}

export function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const request = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const required = ["client_id", "redirect_uri", "response_type", "scope", "state", "code_challenge", "code_challenge_method"];
  const complete = required.every((name) => Boolean(request[name]));
  const consent = useQuery({
    queryKey: ["oauth-consent", request],
    queryFn: () => developerApi.oauthConsent(request),
    enabled: complete,
    retry: false,
  });
  const authorize = useMutation({
    mutationFn: developerApi.authorize,
    onSuccess: (result) => window.location.assign(result.redirectTo),
  });

  const deny = () => {
    if (!consent.data) return;
    const redirect = new URL(request["redirect_uri"] as string);
    redirect.searchParams.set("error", "access_denied");
    redirect.searchParams.set("error_description", "The resource owner denied the request");
    redirect.searchParams.set("state", consent.data.state);
    window.location.assign(redirect.toString());
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center"><BrandLogo size="md" showText /></div>
        <GlassCard variant="elevated" spotlight={false}>
          {!complete || consent.error ? (
            <div className="text-center" role="alert">
              <AlertTriangle className="mx-auto size-9 text-[var(--color-error)]" />
              <h1 className="mt-4 text-xl font-bold">Authorization request rejected</h1>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{!complete ? "The request is missing required OAuth 2.1 parameters." : errorMessage(consent.error)}</p>
            </div>
          ) : consent.isLoading ? (
            <div className="py-10 text-center text-sm text-[var(--color-fg-muted)]" aria-live="polite">Validating application and scopes…</div>
          ) : consent.data ? (
            <>
              <div className="text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[var(--color-accent-muted)]"><ShieldCheck className="size-6 text-[var(--color-accent)]" /></div><h1 className="mt-4 text-xl font-bold">Authorize {consent.data.application.name}</h1><p className="mt-2 text-sm text-[var(--color-fg-muted)]">This application is requesting access to your active NEXPULSE workspace.</p></div>
              <div className="mt-6 rounded-lg border border-[var(--color-border)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-subtle)]">Requested permissions</p><ul className="mt-3 space-y-2">{consent.data.requestedScopes.map((scope) => <li key={scope} className="flex items-center gap-2 text-sm"><Check className="size-4 text-[var(--color-success)]" /><code>{scope}</code></li>)}</ul></div>
              <p className="mt-4 text-xs text-[var(--color-fg-subtle)]">Access is limited to these scopes and can be revoked from Developer Platform at any time. NEXPULSE requires PKCE S256 and never sends credentials to the redirect URI.</p>
              {authorize.error && <p className="mt-4 text-sm text-[var(--color-error)]" role="alert">{errorMessage(authorize.error)}</p>}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><GlassButton type="button" variant="ghost" onClick={deny}>Deny</GlassButton><GlassButton type="button" loading={authorize.isPending} onClick={() => authorize.mutate({ clientId: request["client_id"] as string, redirectUri: request["redirect_uri"] as string, scopes: consent.data.requestedScopes, state: consent.data.state, codeChallenge: consent.data.codeChallenge, codeChallengeMethod: "S256", approved: true })}>Authorize <ArrowRight className="size-4" /></GlassButton></div>
            </>
          ) : null}
        </GlassCard>
      </div>
    </main>
  );
}
