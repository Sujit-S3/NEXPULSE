import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { GlassButton, GlassCard, GlassInput } from "@components/glass";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@utils";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Archive,
  Check,
  Clipboard,
  FileCheck2,
  Fingerprint,
  Gauge,
  KeyRound,
  LockKeyhole,
  Plus,
  Radar,
  RefreshCw,
  RotateCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Trash2,
} from "lucide-react";
import { useNotificationStore } from "../features/core/store/notificationStore";
import { securityApi } from "../features/security";
import type {
  ComplianceFramework,
  DataAsset,
  ManagedSecret,
  SecurityDashboard,
  SecurityIncident,
  SecurityPolicy,
  ThreatSignal,
} from "../features/security";
import { useAuth } from "../hooks/useAuth";

type Tab = "overview" | "policies" | "secrets" | "governance" | "threats" | "incidents" | "compliance";

const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: "overview", label: "Posture", icon: Gauge },
  { id: "policies", label: "Policies", icon: Fingerprint },
  { id: "secrets", label: "Secrets", icon: KeyRound },
  { id: "governance", label: "Data governance", icon: Archive },
  { id: "threats", label: "Threats", icon: Radar },
  { id: "incidents", label: "Incidents", icon: Siren },
  { id: "compliance", label: "Compliance", icon: FileCheck2 },
];

const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]";

function message(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error?.message ?? error.message;
  return error instanceof Error ? error.message : "The request could not be completed";
}

function dateTime(value?: string): string {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not collected";
}

function Tone({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  const styles = {
    neutral: "border-[var(--color-border)] bg-[var(--color-glass)] text-[var(--color-fg-muted)]",
    success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    danger: "border-[var(--color-error)]/30 bg-[var(--color-error)]/10 text-[var(--color-error)]",
    accent: "border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)] text-[var(--color-accent)]",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[tone])}>{children}</span>;
}

function statusTone(value: string): "neutral" | "success" | "warning" | "danger" | "accent" {
  if (["passing", "active", "enforced", "contained", "resolved"].includes(value)) return "success";
  if (["critical", "failing", "expired", "revoked"].includes(value)) return "danger";
  if (["attention", "rotation_due", "investigating", "open", "high"].includes(value)) return "warning";
  return "neutral";
}

function OneTimeSecret({ value, onDismiss }: { value: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-200">One-time secret value</p>
          <p className="mt-1 text-xs text-amber-100/70">Store this in the consuming runtime now. NEXPULSE cannot display it again.</p>
        </div>
        <div className="flex gap-2">
          <GlassButton type="button" size="xs" variant="secondary" onClick={() => void copy()}>
            {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}{copied ? "Copied" : "Copy"}
          </GlassButton>
          <GlassButton type="button" size="xs" variant="ghost" onClick={onDismiss}>Dismiss</GlassButton>
        </div>
      </div>
      <code className="mt-3 block overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-amber-100">{value}</code>
    </div>
  );
}

function Empty({ icon: Icon, title, detail }: { icon: typeof Shield; title: string; detail: string }) {
  return <div className="flex flex-col items-center px-5 py-12 text-center"><Icon className="size-8 text-[var(--color-fg-subtle)]" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 max-w-md text-xs text-[var(--color-fg-muted)]">{detail}</p></div>;
}

