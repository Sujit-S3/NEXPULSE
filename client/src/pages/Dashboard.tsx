import { useEffect, useMemo, useState } from "react";
import { PremiumSelect } from "@components/common";
import { GlassDrawer, GlassFloatingToolbar, GlassSkeleton, GlassTabs } from "@components/enterprise";
import { GlassButton } from "@components/glass/GlassButton";
import { GlassCard } from "@components/glass/GlassCard";
import { AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Download,
  Eye,
  FileBarChart,
  Heart,
  Link2,
  MessageSquareText,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AssistantLogo } from "@/brand";
import { useDashboard } from "../features/core/hooks/useDashboard";
import { usePlatformConnections, useProviderHealth } from "../features/core/hooks/usePlatforms";
import { usePersonalization } from "../features/personalization";
import { useAuth } from "../hooks/useAuth";

function metric(value: number | null, suffix = "") {
  return value === null
    ? "Unavailable"
    : `${new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

const metricItems = [
  { key: "followers", label: "Followers", icon: Users, accent: "#3B82F6" },
  { key: "reach", label: "Total reach", icon: Radio, accent: "#38BDF8" },
  { key: "impressions", label: "Impressions", icon: Eye, accent: "#F59E0B" },
  { key: "engagementRate", label: "Engagement", icon: Heart, accent: "#22C55E", suffix: "%" },
  { key: "views", label: "Video views", icon: Activity, accent: "#06B6D4" },
  { key: "posts", label: "Published", icon: FileBarChart, accent: "#F97316" },
] as const;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function DashboardPage() {
  const { user } = useAuth();
  const { preferences, reorderWidget } = usePersonalization();
  const connections = usePlatformConnections({ enabled: true });
  const providerHealth = useProviderHealth({ enabled: true });
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState<(typeof metricItems)[number]["key"] | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [draggedMetric, setDraggedMetric] = useState<(typeof metricItems)[number]["key"] | null>(null);
  const primaryId = connections.data?.find((connection) => connection.isPrimary)?.id ?? null;

  useEffect(() => {
    if (!connectionId && primaryId) setConnectionId(primaryId);
  }, [connectionId, primaryId]);

  const dashboard = useDashboard(connectionId, { enabled: Boolean(connectionId), days });
  const selected = connections.data?.find((connection) => connection.id === connectionId);
  const selectedHealth = providerHealth.data?.find((item) => item.connectionId === connectionId);
  const accountOptions = [
    { value: "", label: "Choose an analytics account", description: "Select a connected source" },
    ...(connections.data ?? []).map((connection) => ({
      value: connection.id,
      label: connection.displayName,
      description: `${connection.provider}${connection.isPrimary ? " · Primary" : ""}`,
    })),
  ];

  const history = useMemo(
    () => (dashboard.data?.history ?? []).map((point) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    [dashboard.data?.history],
  );

  const orderedMetrics = useMemo(() => {
    const order = new Map(preferences.dashboardWidgetOrder.map((key, index) => [key, index]));
    return [...metricItems].sort(
      (a, b) => (order.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.key) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [preferences.dashboardWidgetOrder]);

  const coverage = dashboard.data
    ? Math.round(((8 - dashboard.data.unavailable.length) / 8) * 100)
    : 0;

  const aiBrief = dashboard.data
    ? dashboard.data.metrics.engagementRate !== null
      ? `${metric(dashboard.data.metrics.engagementRate, "%")} engagement across ${metric(dashboard.data.metrics.followers)} followers is ready for a deeper AI review.`
      : `${coverage}% of the provider signal is available for grounded analysis.`
    : "Connect a source and NEXPULSE AI will turn its live signals into a focused operating brief.";

  const isLoading = connections.isLoading || dashboard.isLoading;
  const hasConnections = Boolean(connections.data?.length);

  const exportHistory = () => {
    if (!history.length || !selected) return;
    const keys = ["date", "followers", "reach", "impressions", "engagement", "views", "posts"] as const;
    const csv = [
      keys.join(","),
      ...history.map((point) => keys.map((key) => JSON.stringify(point[key] ?? "")).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.provider}-${selected.displayName.replace(/\W+/g, "-").toLowerCase()}-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="nexpulse-dashboard w-full pb-10">
      <header className="nexpulse-dashboard-header">
        <div className="min-w-0">
          <div className="nexpulse-kicker">
            <span className="nexpulse-live-dot" aria-hidden="true" />
            Intelligence command center
          </div>
          <h1>
            Good {greeting()}{user?.firstName ? `, ${user.firstName}` : ""}.
          </h1>
          <p>Read the full pulse of your social ecosystem from one continuous AI workspace.</p>
        </div>

        <div className="nexpulse-dashboard-actions">
          <PremiumSelect
            value={connectionId ?? ""}
            options={accountOptions}
            onChange={(next) => setConnectionId(next || null)}
            ariaLabel="Dashboard analytics account"
            className="w-full sm:w-72"
          />
          <Link to="/platforms" className="premium-primary-button !min-h-11 whitespace-nowrap">
            Manage sources <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      {(connections.error || dashboard.error) && (
        <div className="nexpulse-alert" role="alert">
          <AlertCircle className="size-4" />
          {(dashboard.error as Error | null)?.message ?? "Connected accounts could not be loaded."}
        </div>
      )}

      <GlassCard
        className="nexpulse-os-workspace !p-0"
        variant="hero"
        size="none"
        spotlight
      >
        <div className="nexpulse-os-reflection" aria-hidden="true" />

        <section className="nexpulse-os-hero">
          <div className="nexpulse-os-intro">
            <div className="nexpulse-section-label">
              <Zap className="size-3.5" />
              Live operating pulse
            </div>
            <h2>Your audience.<br /><span>One intelligent pulse.</span></h2>
            <p>
              Every provider signal, distilled into a calm workspace built for faster, better decisions.
            </p>
            <div className="nexpulse-status-row">
              <span><i className={hasConnections ? "is-online" : ""} />{hasConnections ? `${connections.data?.length} sources connected` : "Awaiting first source"}</span>
              <span><ShieldCheck className="size-3.5" />Provider-aware</span>
            </div>
          </div>

          <div className="nexpulse-logo-stage" aria-label="NEXPULSE AI">
            <div className="nexpulse-light-rays" aria-hidden="true" />
            <div className="nexpulse-glass-sphere sphere-one" aria-hidden="true" />
            <div className="nexpulse-glass-sphere sphere-two" aria-hidden="true" />
            <div className="nexpulse-glass-sphere sphere-three" aria-hidden="true" />
            <div className="nexpulse-logo-halo" aria-hidden="true" />
            <img src={AssistantLogo} alt="NEXPULSE AI speech-bubble logo" />
            <div className="nexpulse-logo-floor" aria-hidden="true" />
          </div>

          <aside className="nexpulse-ai-brief" aria-label="NEXPULSE AI brief">
            <div className="nexpulse-ai-brief-heading">
              <span><Bot className="size-4" /></span>
              <div>
                <p>NEXPULSE AI</p>
                <small><i /> Ready to synthesize</small>
              </div>
            </div>
            <p className="nexpulse-ai-brief-copy">{aiBrief}</p>
            <Link to="/ai">
              Open AI studio <ArrowRight className="size-3.5" />
            </Link>
          </aside>
        </section>

        {isLoading ? (
          <section className="nexpulse-os-loading" role="status" aria-label="Loading command center">
            <GlassSkeleton lines={2} />
            <GlassSkeleton lines={2} />
            <GlassSkeleton lines={2} />
            <span>Calibrating your workspace…</span>
          </section>
        ) : !hasConnections ? (
          <section className="nexpulse-onboarding">
            <div>
              <span className="nexpulse-onboarding-icon"><BarChart3 className="size-6" /></span>
              <p className="nexpulse-section-label">Your data, beautifully focused</p>
              <h2>Connect your first source of truth</h2>
              <p>
                Authorize a provider, choose the accounts you want NEXPULSE to read, and the workspace will form around your signal.
              </p>
              <Link to="/platforms" className="premium-primary-button mt-6">
                <Link2 className="size-4" /> Connect a platform
              </Link>
            </div>
            <ol>
              {[
                { icon: Link2, step: "01", title: "Authorize", copy: "Connect securely through the provider." },
                { icon: ShieldCheck, step: "02", title: "Choose", copy: "Select the accounts NEXPULSE may read." },
                { icon: TrendingUp, step: "03", title: "Decide", copy: "Turn signal into grounded action." },
              ].map((item) => (
                <li key={item.step}>
                  <span>{item.step}</span>
                  <item.icon className="size-4" />
                  <div><strong>{item.title}</strong><small>{item.copy}</small></div>
                </li>
              ))}
            </ol>
          </section>
        ) : !connectionId ? (
          <section className="nexpulse-selection-state">
            <Sparkles className="size-8" />
            <h2>Choose an account above</h2>
            <p>Your selected account determines every signal shown in this workspace.</p>
          </section>
        ) : dashboard.data && selected ? (
          <>
            <section className="nexpulse-metric-grid" aria-label={`${selected.displayName} metrics`}>
              {orderedMetrics.map((item) => {
                const Icon = item.icon;
                const value = dashboard.data.metrics[item.key];
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={`nexpulse-metric ${customizing ? "is-customizing" : ""}`}
                    tabIndex={0}
                    aria-label={`Open ${item.label} details`}
                    draggable={customizing}
                    onDragStart={() => setDraggedMetric(item.key)}
                    onDragOver={(event) => customizing && event.preventDefault()}
                    onDrop={() => {
                      if (draggedMetric) reorderWidget(draggedMetric, item.key);
                      setDraggedMetric(null);
                    }}
                    onClick={() => setSelectedMetric(item.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedMetric(item.key);
                      }
                    }}
                  >
                    <div>
                      <span style={{ color: item.accent, background: `${item.accent}14` }}><Icon className="size-3.5" /></span>
                      <small>{item.label}</small>
                    </div>
                    <strong>{metric(value, "suffix" in item ? item.suffix : "")}</strong>
                    <em>{value === null ? "Not returned" : "Provider reported"}</em>
                    <ArrowRight className="nexpulse-metric-arrow" aria-hidden="true" />
                  </button>
                );
              })}
            </section>

            <section className="nexpulse-signal-workspace">
              <div className="nexpulse-chart-zone">
                <div className="nexpulse-zone-heading">
                  <div>
                    <p className="nexpulse-section-label">Performance signal</p>
                    <h2>Provider history</h2>
                    <span>{selected.displayName} · {selected.provider}</span>
                  </div>
                  <div className="nexpulse-chart-actions">
                    <GlassTabs
                      tabs={[{ id: "7", label: "7D" }, { id: "30", label: "30D" }, { id: "90", label: "90D" }]}
                      value={String(days)}
                      onChange={(value) => setDays(Number(value))}
                      ariaLabel="Chart time range"
                    />
                    <GlassButton variant="secondary" size="sm" onClick={exportHistory} disabled={!history.length}>
                      <Download className="size-3.5" /> Export
                    </GlassButton>
                    <GlassButton variant="secondary" size="sm" onClick={() => void dashboard.refetch()} disabled={dashboard.isFetching}>
                      <RefreshCw className={`size-3.5 ${dashboard.isFetching ? "animate-spin" : ""}`} /> Refresh
                    </GlassButton>
                  </div>
                </div>

                <div className="nexpulse-chart">
                  {history.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashboardReach" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.4} />
                            <stop offset="55%" stopColor="#3B82F6" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
                        <XAxis dataKey="label" tick={{ fill: "var(--color-fg-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "var(--color-fg-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 18,
                            color: "var(--color-fg)",
                            boxShadow: "var(--shadow-lg)",
                            backdropFilter: "blur(32px)",
                          }}
                        />
                        <Area type="monotone" dataKey="reach" stroke="#38BDF8" strokeWidth={2.5} fill="url(#dashboardReach)" connectNulls />
                        <Brush
                          dataKey="label"
                          height={22}
                          stroke="var(--color-accent)"
                          fill="var(--color-glass)"
                          travellerWidth={8}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="nexpulse-chart-empty">
                      <Activity className="size-7" />
                      <strong>History is still forming</strong>
                      <span>Refresh after the provider returns multiple data points.</span>
                    </div>
                  )}
                </div>
              </div>

              <aside className="nexpulse-health-zone">
                <div className="nexpulse-zone-heading">
                  <div>
                    <p className="nexpulse-section-label">Source health</p>
                    <h2>Data coverage</h2>
                  </div>
                  <ShieldCheck className="size-5 text-[var(--color-success)]" />
                </div>
                <div className="nexpulse-coverage" style={{ background: `conic-gradient(var(--color-success) ${coverage}%, var(--color-chart-grid) 0)` }}>
                  <div><strong>{coverage}%</strong><span>available</span></div>
                </div>
                <dl>
                  <div><dt>Connection</dt><dd className="is-success">{selected.status}</dd></div>
                  <div><dt>Availability</dt><dd>{selectedHealth?.availability == null ? "Collecting" : `${selectedHealth.availability.toFixed(2)}%`}</dd></div>
                  <div><dt>Latency</dt><dd>{selectedHealth?.averageLatencyMs == null ? "Collecting" : `${selectedHealth.averageLatencyMs} ms`}</dd></div>
                  <div><dt>Last collected</dt><dd>{new Date(dashboard.data.collectedAt).toLocaleDateString()}</dd></div>
                  <div><dt>Unavailable fields</dt><dd>{dashboard.data.unavailable.length}</dd></div>
                </dl>
              </aside>
            </section>

            <section className="nexpulse-activity-zone">
              <div className="nexpulse-zone-heading">
                <div>
                  <p className="nexpulse-section-label">Content pulse</p>
                  <h2>Recent provider activity</h2>
                </div>
                <Link to="/analytics">Full analytics <ArrowRight className="size-3.5" /></Link>
              </div>

              {dashboard.data.recentPosts.length === 0 ? (
                <div className="nexpulse-activity-empty">
                  <MessageSquareText className="size-5" />
                  <span>No posts were returned for this account and date range.</span>
                </div>
              ) : (
                <div className="nexpulse-activity-list">
                  {dashboard.data.recentPosts.slice(0, 4).map((post, index) => (
                    <article key={post.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{post.content || "Media post"}</p>
                      <small>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Time unavailable"}</small>
                      <strong>{post.metrics.engagement !== undefined ? `${post.metrics.engagement.toLocaleString()} engagements` : "Signal unavailable"}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </GlassCard>

      <AnimatePresence>
        {dashboard.data && (
          <GlassFloatingToolbar label="Dashboard customization" className="dashboard-floating-toolbar">
            <button
              type="button"
              onClick={() => setCustomizing((value) => !value)}
              className={customizing ? "is-active" : undefined}
            >
              <SlidersHorizontal aria-hidden="true" />
              {customizing ? "Finish layout" : "Customize"}
            </button>
            {customizing && <span>Drag metric widgets to reorder</span>}
          </GlassFloatingToolbar>
        )}
      </AnimatePresence>

      <GlassDrawer
        open={Boolean(selectedMetric)}
        onClose={() => setSelectedMetric(null)}
        title={metricItems.find((item) => item.key === selectedMetric)?.label ?? "Metric detail"}
        description={`${selected?.displayName ?? "Selected account"} · ${days}-day provider view`}
      >
        {selectedMetric && dashboard.data && (() => {
          const item = metricItems.find((candidate) => candidate.key === selectedMetric);
          const value = dashboard.data.metrics[selectedMetric];
          if (!item) return null;
          const Icon = item.icon;
          return (
            <div className="metric-drilldown">
              <span style={{ color: item.accent, background: `${item.accent}18` }}><Icon aria-hidden="true" /></span>
              <p>Current provider-reported value</p>
              <strong>{metric(value, "suffix" in item ? item.suffix : "")}</strong>
              <dl>
                <div><dt>Source</dt><dd>{selected?.provider ?? "Unavailable"}</dd></div>
                <div><dt>Coverage window</dt><dd>{days} days</dd></div>
                <div><dt>Data points</dt><dd>{history.length}</dd></div>
                <div><dt>Collection state</dt><dd>{value === null ? "Unavailable" : "Verified"}</dd></div>
              </dl>
              <Link
                to={`/ai?prompt=${encodeURIComponent(`Analyze my ${item.label.toLowerCase()} over the last ${days} days and recommend next actions.`)}`}
                className="premium-primary-button"
              >
                <Bot aria-hidden="true" /> Analyze with NEXPULSE AI
              </Link>
            </div>
          );
        })()}
      </GlassDrawer>
    </div>
  );
}
