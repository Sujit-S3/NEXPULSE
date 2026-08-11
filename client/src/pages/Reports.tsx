import { useEffect, useState } from "react";
import { PremiumSelect } from "@components/common";
import { GlassCard } from "@components/glass/GlassCard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBarChart,
  FileText,
  Loader2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { usePlatformConnections } from "../features/core/hooks/usePlatforms";
import { reportApi } from "../features/core/services/api";

function startDate(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

const reportTemplates = [
  { title: "Weekly performance", days: 7, description: "A crisp operating review of the last seven days.", accent: "#3B82F6" },
  { title: "Monthly performance", days: 30, description: "Trend context and provider metrics across thirty days.", accent: "#3B82F6" },
  { title: "Quarterly performance", days: 90, description: "A strategic performance view for leadership planning.", accent: "#F97316" },
];

export function ReportsPage() {
  const queryClient = useQueryClient();
  const connections = usePlatformConnections({ enabled: true });
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const primaryId = connections.data?.find((connection) => connection.isPrimary)?.id ?? null;

  useEffect(() => {
    if (!connectionId && primaryId) setConnectionId(primaryId);
  }, [connectionId, primaryId]);

  const reports = useQuery({
    queryKey: ["reports", connectionId],
    queryFn: () => reportApi.list(connectionId ?? ""),
    enabled: Boolean(connectionId),
  });

  const createReport = useMutation({
    mutationFn: ({ title, days }: { title: string; days: number }) => reportApi.create({
      connectionId: connectionId ?? "",
      title,
      from: startDate(days),
      to: new Date(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports", connectionId] }),
  });

  const exportReport = useMutation({
    mutationFn: async ({ id, format, title }: { id: string; format: "csv" | "pdf"; title: string }) => {
      const blob = await reportApi.export(id, format);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "report"}.${format}`;
      link.click();
      URL.revokeObjectURL(href);
    },
  });

  const accountOptions = [
    { value: "", label: "Choose a report account" },
    ...(connections.data ?? []).map((connection) => ({
      value: connection.id,
      label: connection.displayName,
      description: `${connection.provider}${connection.isPrimary ? " · Primary" : ""}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-14">
      <header className="premium-page-header flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[var(--color-accent)]">
            <Sparkles className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Reports</span>
          </div>
          <h1>Reports that feel board-ready.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
            Create durable snapshots from synchronized provider analytics and export them in presentation-ready formats.
          </p>
        </div>
        <PremiumSelect
          value={connectionId ?? ""}
          onChange={(next) => setConnectionId(next || null)}
          options={accountOptions}
          ariaLabel="Report account"
          className="w-full md:w-80"
        />
      </header>

      {!connections.isLoading && !connections.data?.length && (
        <GlassCard className="premium-empty-state grid place-items-center !p-10 text-center" variant="hero" spotlight={false}>
          <div className="relative max-w-xl">
            <span className="premium-logo-shell mx-auto grid size-20 place-items-center rounded-[28px] bg-[var(--color-bg-surface)]">
              <LockKeyhole className="size-9 text-[var(--color-accent)]" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">Connect data before creating a report</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">
              Reports are built from a selected provider account so every exported metric remains traceable.
            </p>
            <a href="/platforms" className="premium-primary-button mt-6">Connect an account</a>
          </div>
        </GlassCard>
      )}

      <section className="grid gap-4 md:grid-cols-3" aria-label="Report templates">
            {reportTemplates.map((option) => (
              <GlassCard key={option.days} className="premium-metric-card !p-6" spotlight={false}>
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl" style={{ color: option.accent, background: `${option.accent}16` }}>
                    <FileBarChart className="size-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                    <CalendarDays className="size-3" /> {option.days} days
                  </span>
                </div>
                <h2 className="mt-6 text-lg font-semibold">{option.title}</h2>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--color-fg-muted)]">{option.description}</p>
                <button
                  type="button"
                  aria-label="Generate"
                  disabled={!connectionId || createReport.isPending}
                  onClick={() => createReport.mutate({ title: option.title, days: option.days })}
                  className="premium-primary-button mt-6 !min-h-10 !px-4 !text-xs disabled:pointer-events-none disabled:opacity-45"
                >
                  {createReport.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
                  Generate report
                </button>
              </GlassCard>
            ))}
      </section>

      {(createReport.error || reports.error || exportReport.error) && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {((createReport.error || reports.error || exportReport.error) as Error).message}
        </div>
      )}

      <GlassCard className="!p-5 md:!p-6" spotlight={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">Report library</p>
                <h2 className="mt-2 text-lg font-semibold">Generated reports</h2>
              </div>
              <span className="text-xs text-[var(--color-fg-subtle)]">{reports.data?.items.length ?? 0} ready</span>
            </div>

            {!connectionId ? (
              <div className="mt-6 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-8 text-center">
                <FileText className="mx-auto size-7 text-[var(--color-fg-subtle)]" />
                <p className="mt-3 text-sm text-[var(--color-fg-muted)]">Choose an account to view its report library.</p>
              </div>
            ) : reports.isLoading ? (
              <div className="mt-5 h-28 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-glass)]" />
            ) : !reports.data?.items.length ? (
              <div className="mt-6 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-8 text-center">
                <FileBarChart className="mx-auto size-7 text-[var(--color-fg-subtle)]" />
                <p className="mt-3 text-sm font-medium">No reports yet</p>
                <p className="mt-1 text-xs text-[var(--color-fg-muted)]">Choose a template above to generate the first snapshot.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {reports.data.items.map((report) => (
                  <article key={report.id} className="premium-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-success-muted)] text-[var(--color-success)]">
                        <CheckCircle2 className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{report.title}</p>
                        <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                          {new Date(report.createdAt).toLocaleString()} · {report.provider} · {report.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(["csv", "pdf"] as const).map((format) => (
                        <button
                          key={format}
                          type="button"
                          disabled={exportReport.isPending}
                          onClick={() => exportReport.mutate({ id: report.id, format, title: report.title })}
                          className="premium-secondary-button !min-h-9 !px-3 !text-[10px] uppercase disabled:opacity-45"
                        >
                          <Download className="size-3" /> {format}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
      </GlassCard>
    </div>
  );
}