function Overview({ dashboard }: { dashboard?: SecurityDashboard }) {
  const metrics = [
    { label: "Posture score", value: `${dashboard?.postureScore ?? 0}/100`, detail: "Composite security health" },
    { label: "Open threats", value: dashboard?.metrics.openThreats ?? 0, detail: `${dashboard?.metrics.criticalThreats ?? 0} critical` },
    { label: "Active incidents", value: dashboard?.metrics.activeIncidents ?? 0, detail: "Open through contained" },
    { label: "Policy denials", value: dashboard?.metrics.deniedDecisions24h ?? 0, detail: "Last 24 hours" },
  ];
  const controls = dashboard?.compliance.totals;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <GlassCard key={metric.label} size="sm" spotlight={false}><p className="text-xs text-[var(--color-fg-muted)]">{metric.label}</p><p className="mt-2 text-2xl font-bold">{metric.value}</p><p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">{metric.detail}</p></GlassCard>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <GlassCard spotlight={false}>
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[var(--color-success)]" /><h2 className="font-semibold">Control coverage</h2></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[["Enforced policies", dashboard?.metrics.enforcedPolicies ?? 0], ["Managed secrets", dashboard?.metrics.secrets ?? 0], ["Catalogued assets", dashboard?.metrics.assets ?? 0], ["Passing controls", controls?.passing ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[var(--color-border)] p-3"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[var(--color-fg-muted)]">{label}</p></div>)}
          </div>
          {(dashboard?.metrics.rotationDue ?? 0) > 0 && <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{dashboard?.metrics.rotationDue} secret{dashboard?.metrics.rotationDue === 1 ? " is" : "s are"} due for rotation or expired.</div>}
        </GlassCard>
        <GlassCard spotlight={false} size="none">
          <div className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-semibold">Immutable security activity</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Recent workspace-scoped identity, policy, secret, compliance, and response events.</p></div>
          <div className="divide-y divide-[var(--color-border)]">
            {dashboard?.recentEvents.length ? dashboard.recentEvents.map((event) => <div key={event.id} className="flex items-center gap-3 px-5 py-3"><span className={cn("size-2 rounded-full", event.outcome === "success" ? "bg-[var(--color-success)]" : "bg-[var(--color-error)]")} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{event.type}</p><p className="text-[11px] text-[var(--color-fg-muted)]">{event.actorType} · {dateTime(event.createdAt)}</p></div><Tone tone={event.outcome === "success" ? "success" : "danger"}>{event.outcome}</Tone></div>) : <Empty icon={Activity} title="No security activity yet" detail="Identity and control-plane events will appear as the workspace is used." />}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Policies({ policies, onRefresh }: { policies: SecurityPolicy[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<SecurityPolicy["target"]>("access");
  const [effect, setEffect] = useState<SecurityPolicy["effect"]>("allow");
  const [actionPattern, setActionPattern] = useState("security.*");
  const [maxRiskScore, setMaxRiskScore] = useState(70);
  const [requireMfa, setRequireMfa] = useState(false);
  const create = useMutation({
    mutationFn: securityApi.createPolicy,
    onSuccess: () => { setName(""); onRefresh(); addToast({ type: "success", title: "Policy version 1 created" }); },
    onError: (error) => addToast({ type: "error", title: "Policy creation failed", message: message(error) }),
  });
  const update = useMutation({
    mutationFn: ({ policy, status }: { policy: SecurityPolicy; status: SecurityPolicy["status"] }) =>
      securityApi.updatePolicy(policy, { status }, `Changed enforcement status to ${status}`),
    onSuccess: onRefresh,
    onError: (error) => addToast({ type: "error", title: "Policy update failed", message: message(error) }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({
      name,
      target,
      effect,
      actionPattern,
      resourcePattern: "*",
      priority: 100,
      status: "draft",
      conditions: { maxRiskScore, requireMfa },
    });
  };
  return <div className="space-y-5">
    <GlassCard spotlight={false}>
      <h2 className="font-semibold">Create least-privilege policy</h2>
      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">New policies start in draft. Enforce them only after validating their target, priority, and step-up behavior.</p>
      <form className="mt-4 grid gap-4 lg:grid-cols-3" onSubmit={submit}>
        <GlassInput label="Policy name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Target<select className={inputClass} value={target} onChange={(event) => setTarget(event.target.value as SecurityPolicy["target"])}>{["access", "resource", "api", "workspace", "organization", "automation", "ai"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Effect<select className={inputClass} value={effect} onChange={(event) => setEffect(event.target.value as SecurityPolicy["effect"])}><option value="allow">Allow when requirements pass</option><option value="deny">Deny matching requests</option><option value="step_up">Require step-up</option></select></label>
        <GlassInput label="Action pattern" value={actionPattern} onChange={(event) => setActionPattern(event.target.value)} required />
        <GlassInput label="Maximum risk score" type="number" min={0} max={100} value={maxRiskScore} onChange={(event) => setMaxRiskScore(Number(event.target.value))} required />
        <label className="flex items-center gap-3 self-end rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"><input type="checkbox" checked={requireMfa} onChange={(event) => setRequireMfa(event.target.checked)} className="size-4 accent-[var(--color-accent)]" />Require MFA verification</label>
        <div className="lg:col-span-3"><GlassButton type="submit" loading={create.isPending}><Plus className="size-4" />Create draft policy</GlassButton></div>
      </form>
    </GlassCard>
    <div className="grid gap-4 lg:grid-cols-2">
      {policies.length ? policies.map((policy) => <GlassCard key={policy.id} size="sm" spotlight={false}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{policy.name}</h3><p className="mt-1 text-xs text-[var(--color-fg-muted)]">{policy.target} · priority {policy.priority} · version {policy.version}</p></div><Tone tone={statusTone(policy.status)}>{policy.status}</Tone></div>
        <code className="mt-3 block rounded-lg bg-black/20 p-3 text-xs"><span className="text-[var(--color-accent)]">{policy.effect}</span> {policy.actionPattern} on {policy.resourcePattern}</code>
        <div className="mt-3 flex flex-wrap gap-2">{policy.conditions.requireMfa && <Tone tone="accent">MFA required</Tone>}{policy.conditions.maxRiskScore !== undefined && <Tone>risk ≤ {policy.conditions.maxRiskScore}</Tone>}</div>
        <div className="mt-4 flex gap-2">{policy.status !== "enforced" && <GlassButton type="button" size="xs" variant="primary" loading={update.isPending} onClick={() => update.mutate({ policy, status: "enforced" })}><ShieldCheck className="size-3.5" />Enforce</GlassButton>}{policy.status === "enforced" && <GlassButton type="button" size="xs" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ policy, status: "disabled" })}>Disable</GlassButton>}</div>
      </GlassCard>) : <div className="lg:col-span-2"><GlassCard size="none" spotlight={false}><Empty icon={Fingerprint} title="No security policies" detail="Create a draft policy, validate its scope, then promote it to enforcement." /></GlassCard></div>}
    </div>
  </div>;
}

function Secrets({ secrets, onRefresh }: { secrets: ManagedSecret[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scope, setScope] = useState<ManagedSecret["scope"]>("integration");
  const [generated, setGenerated] = useState<string>();
  const create = useMutation({
    mutationFn: securityApi.createSecret,
    onSuccess: (result) => { setName(""); setPurpose(""); setGenerated(result.generatedValue); onRefresh(); addToast({ type: "success", title: "Secret encrypted and versioned" }); },
    onError: (error) => addToast({ type: "error", title: "Secret creation failed", message: message(error) }),
  });
  const rotate = useMutation({
    mutationFn: securityApi.rotateSecret,
    onSuccess: (result) => { setGenerated(result.generatedValue); onRefresh(); addToast({ type: "success", title: "Secret rotated" }); },
    onError: (error) => addToast({ type: "error", title: "Rotation failed", message: message(error) }),
  });
  const revoke = useMutation({
    mutationFn: securityApi.revokeSecret,
    onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Secret revoked" }); },
    onError: (error) => addToast({ type: "error", title: "Revocation failed", message: message(error) }),
  });
  return <div className="space-y-5">
    {generated && <OneTimeSecret value={generated} onDismiss={() => setGenerated(undefined)} />}
    <GlassCard spotlight={false}>
      <h2 className="font-semibold">Create managed secret</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">The platform generates a high-entropy value, encrypts it with AES-256-GCM, and returns it exactly once.</p>
      <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.5fr_1fr_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); create.mutate({ name, purpose, scope, rotateEveryDays: 90 }); }}>
        <GlassInput label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <GlassInput label="Purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} required minLength={4} />
        <label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Scope<select className={inputClass} value={scope} onChange={(event) => setScope(event.target.value as ManagedSecret["scope"])}>{["workspace", "integration", "automation", "ai_provider"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <GlassButton type="submit" loading={create.isPending}><Plus className="size-4" />Generate</GlassButton>
      </form>
    </GlassCard>
    <GlassCard size="none" spotlight={false}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]"><tr><th className="px-5 py-3 font-medium">Secret</th><th className="px-5 py-3 font-medium">Scope</th><th className="px-5 py-3 font-medium">Version</th><th className="px-5 py-3 font-medium">Rotation due</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{secrets.map((secret) => <tr key={secret.id}><td className="px-5 py-4"><p className="font-medium">{secret.name}</p><p className="mt-1 max-w-xs truncate text-xs text-[var(--color-fg-muted)]">{secret.purpose}</p></td><td className="px-5 py-4">{secret.scope}</td><td className="px-5 py-4 font-mono">v{secret.currentVersion}</td><td className="px-5 py-4 text-xs">{dateTime(secret.rotationDueAt)}</td><td className="px-5 py-4"><Tone tone={statusTone(secret.status)}>{secret.status}</Tone></td><td className="px-5 py-4"><div className="flex gap-1"><GlassButton type="button" size="xs" variant="ghost" disabled={secret.status === "revoked"} loading={rotate.isPending} onClick={() => rotate.mutate(secret.id)}><RotateCw className="size-3.5" />Rotate</GlassButton><GlassButton type="button" size="xs" variant="ghost" disabled={secret.status === "revoked"} loading={revoke.isPending} onClick={() => revoke.mutate(secret.id)}><Trash2 className="size-3.5" /></GlassButton></div></td></tr>)}</tbody></table>{secrets.length === 0 && <Empty icon={LockKeyhole} title="No managed secrets" detail="Generate a versioned secret for an integration, automation, AI provider, or workspace runtime." />}</div></GlassCard>
  </div>;
}

function Governance({ assets, onRefresh }: { assets: DataAsset[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [name, setName] = useState("");
  const [system, setSystem] = useState("");
  const [classification, setClassification] = useState<DataAsset["classification"]>("internal");
  const [retentionDays, setRetentionDays] = useState(365);
  const create = useMutation({
    mutationFn: securityApi.createAsset,
    onSuccess: () => { setName(""); setSystem(""); onRefresh(); addToast({ type: "success", title: "Data asset catalogued" }); },
    onError: (error) => addToast({ type: "error", title: "Catalog update failed", message: message(error) }),
  });
  const queueDeletion = useMutation({
    mutationFn: securityApi.queueAssetDeletion,
    onSuccess: onRefresh,
    onError: (error) => addToast({ type: "error", title: "Deletion could not be queued", message: message(error) }),
  });
  return <div className="space-y-5">
    <GlassCard spotlight={false}><h2 className="font-semibold">Catalogue governed data</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Register ownership, classification, retention, residency, and lifecycle state for data handled by NEXPULSE.</p><form className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_0.7fr_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); create.mutate({ name, system, classification, categories: [], retentionDays, legalHold: false }); }}><GlassInput label="Asset name" value={name} onChange={(event) => setName(event.target.value)} required /><GlassInput label="System" value={system} onChange={(event) => setSystem(event.target.value)} required /><label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Classification<select className={inputClass} value={classification} onChange={(event) => setClassification(event.target.value as DataAsset["classification"])}>{["public", "internal", "confidential", "restricted"].map((value) => <option key={value}>{value}</option>)}</select></label><GlassInput label="Retention days" type="number" min={1} max={3650} value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))} /><GlassButton type="submit" loading={create.isPending}><Plus className="size-4" />Catalogue</GlassButton></form></GlassCard>
    <div className="grid gap-4 lg:grid-cols-2">{assets.length ? assets.map((asset) => <GlassCard key={asset.id} size="sm" spotlight={false}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{asset.name}</h3><p className="mt-1 text-xs text-[var(--color-fg-muted)]">{asset.system} · {asset.retentionDays} day retention</p></div><Tone tone={asset.classification === "restricted" ? "danger" : asset.classification === "confidential" ? "warning" : "neutral"}>{asset.classification}</Tone></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><Tone tone={statusTone(asset.lifecycleStatus)}>{asset.lifecycleStatus}</Tone>{asset.legalHold && <Tone tone="warning">legal hold</Tone>}</div>{!asset.legalHold && asset.lifecycleStatus === "active" && <GlassButton type="button" size="xs" variant="ghost" loading={queueDeletion.isPending} onClick={() => queueDeletion.mutate(asset.id)}><Trash2 className="size-3.5" />Queue deletion</GlassButton>}</div></GlassCard>) : <div className="lg:col-span-2"><GlassCard size="none" spotlight={false}><Empty icon={Archive} title="Data catalogue is empty" detail="Register operational, analytics, identity, AI, and integration data assets with ownership and retention." /></GlassCard></div>}</div>
  </div>;
}

