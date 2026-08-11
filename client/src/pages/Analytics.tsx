import { useEffect, useMemo, useState } from "react";
import { PremiumSelect } from "@components/common";
import { GlassCard } from "@components/glass/GlassCard";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Eye,
  Heart,
  Layers3,
  MessageSquareText,
  Radio,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalytics } from "../features/core/hooks/useAnalytics";
import { usePlatformConnections } from "../features/core/hooks/usePlatforms";

function value(number: number | null, suffix = "") {
  return number === null
    ? "Unavailable"
    : `${new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(number)}${suffix}`;
}

const metricDefinitions = [
  { key: "followers", label: "Followers", icon: Users, color: "#3B82F6" },
  { key: "reach", label: "Reach", icon: Radio, color: "#3B82F6" },
  { key: "impressions", label: "Impressions", icon: Layers3, color: "#F59E0B" },
  { key: "engagementRate", label: "Engagement rate", icon: Heart, color: "#22C55E", suffix: "%" },
  { key: "engagement", label: "Engagements", icon: Activity, color: "#10B981" },
  { key: "views", label: "Views", icon: Eye, color: "#06B6D4" },
  { key: "posts", label: "Posts", icon: MessageSquareText, color: "#F97316" },
  { key: "following", label: "Following", icon: TrendingUp, color: "#6366F1" },
] as const;

