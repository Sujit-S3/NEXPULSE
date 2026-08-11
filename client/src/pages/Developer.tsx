import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { GlassButton, GlassCard, GlassInput } from "@components/glass";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@utils";
import axios from "axios";
import {
  Activity,
  AppWindow,
  BookOpen,
  Box,
  Check,
  Clipboard,
  Code2,
  ExternalLink,
  Gauge,
  KeyRound,
  PlugZap,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  ShieldCheck,
  Trash2,
  Webhook,
} from "lucide-react";
import { useNotificationStore } from "../features/core/store/notificationStore";
import { developerApi } from "../features/developer";
import type {
  ApiCredential,
  DeveloperApplication,
  DeveloperCatalog,
  MarketplacePlugin,
  PluginInstallation,
  WebhookDelivery,
  WebhookEndpoint,
} from "../features/developer";
import { useAuth } from "../hooks/useAuth";

type Tab = "overview" | "keys" | "apps" | "webhooks" | "marketplace" | "usage" | "docs";

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "keys", label: "API keys", icon: KeyRound },
  { id: "apps", label: "OAuth apps", icon: AppWindow },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "marketplace", label: "Plugins", icon: Box },
  { id: "usage", label: "Usage", icon: Gauge },
  { id: "docs", label: "Docs", icon: BookOpen },
];

const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "The request could not be completed";
}

function dateTime(value?: string): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <GlassButton type="button" size="xs" variant="ghost" onClick={() => void copy()} aria-label={`${label}: ${value}`}>
      {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
      {copied ? "Copied" : label}
    </GlassButton>
  );
}

function OneTimeSecret({ title, value, onDismiss }: { title: string; value: string; onDismiss: () => void }) {
  return (
    <div role="status" className="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-muted)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-fg)]">{title}</p>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">Store this value securely. NEXPULSE will not display it again.</p>
        </div>
        <div className="flex gap-2"><CopyButton value={value} /><GlassButton type="button" size="xs" variant="ghost" onClick={onDismiss}>Dismiss</GlassButton></div>
      </div>
      <code className="mt-3 block overflow-x-auto rounded-md bg-black/25 px-3 py-2 text-xs text-[var(--color-fg)]">{value}</code>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: typeof Activity; title: string; message: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-center">
      <Icon className="size-8 text-[var(--color-fg-subtle)]" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-[var(--color-fg-muted)]">{message}</p>
    </div>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "neutral" }) {
  const styles = {
    success: "bg-[var(--color-success-muted)] text-[var(--color-success)]",
    warning: "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
    danger: "bg-[var(--color-error-muted)] text-[var(--color-error)]",
    neutral: "bg-[var(--color-glass-hover)] text-[var(--color-fg-muted)]",
  };
  return <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide", styles[tone])}>{children}</span>;
}

function Overview({ catalog, applicationCount, webhookCount, installationCount, requests }: {
  catalog?: DeveloperCatalog;
  applicationCount: number;
  webhookCount: number;
  installationCount: number;
  requests: number;
}) {
  const cards = [
    { label: "Developer apps", value: applicationCount, icon: AppWindow, detail: "OAuth 2.1 clients" },
    { label: "Webhook endpoints", value: webhookCount, icon: Webhook, detail: "Signed event targets" },
    { label: "Installed plugins", value: installationCount, icon: PlugZap, detail: "Capability grants" },
    { label: "API requests", value: requests.toLocaleString(), icon: Activity, detail: "Last 30 days" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, detail }) => (
          <GlassCard key={label} size="sm" variant="gradient" spotlight={false}>
            <div className="flex items-start justify-between"><div><p className="text-xs text-[var(--color-fg-muted)]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">{detail}</p></div><Icon className="size-5 text-[var(--color-accent)]" /></div>
          </GlassCard>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard spotlight={false}>
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[var(--color-success)]" /><h2 className="font-semibold">Platform gateway</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["OAuth 2.1 + PKCE", "Hashed API credentials", "Signed webhook delivery", "Workspace-scoped quotas", "Append-only delivery history", "Capability-based plugins"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)]"><Check className="size-4 text-[var(--color-success)]" />{item}</div>
            ))}
          </div>
        </GlassCard>
        <GlassCard spotlight={false}>
          <div className="flex items-center justify-between"><h2 className="font-semibold">API lifecycle</h2><StatusBadge tone="success">{catalog?.lifecycle.current ?? "v1"}</StatusBadge></div>
          <p className="mt-4 text-sm text-[var(--color-fg-muted)]">Additive compatibility within a major version, with a {catalog?.lifecycle.sunsetNoticeDays ?? 180}-day minimum sunset notice for breaking versions.</p>
          <a className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline" href="/api/openapi.json" target="_blank" rel="noreferrer">Open API specification <ExternalLink className="size-3.5" /></a>
        </GlassCard>
      </div>
    </div>
  );
}