function Threats({ threats, onRefresh }: { threats: ThreatSignal[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const evaluate = useMutation({ mutationFn: securityApi.evaluateThreats, onSuccess: (result) => { onRefresh(); addToast({ type: "success", title: "Threat rules evaluated", message: `${result.detections} candidate detections processed` }); }, onError: (error) => addToast({ type: "error", title: "Evaluation failed", message: message(error) }) });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: "investigating" | "contained" | "dismissed" }) => securityApi.updateThreat(id, status), onSuccess: onRefresh, onError: (error) => addToast({ type: "error", title: "Threat update failed", message: message(error) }) });
  return <div className="space-y-5"><GlassCard spotlight={false}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Detection pipeline</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Rules correlate authentication failures, credential replay, and privilege-boundary probing from the immutable event stream.</p></div><GlassButton type="button" size="sm" variant="secondary" loading={evaluate.isPending} onClick={() => evaluate.mutate()}><Radar className="size-4" />Evaluate now</GlassButton></div></GlassCard><div className="space-y-3">{threats.length ? threats.map((threat) => <GlassCard key={threat.id} size="sm" spotlight={false}><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex items-start gap-3"><div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", threat.severity === "critical" ? "bg-[var(--color-error)]/10 text-[var(--color-error)]" : "bg-amber-400/10 text-amber-300")}><ShieldAlert className="size-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{threat.title}</h3><Tone tone={statusTone(threat.severity)}>{threat.severity}</Tone><Tone tone={statusTone(threat.status)}>{threat.status}</Tone></div><p className="mt-1 max-w-3xl text-xs text-[var(--color-fg-muted)]">{threat.summary}</p><p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">Rule {threat.ruleId} · confidence {threat.score}/100 · last seen {dateTime(threat.lastSeenAt)}</p></div></div><div className="flex shrink-0 gap-2">{threat.status === "open" && <GlassButton type="button" size="xs" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: threat.id, status: "investigating" })}>Investigate</GlassButton>}{!["contained", "dismissed"].includes(threat.status) && <GlassButton type="button" size="xs" variant="ghost" loading={update.isPending} onClick={() => update.mutate({ id: threat.id, status: "dismissed" })}>Dismiss</GlassButton>}</div></div></GlassCard>) : <GlassCard size="none" spotlight={false}><Empty icon={ShieldCheck} title="No threat signals" detail="Automated evaluation runs every minute and can also be triggered here for immediate analysis." /></GlassCard>}</div></div>;
}