export function AnalyticsPage() {
  const connections = usePlatformConnections({ enabled: true });
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [compare, setCompare] = useState(false);
  const primaryId = connections.data?.find((connection) => connection.isPrimary)?.id ?? null;

  useEffect(() => {
    if (!connectionId && primaryId) setConnectionId(primaryId);
  }, [connectionId, primaryId]);

  const analytics = useAnalytics(connectionId, { days, compare });
  const current = analytics.data?.pages[0];
  const previous = analytics.comparison.data;
  const posts = analytics.data?.pages.flatMap((page) => page.posts) ?? [];

  const chartData = useMemo(
    () => (current?.history ?? []).map((point) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    [current?.history],
  );

  function comparison(metric: keyof NonNullable<typeof current>["metrics"]) {
    const currentValue = current?.metrics[metric];
    const previousValue = previous?.metrics[metric];
    if (!compare || currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) return null;
    if (previousValue === 0) return currentValue === 0 ? "0%" : "New";
    const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  }

  const accountOptions = [
    { value: "", label: "Choose an analytics account" },
    ...(connections.data ?? []).map((connection) => ({
      value: connection.id,
      label: connection.displayName,
      description: `${connection.provider}${connection.isPrimary ? " · Primary" : ""}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-14">
      <header className="premium-page-header flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[var(--color-accent)]">
            <BarChart3 className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Performance intelligence</span>
          </div>
          <h1>Analytics, without the noise.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
            Traceable, connection-scoped performance data with clear availability and period-over-period context.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[260px_150px_auto_auto]">
          <PremiumSelect
            value={connectionId ?? ""}
            onChange={(next) => setConnectionId(next || null)}
            options={accountOptions}
            ariaLabel="Analytics account"
          />
          <PremiumSelect
            value={String(days)}
            onChange={(next) => setDays(Number(next))}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
            ariaLabel="Analytics range"
          />
          <button
            type="button"
            aria-pressed={compare}
            onClick={() => setCompare((currentValue) => !currentValue)}
            disabled={!connectionId}
            className={`h-11 rounded-[var(--radius-lg)] border px-4 text-xs font-semibold transition-colors disabled:opacity-45 ${
              compare
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-glass)] text-[var(--color-fg-muted)]"
            }`}
          >
            {compare ? "Comparing" : "Compare"}
          </button>
          <button
            type="button"
            onClick={() => void analytics.refreshFromProvider()}
            disabled={!connectionId || analytics.isFetching}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-glass)] px-4 text-xs font-semibold disabled:opacity-45"
          >
            <RefreshCw className={`size-4 ${analytics.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {!connections.isLoading && !connections.data?.length && (
        <GlassCard className="premium-empty-state grid place-items-center !p-10 text-center" variant="hero" spotlight={false}>
          <div className="relative max-w-xl">
            <span className="premium-logo-shell mx-auto grid size-20 place-items-center rounded-[28px] bg-[var(--color-bg-surface)]">
              <BarChart3 className="size-9 text-[var(--color-accent)]" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">Your analytics need a source</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">
              Connect and explicitly select a provider account before loading performance metrics.
            </p>
            <Link to="/platforms" className="premium-primary-button mt-6">Connect an account <ArrowUpRight className="size-4" /></Link>
          </div>
        </GlassCard>
      )}

      {(analytics.error || analytics.comparison.error) && (
        <div role="alert" className="flex gap-2 rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">
          <AlertCircle className="size-4" />
          {((analytics.error ?? analytics.comparison.error) as Error).message}
        </div>
      )}

      {analytics.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <div key={item} className="h-40 animate-pulse rounded-[var(--radius-2xl)] bg-[var(--color-glass)]" />)}
        </div>
      )}

      {current && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Analytics metrics">
            {metricDefinitions.map((item) => {
              const Icon = item.icon;
              const displayed = value(current.metrics[item.key], "suffix" in item ? item.suffix : "");
              const delta = comparison(item.key);
              return (
                <GlassCard key={item.key} className="premium-metric-card !p-5" spotlight={false}>
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">{item.label}</p>
                    <span className="grid size-9 place-items-center rounded-2xl" style={{ color: item.color, background: `${item.color}16` }}>
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <p className="mt-5 text-2xl font-bold tracking-[-0.04em]">{displayed}</p>
                  <p className={`mt-2 text-[10px] ${delta ? "text-[var(--color-success)]" : "text-[var(--color-fg-subtle)]"}`}>
                    {delta ? `${delta} vs previous period` : current.metrics[item.key] === null ? "Not returned by provider" : `${days}-day window`}
                  </p>
                </GlassCard>
              );
            })}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
            <GlassCard className="!p-5 md:!p-6" spotlight={false}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">Trend lines</p>
                <h2 className="mt-2 text-lg font-semibold">Performance overview</h2>
              </div>
              <div className="mt-6 h-[360px]">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.34} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="label" tick={{ fill: "var(--color-fg-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--color-fg-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: 14, color: "var(--color-fg)", boxShadow: "var(--shadow-lg)" }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-fg-muted)" }} />
                      <Area type="monotone" dataKey="reach" name="Reach" stroke="#38BDF8" strokeWidth={2.3} fill="url(#reachGradient)" connectNulls />
                      <Area type="monotone" dataKey="engagement" name="Engagement" stroke="#10B981" strokeWidth={2.3} fill="url(#engagementGradient)" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] text-center">
                    <div>
                      <Activity className="mx-auto size-8 text-[var(--color-fg-subtle)]" />
                      <p className="mt-3 text-sm font-medium">Historical series unavailable</p>
                      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">The selected provider has not returned enough data points.</p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="!p-5 md:!p-6" spotlight={false}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">Audience signal</p>
              <h2 className="mt-2 text-lg font-semibold">Top dimensions</h2>
              {!current.audience ? (
                <div className="mt-8 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-8 text-center">
                  <Users className="mx-auto size-8 text-[var(--color-fg-subtle)]" />
                  <p className="mt-3 text-sm leading-6 text-[var(--color-fg-muted)]">Audience dimensions are unavailable from this provider or permission set.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {[
                    ["Countries", current.audience.countries],
                    ["Cities", current.audience.cities],
                    ["Age", current.audience.age],
                    ["Gender", current.audience.gender],
                  ].map(([label, entries]) => {
                    const values = (entries as { name: string; value: number }[] | undefined)?.slice(0, 4) ?? [];
                    const max = Math.max(...values.map((entry) => entry.value), 1);
                    return (
                      <div key={label as string}>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">{label as string}</h3>
                        <div className="mt-3 space-y-2.5">
                          {values.length ? values.map((entry) => (
                            <div key={entry.name}>
                              <div className="flex justify-between text-xs"><span>{entry.name}</span><span className="text-[var(--color-fg-muted)]">{entry.value.toLocaleString()}</span></div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(6, (entry.value / max) * 100)}%` }} />
                              </div>
                            </div>
                          )) : <p className="text-xs text-[var(--color-fg-subtle)]">Unavailable</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          <GlassCard className="!p-5 md:!p-6" spotlight={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">Content performance</p>
                <h2 className="mt-2 text-lg font-semibold">Recent provider posts</h2>
              </div>
              <span className="text-xs text-[var(--color-fg-subtle)]">{posts.length} returned</span>
            </div>
            {posts.length === 0 ? (
              <div className="mt-5 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-8 text-center">
                <MessageSquareText className="mx-auto size-7 text-[var(--color-fg-subtle)]" />
                <p className="mt-3 text-sm text-[var(--color-fg-muted)]">No posts were returned for this range.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {posts.map((post) => (
                  <article key={post.id} className="premium-panel p-4">
                    <p className="line-clamp-3 text-sm leading-6">{post.content || "Provider post"}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[var(--color-fg-subtle)]">
                      <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Time unavailable"}</span>
                      {post.metrics.reach !== undefined && <span>{post.metrics.reach.toLocaleString()} reach</span>}
                      {post.metrics.engagement !== undefined && <span>{post.metrics.engagement.toLocaleString()} engagements</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {analytics.hasNextPage && (
              <button type="button" onClick={() => void analytics.fetchNextPage()} disabled={analytics.isFetchingNextPage} className="premium-secondary-button mt-5 !min-h-10 !px-4 disabled:opacity-50">
                {analytics.isFetchingNextPage ? "Loading…" : "Load more posts"}
              </button>
            )}
          </GlassCard>

          {current.unavailable.length > 0 && (
            <p className="text-xs text-[var(--color-fg-subtle)]">Provider-unavailable fields: {current.unavailable.join(", ")}.</p>
          )}
        </>
      )}
    </div>
  );
}