function CredentialPanel({ credentials, scopes, onRefresh }: { credentials: ApiCredential[]; scopes: string[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [secret, setSecret] = useState<string>();
  const [name, setName] = useState("");
  const [type, setType] = useState<"api_key" | "personal_access_token">("api_key");
  const [permissions, setPermissions] = useState<string[]>(["analytics.read"]);
  const mutation = useMutation({
    mutationFn: developerApi.createCredential,
    onSuccess: (result) => { setSecret(result.token); setName(""); onRefresh(); addToast({ type: "success", title: "Credential created" }); },
    onError: (error) => addToast({ type: "error", title: "Credential creation failed", message: errorMessage(error) }),
  });
  const revoke = useMutation({
    mutationFn: developerApi.revokeCredential,
    onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Credential revoked" }); },
    onError: (error) => addToast({ type: "error", title: "Credential revocation failed", message: errorMessage(error) }),
  });
  const rotate = useMutation({
    mutationFn: developerApi.rotateCredential,
    onSuccess: (result) => { setSecret(result.token); onRefresh(); addToast({ type: "success", title: "Credential rotated" }); },
    onError: (error) => addToast({ type: "error", title: "Credential rotation failed", message: errorMessage(error) }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ type, name, permissions });
  };
  return (
    <div className="space-y-5">
      {secret && <OneTimeSecret title="New API credential" value={secret} onDismiss={() => setSecret(undefined)} />}
      <GlassCard spotlight={false}>
        <div className="mb-4"><h2 className="font-semibold">Issue credential</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Credentials are workspace-bound, scoped, revocable, and stored only as hashes.</p></div>
        <form className="grid gap-4 lg:grid-cols-[1fr_220px_1.5fr_auto] lg:items-end" onSubmit={submit}>
          <GlassInput label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Analytics production" required minLength={2} />
          <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Type<select className={inputClass} value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="api_key">API key</option><option value="personal_access_token">Personal access token</option></select></label>
          <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Scope<select className={inputClass} value={permissions[0]} onChange={(event) => setPermissions([event.target.value])}>{scopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
          <GlassButton type="submit" loading={mutation.isPending}><Plus className="size-4" />Create</GlassButton>
        </form>
      </GlassCard>
      <GlassCard spotlight={false} size="none">
        <div className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-semibold">Active credentials</h2></div>
        {credentials.length === 0 ? <div className="p-5"><EmptyState icon={KeyRound} title="No API credentials" message="Create a scoped API key or PAT to authenticate server-side clients." /></div> : (
          <div className="divide-y divide-[var(--color-border)]">{credentials.map((credential) => (
            <div key={credential.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{credential.name}</p><StatusBadge>{credential.type === "api_key" ? "API key" : "PAT"}</StatusBadge></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-fg-muted)]"><code>{credential.prefix}••••</code><span>Last used {dateTime(credential.lastUsedAt)}</span><span>{credential.permissions.length} scope{credential.permissions.length === 1 ? "" : "s"}</span></div></div>
              <div className="flex gap-1"><GlassButton type="button" size="xs" variant="ghost" loading={rotate.isPending} onClick={() => rotate.mutate(credential.id)}><RotateCw className="size-3.5" />Rotate</GlassButton><GlassButton type="button" size="xs" variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate(credential.id)}><Trash2 className="size-3.5" />Revoke</GlassButton></div>
            </div>
          ))}</div>
        )}
      </GlassCard>
    </div>
  );
}

function ApplicationPanel({ applications, scopes, onRefresh }: { applications: DeveloperApplication[]; scopes: string[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [secret, setSecret] = useState<string>();
  const [name, setName] = useState("");
  const [redirectUri, setRedirectUri] = useState("https://");
  const [scope, setScope] = useState("analytics.read");
  const [grantType, setGrantType] = useState<"authorization_code" | "client_credentials">("authorization_code");
  const create = useMutation({
    mutationFn: developerApi.createApplication,
    onSuccess: (result) => { setSecret(result.clientSecret); setName(""); onRefresh(); addToast({ type: "success", title: "OAuth application registered" }); },
    onError: (error) => addToast({ type: "error", title: "Application registration failed", message: errorMessage(error) }),
  });
  const rotate = useMutation({
    mutationFn: developerApi.rotateApplicationSecret,
    onSuccess: (result) => { setSecret(result.clientSecret); onRefresh(); addToast({ type: "success", title: "Client secret rotated" }); },
    onError: (error) => addToast({ type: "error", title: "Secret rotation failed", message: errorMessage(error) }),
  });
  const revoke = useMutation({
    mutationFn: developerApi.revokeApplication,
    onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Application revoked" }); },
    onError: (error) => addToast({ type: "error", title: "Application revocation failed", message: errorMessage(error) }),
  });
  return (
    <div className="space-y-5">
      {secret && <OneTimeSecret title="OAuth client secret" value={secret} onDismiss={() => setSecret(undefined)} />}
      <GlassCard spotlight={false}>
        <h2 className="font-semibold">Register OAuth application</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Authorization-code clients require PKCE S256. Machine clients use scoped client credentials.</p>
        <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate({ name, redirectUris: [redirectUri], scopes: [scope], grantTypes: [grantType] }); }}>
          <GlassInput label="Application name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer reporting portal" required minLength={2} />
          <GlassInput label="Redirect URI" type="url" value={redirectUri} onChange={(event) => setRedirectUri(event.target.value)} helperText="Exact-match HTTPS URI; loopback HTTP is allowed for local development." required />
          <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Initial scope<select className={inputClass} value={scope} onChange={(event) => setScope(event.target.value)}>{scopes.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Grant type<select className={inputClass} value={grantType} onChange={(event) => setGrantType(event.target.value as typeof grantType)}><option value="authorization_code">Authorization code + PKCE</option><option value="client_credentials">Client credentials</option></select></label>
          <div className="lg:col-span-2"><GlassButton type="submit" loading={create.isPending}><Plus className="size-4" />Register application</GlassButton></div>
        </form>
      </GlassCard>
      <div className="grid gap-4 xl:grid-cols-2">
        {applications.length === 0 ? <div className="xl:col-span-2"><EmptyState icon={AppWindow} title="No OAuth applications" message="Register a confidential client to start an authorization-code or machine-to-machine flow." /></div> : applications.map((application) => (
          <GlassCard key={application.id} size="sm" spotlight={false}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{application.name}</h3><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Created {dateTime(application.createdAt)}</p></div><StatusBadge tone={application.status === "active" ? "success" : "danger"}>{application.status}</StatusBadge></div>
            <div className="mt-4 rounded-md bg-black/15 p-3"><div className="flex items-center justify-between gap-2"><code className="truncate text-xs">{application.clientId}</code><CopyButton value={application.clientId} label="Client ID" /></div></div>
            <div className="mt-3 flex flex-wrap gap-1.5">{application.scopes.map((value) => <StatusBadge key={value}>{value}</StatusBadge>)}</div>
            <div className="mt-4 flex gap-2"><GlassButton type="button" size="xs" variant="secondary" loading={rotate.isPending} onClick={() => rotate.mutate(application.id)}><RotateCw className="size-3.5" />Rotate secret</GlassButton><GlassButton type="button" size="xs" variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate(application.id)}><Trash2 className="size-3.5" />Revoke</GlassButton></div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function WebhookPanel({ endpoints, deliveries, events, onRefresh }: { endpoints: WebhookEndpoint[]; deliveries: WebhookDelivery[]; events: string[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [secret, setSecret] = useState<string>();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [eventType, setEventType] = useState(events[0] ?? "webhook.test");
  const create = useMutation({ mutationFn: developerApi.createWebhook, onSuccess: (result) => { setSecret(result.signingSecret); setName(""); onRefresh(); addToast({ type: "success", title: "Webhook endpoint created" }); }, onError: (error) => addToast({ type: "error", title: "Webhook registration failed", message: errorMessage(error) }) });
  const test = useMutation({ mutationFn: developerApi.testWebhook, onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Webhook test queued" }); }, onError: (error) => addToast({ type: "error", title: "Webhook test failed", message: errorMessage(error) }) });
  const remove = useMutation({ mutationFn: developerApi.deleteWebhook, onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Webhook disabled" }); }, onError: (error) => addToast({ type: "error", title: "Webhook update failed", message: errorMessage(error) }) });
  const replay = useMutation({ mutationFn: developerApi.replayDelivery, onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Delivery replay queued" }); }, onError: (error) => addToast({ type: "error", title: "Replay failed", message: errorMessage(error) }) });
  return (
    <div className="space-y-5">
      {secret && <OneTimeSecret title="Webhook signing secret" value={secret} onDismiss={() => setSecret(undefined)} />}
      <GlassCard spotlight={false}>
        <h2 className="font-semibold">Register endpoint</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Targets are public-network validated and receive timestamped HMAC-SHA256 signatures.</p>
        <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.5fr_1fr_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); create.mutate({ name, url, events: [eventType] }); }}>
          <GlassInput label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Production events" required minLength={2} />
          <GlassInput label="HTTPS endpoint" type="url" value={url} onChange={(event) => setUrl(event.target.value)} required />
          <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Event<select className={inputClass} value={eventType} onChange={(event) => setEventType(event.target.value)}>{events.map((value) => <option key={value}>{value}</option>)}</select></label>
          <GlassButton type="submit" loading={create.isPending}><Plus className="size-4" />Register</GlassButton>
        </form>
      </GlassCard>
      <div className="grid gap-5 xl:grid-cols-2">
        <GlassCard spotlight={false} size="none"><div className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-semibold">Endpoints</h2></div><div className="divide-y divide-[var(--color-border)]">{endpoints.length === 0 ? <div className="p-5"><EmptyState icon={Webhook} title="No endpoints" message="Register an HTTPS endpoint to receive platform events." /></div> : endpoints.map((endpoint) => <div key={endpoint.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{endpoint.name}</p><p className="mt-1 truncate text-xs text-[var(--color-fg-muted)]">{endpoint.url}</p></div><StatusBadge tone={endpoint.consecutiveFailures > 0 ? "warning" : "success"}>{endpoint.status}</StatusBadge></div><div className="mt-3 flex flex-wrap gap-2"><GlassButton type="button" size="xs" variant="secondary" loading={test.isPending} onClick={() => test.mutate(endpoint.id)}><Send className="size-3.5" />Send test</GlassButton><GlassButton type="button" size="xs" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(endpoint.id)}><Trash2 className="size-3.5" />Disable</GlassButton></div></div>)}</div></GlassCard>
        <GlassCard spotlight={false} size="none"><div className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-semibold">Recent deliveries</h2></div><div className="divide-y divide-[var(--color-border)]">{deliveries.length === 0 ? <div className="p-5"><EmptyState icon={Send} title="No deliveries yet" message="Delivery attempts, retries, and dead letters will appear here." /></div> : deliveries.slice(0, 12).map((delivery) => <div key={delivery.id} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{delivery.eventType}</p><p className="mt-1 text-xs text-[var(--color-fg-muted)]">{dateTime(delivery.createdAt)} · {delivery.attemptCount} attempt{delivery.attemptCount === 1 ? "" : "s"}</p></div><StatusBadge tone={delivery.status === "succeeded" ? "success" : delivery.status === "dead_letter" ? "danger" : "warning"}>{delivery.status}</StatusBadge>{["succeeded", "dead_letter"].includes(delivery.status) && <GlassButton type="button" size="xs" variant="ghost" loading={replay.isPending} onClick={() => replay.mutate(delivery.id)}><RefreshCw className="size-3.5" /></GlassButton>}</div>)}</div></GlassCard>
      </div>
    </div>
  );
}

function MarketplacePanel({ plugins, installations, onRefresh }: { plugins: MarketplacePlugin[]; installations: PluginInstallation[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const install = useMutation({ mutationFn: developerApi.installPlugin, onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Plugin installed" }); }, onError: (error) => addToast({ type: "error", title: "Installation failed", message: errorMessage(error) }) });
  const installed = new Map(installations.map((item) => [item.plugin.id, item]));
  return <div className="space-y-5"><GlassCard spotlight={false}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">Capability-safe marketplace</h2><p className="mt-1 max-w-2xl text-xs text-[var(--color-fg-muted)]">Only reviewed manifests can be installed. Runtime code must be registered as a trusted module, and every contribution is constrained to declared capabilities and granted permissions.</p></div><StatusBadge tone="success">Runtime API v1</StatusBadge></div></GlassCard><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{plugins.length === 0 ? <div className="lg:col-span-2 xl:col-span-3"><EmptyState icon={Box} title="Marketplace awaiting approved plugins" message="Submitted packages remain isolated until platform review, checksum verification, and approval complete." /></div> : plugins.map((plugin) => { const installation = installed.get(plugin.id); return <GlassCard key={plugin.id} size="sm" spotlight={false}><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{plugin.name}</h3><p className="mt-1 text-xs text-[var(--color-fg-muted)]">by {plugin.publisher}</p></div>{installation && <StatusBadge tone="success">Installed</StatusBadge>}</div><p className="mt-3 line-clamp-3 text-sm text-[var(--color-fg-muted)]">{plugin.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{plugin.capabilities.map((capability) => <StatusBadge key={capability}>{capability}</StatusBadge>)}</div><div className="mt-4"><GlassButton type="button" size="sm" variant={installation ? "secondary" : "primary"} disabled={Boolean(installation)} loading={install.isPending} onClick={() => install.mutate(plugin)}>{installation ? <><Check className="size-4" />Installed {installation.version}</> : <><PlugZap className="size-4" />Install reviewed version</>}</GlassButton></div></GlassCard>; })}</div></div>;
}

function UsagePanel({ usage }: { usage?: Awaited<ReturnType<typeof developerApi.usage>> }) {
  const totals = usage?.totals;
  const metrics = [
    { label: "Requests", value: (totals?.requests ?? 0).toLocaleString() },
    { label: "Average latency", value: `${Math.round(totals?.averageLatencyMs ?? 0)} ms` },
    { label: "Error rate", value: `${((totals?.errorRate ?? 0) * 100).toFixed(2)}%` },
    { label: "Rate limited", value: (totals?.rateLimited ?? 0).toLocaleString() },
  ];
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <GlassCard key={metric.label} size="sm" spotlight={false}><p className="text-xs text-[var(--color-fg-muted)]">{metric.label}</p><p className="mt-2 text-2xl font-bold">{metric.value}</p></GlassCard>)}</div><div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><GlassCard spotlight={false} size="none"><div className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-semibold">Top endpoints</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--color-fg-muted)]"><tr><th className="px-5 py-3 font-medium">Endpoint</th><th className="px-5 py-3 font-medium">Requests</th><th className="px-5 py-3 font-medium">Errors</th><th className="px-5 py-3 font-medium">Avg.</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{usage?.endpoints.length ? usage.endpoints.map((endpoint) => <tr key={`${endpoint.method}-${endpoint.endpoint}`}><td className="px-5 py-3"><code className="text-xs"><span className="text-[var(--color-accent)]">{endpoint.method}</span> {endpoint.endpoint}</code></td><td className="px-5 py-3">{endpoint.requests.toLocaleString()}</td><td className="px-5 py-3">{endpoint.errors.toLocaleString()}</td><td className="px-5 py-3">{Math.round(endpoint.averageLatencyMs)} ms</td></tr>) : <tr><td className="px-5 py-8 text-center text-[var(--color-fg-muted)]" colSpan={4}>Authenticated API traffic will be aggregated here by minute.</td></tr>}</tbody></table></div></GlassCard><GlassCard spotlight={false}><h2 className="font-semibold">Quota policy</h2><dl className="mt-4 space-y-3 text-sm">{[["Per minute", usage?.quota.requestsPerMinute], ["Burst / 10 sec", usage?.quota.burstPerTenSeconds], ["Per month", usage?.quota.requestsPerMonth]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-3"><dt className="text-[var(--color-fg-muted)]">{label}</dt><dd className="font-mono font-semibold">{Number(value ?? 0).toLocaleString()}</dd></div>)}</dl></GlassCard></div></div>;
}

function DocsPanel({ catalog }: { catalog?: DeveloperCatalog }) {
  const example = `curl -H "Authorization: Bearer $NEXPULSE_TOKEN" \\\n+  -H "X-NEXPULSE-SDK: curl/1.0" \\\n+  https://api.nexpulse.ai/api/v1/analytics`;
  return <div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><GlassCard spotlight={false}><div className="flex items-center gap-2"><Code2 className="size-5 text-[var(--color-accent)]" /><h2 className="font-semibold">Quick start</h2></div><ol className="mt-4 space-y-3 text-sm text-[var(--color-fg-muted)]"><li><strong className="text-[var(--color-fg)]">1.</strong> Issue a least-privilege API key, PAT, or OAuth token.</li><li><strong className="text-[var(--color-fg)]">2.</strong> Send it as a Bearer token or in the X-API-Key header.</li><li><strong className="text-[var(--color-fg)]">3.</strong> Respect RateLimit headers and retry 429 responses after Retry-After.</li></ol><div className="relative mt-5 rounded-lg bg-black/30 p-4"><CopyButton value={example} /><pre className="mt-2 overflow-x-auto text-xs"><code>{example}</code></pre></div><div className="mt-4 flex flex-wrap gap-2"><a href="/api/openapi.json" target="_blank" rel="noreferrer"><GlassButton type="button" size="sm" variant="secondary"><ExternalLink className="size-4" />OpenAPI 3.1</GlassButton></a></div></GlassCard><GlassCard spotlight={false}><h2 className="font-semibold">Webhook verification</h2><p className="mt-3 text-sm text-[var(--color-fg-muted)]">Compute HMAC-SHA256 over <code className="text-[var(--color-fg)]">timestamp.rawBody</code>, compare it to the v1 value in X-NEXPULSE-Signature using a constant-time comparison, and reject timestamps older than five minutes.</p><h3 className="mt-5 text-sm font-semibold">Published events</h3><div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-2">{catalog?.events.map((event) => <div key={event.type} className="rounded-md border border-[var(--color-border)] p-3"><code className="text-xs text-[var(--color-accent)]">{event.type}</code><p className="mt-1 text-xs text-[var(--color-fg-muted)]">{event.description}</p></div>)}</div></GlassCard></div>;
}

export function DeveloperPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const permitted = user?.permissions.includes("developer.applications.manage") ?? false;
  const catalog = useQuery({ queryKey: ["developer", "catalog"], queryFn: developerApi.catalog, enabled: permitted });
  const applications = useQuery({ queryKey: ["developer", "applications"], queryFn: developerApi.applications, enabled: permitted });
  const credentials = useQuery({ queryKey: ["developer", "credentials"], queryFn: developerApi.credentials, enabled: permitted });
  const webhooks = useQuery({ queryKey: ["developer", "webhooks"], queryFn: developerApi.webhooks, enabled: permitted });
  const deliveries = useQuery({ queryKey: ["developer", "deliveries"], queryFn: developerApi.deliveries, enabled: permitted });
  const usage = useQuery({ queryKey: ["developer", "usage"], queryFn: () => developerApi.usage(30), enabled: permitted, refetchInterval: 60_000 });
  const marketplace = useQuery({ queryKey: ["developer", "marketplace"], queryFn: developerApi.marketplace, enabled: permitted });
  const installations = useQuery({ queryKey: ["developer", "installations"], queryFn: developerApi.installations, enabled: permitted });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["developer"] });
  const scopes = useMemo(() => Object.values(catalog.data?.scopes ?? {}).flat().filter((scope) => user?.permissions.includes(scope)).sort(), [catalog.data, user]);
  const eventTypes = useMemo(() => catalog.data?.events.map((event) => event.type) ?? [], [catalog.data]);

  if (!permitted) return <EmptyState icon={ShieldCheck} title="Developer platform access required" message="Ask a workspace owner to grant developer platform permissions to your role." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]"><Code2 className="size-4" />Developer platform</div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Build on NEXPULSE</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-fg-muted)]">Manage secure credentials, OAuth clients, signed events, plugins, API contracts, and usage from one workspace-scoped control plane.</p></div><div className="flex items-center gap-2"><StatusBadge tone="success">API v1 operational</StatusBadge><GlassButton type="button" size="sm" variant="secondary" onClick={refresh}><RefreshCw className="size-4" />Refresh</GlassButton></div></header>
      <div className="overflow-x-auto border-b border-[var(--color-border)]" role="tablist" aria-label="Developer platform sections"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={cn("relative flex items-center gap-2 rounded-t-md px-3 py-3 text-sm font-medium transition", tab === id ? "text-[var(--color-accent)]" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")} onClick={() => setTab(id)} type="button"><Icon className="size-4" />{label}{tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-accent)]" />}</button>)}</div></div>
      {tab === "overview" && <Overview catalog={catalog.data} applicationCount={applications.data?.length ?? 0} webhookCount={webhooks.data?.length ?? 0} installationCount={installations.data?.length ?? 0} requests={usage.data?.totals.requests ?? 0} />}
      {tab === "keys" && <CredentialPanel credentials={credentials.data ?? []} scopes={scopes} onRefresh={refresh} />}
      {tab === "apps" && <ApplicationPanel applications={applications.data ?? []} scopes={scopes} onRefresh={refresh} />}
      {tab === "webhooks" && <WebhookPanel endpoints={webhooks.data ?? []} deliveries={deliveries.data ?? []} events={eventTypes} onRefresh={refresh} />}
      {tab === "marketplace" && <MarketplacePanel plugins={marketplace.data ?? []} installations={installations.data ?? []} onRefresh={refresh} />}
      {tab === "usage" && <UsagePanel usage={usage.data} />}
      {tab === "docs" && <DocsPanel catalog={catalog.data} />}
    </div>
  );
}