function Incidents({ incidents, threats, onRefresh }: { incidents: SecurityIncident[]; threats: ThreatSignal[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [severity, setSeverity] = useState<SecurityIncident["severity"]>("high");
  const [signalId, setSignalId] = useState("");
  const create = useMutation({ mutationFn: securityApi.createIncident, onSuccess: () => { setTitle(""); setSummary(""); setSignalId(""); onRefresh(); addToast({ type: "success", title: "Incident opened" }); }, onError: (error) => addToast({ type: "error", title: "Incident creation failed", message: message(error) }) });
  const transition = useMutation({ mutationFn: ({ id, status }: { id: string; status: "investigating" | "contained" | "resolved" | "postmortem" }) => securityApi.transitionIncident(id, status), onSuccess: onRefresh, onError: (error) => addToast({ type: "error", title: "Transition failed", message: message(error) }) });
  const contain = useMutation({ mutationFn: (id: string) => securityApi.containIncident(id, "mark_contained"), onSuccess: onRefresh, onError: (error) => addToast({ type: "error", title: "Containment failed", message: message(error) }) });
  return <div className="space-y-5"><GlassCard spotlight={false}><h2 className="font-semibold">Open response workflow</h2><p className="mt-1 text-xs text-[var(--color-fg-muted)]">Attach a detection when available; every lifecycle transition and containment action is added to the incident timeline.</p><form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate({ title, summary, severity, signalIds: signalId ? [signalId] : [] }); }}><GlassInput label="Incident title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={4} /><label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Severity<select className={inputClass} value={severity} onChange={(event) => setSeverity(event.target.value as SecurityIncident["severity"])}>{["low", "medium", "high", "critical"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)] lg:col-span-2">Summary<textarea className={cn(inputClass, "min-h-20 resize-y")} value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={8} /></label><label className="flex flex-col gap-1.5 text-sm text-[var(--color-fg-muted)]">Related signal<select className={inputClass} value={signalId} onChange={(event) => setSignalId(event.target.value)}><option value="">No linked signal</option>{threats.filter((threat) => !["contained", "dismissed"].includes(threat.status)).map((threat) => <option key={threat.id} value={threat.id}>{threat.title}</option>)}</select></label><div className="self-end"><GlassButton type="submit" loading={create.isPending}><Plus className="size-4" />Open incident</GlassButton></div></form></GlassCard><div className="grid gap-4 xl:grid-cols-2">{incidents.length ? incidents.map((incident) => <GlassCard key={incident.id} size="sm" spotlight={false}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{incident.title}</h3><p className="mt-1 text-xs text-[var(--color-fg-muted)]">{incident.summary}</p></div><Tone tone={statusTone(incident.severity)}>{incident.severity}</Tone></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><Tone tone={statusTone(incident.status)}>{incident.status}</Tone><span className="ml-2 text-[11px] text-[var(--color-fg-subtle)]">{incident.timeline.length} timeline entries</span></div><div className="flex gap-2">{incident.status === "open" && <GlassButton type="button" size="xs" variant="secondary" loading={transition.isPending} onClick={() => transition.mutate({ id: incident.id, status: "investigating" })}>Investigate</GlassButton>}{["open", "investigating"].includes(incident.status) && <GlassButton type="button" size="xs" variant="primary" loading={contain.isPending} onClick={() => contain.mutate(incident.id)}>Mark contained</GlassButton>}{incident.status === "contained" && <GlassButton type="button" size="xs" variant="secondary" loading={transition.isPending} onClick={() => transition.mutate({ id: incident.id, status: "resolved" })}>Resolve</GlassButton>}{incident.status === "resolved" && <GlassButton type="button" size="xs" variant="ghost" loading={transition.isPending} onClick={() => transition.mutate({ id: incident.id, status: "postmortem" })}>Postmortem</GlassButton>}</div></div></GlassCard>) : <div className="xl:col-span-2"><GlassCard size="none" spotlight={false}><Empty icon={ShieldCheck} title="No active incidents" detail="Convert validated threat signals into owned, auditable response workflows." /></GlassCard></div>}</div></div>;
}

function Compliance({ frameworks, onRefresh }: { frameworks: ComplianceFramework[]; onRefresh: () => void }) {
  const addToast = useNotificationStore((state) => state.addToast);
  const collect = useMutation({ mutationFn: securityApi.collectCompliance, onSuccess: () => { onRefresh(); addToast({ type: "success", title: "Evidence snapshot collected" }); }, onError: (error) => addToast({ type: "error", title: "Evidence collection failed", message: message(error) }) });
  return <div className="space-y-5"><GlassCard spotlight={false}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Continuous control evidence</h2><p className="mt-1 max-w-3xl text-xs text-[var(--color-fg-muted)]">Evidence is generated from live policies, immutable audit records, threat monitoring, sessions, and the governed data catalogue. Readiness is not a certification.</p></div><GlassButton type="button" size="sm" variant="secondary" loading={collect.isPending} onClick={() => collect.mutate()}><RefreshCw className="size-4" />Collect evidence</GlassButton></div></GlassCard><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{frameworks.map((framework) => { const score = framework.controls ? Math.round((framework.passing / framework.controls) * 100) : 0; return <GlassCard key={framework.framework} size="sm" spotlight={false}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{framework.framework}</h3><Tone tone={framework.failing ? "danger" : framework.attention ? "warning" : framework.controls ? "success" : "neutral"}>{score}%</Tone></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-hover)]"><div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${score}%` }} /></div><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><dt className="text-[var(--color-fg-muted)]">Passing</dt><dd>{framework.passing}</dd></div><div className="flex justify-between"><dt className="text-[var(--color-fg-muted)]">Attention</dt><dd>{framework.attention}</dd></div><div className="flex justify-between"><dt className="text-[var(--color-fg-muted)]">Failing</dt><dd>{framework.failing}</dd></div></dl><p className="mt-4 text-[10px] text-[var(--color-fg-subtle)]">{dateTime(framework.collectedAt)}</p></GlassCard>; })}</div></div>;
}

export function SecurityPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const permitted = user?.permissions.includes("security.dashboard.read") ?? false;
  const dashboard = useQuery({ queryKey: ["security", "dashboard"], queryFn: securityApi.dashboard, enabled: permitted, refetchInterval: 60_000 });
  const policies = useQuery({ queryKey: ["security", "policies"], queryFn: securityApi.policies, enabled: permitted });
  const secrets = useQuery({ queryKey: ["security", "secrets"], queryFn: securityApi.secrets, enabled: permitted });
  const assets = useQuery({ queryKey: ["security", "assets"], queryFn: securityApi.assets, enabled: permitted });
  const threats = useQuery({ queryKey: ["security", "threats"], queryFn: securityApi.threats, enabled: permitted, refetchInterval: 60_000 });
  const incidents = useQuery({ queryKey: ["security", "incidents"], queryFn: securityApi.incidents, enabled: permitted });
  const compliance = useQuery({ queryKey: ["security", "compliance"], queryFn: securityApi.compliance, enabled: permitted });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["security"] });
  const errors = useMemo(() => [dashboard.error, policies.error, secrets.error, assets.error, threats.error, incidents.error, compliance.error].filter(Boolean), [dashboard.error, policies.error, secrets.error, assets.error, threats.error, incidents.error, compliance.error]);

  if (!permitted) return <Empty icon={ShieldAlert} title="Security administration access required" detail="Ask a workspace owner to grant security dashboard and control-plane permissions." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]"><Shield className="size-4" />Enterprise security</div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Security Admin Center</h1><p className="mt-2 max-w-3xl text-sm text-[var(--color-fg-muted)]">Continuously verify access, govern sensitive data, protect secrets, detect threats, coordinate incident response, and collect compliance evidence.</p></div>
        <div className="flex items-center gap-2"><Tone tone={(dashboard.data?.metrics.criticalThreats ?? 0) > 0 ? "danger" : "success"}>{(dashboard.data?.metrics.criticalThreats ?? 0) > 0 ? "Critical attention" : "Monitoring active"}</Tone><GlassButton type="button" size="sm" variant="secondary" onClick={refresh}><RefreshCw className="size-4" />Refresh</GlassButton></div>
      </header>
      {errors.length > 0 && <div role="alert" className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">{message(errors[0])}</div>}
      <div className="overflow-x-auto border-b border-[var(--color-border)]" role="tablist" aria-label="Security administration sections"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("relative flex items-center gap-2 rounded-t-md px-3 py-3 text-sm font-medium transition", tab === id ? "text-[var(--color-accent)]" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")}><Icon className="size-4" />{label}{tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-accent)]" />}</button>)}</div></div>
      {tab === "overview" && <Overview dashboard={dashboard.data} />}
      {tab === "policies" && <Policies policies={policies.data ?? []} onRefresh={refresh} />}
      {tab === "secrets" && <Secrets secrets={secrets.data ?? []} onRefresh={refresh} />}
      {tab === "governance" && <Governance assets={assets.data ?? []} onRefresh={refresh} />}
      {tab === "threats" && <Threats threats={threats.data ?? []} onRefresh={refresh} />}
      {tab === "incidents" && <Incidents incidents={incidents.data ?? []} threats={threats.data ?? []} onRefresh={refresh} />}
      {tab === "compliance" && <Compliance frameworks={compliance.data ?? []} onRefresh={refresh} />}
    </div>
  );
}
