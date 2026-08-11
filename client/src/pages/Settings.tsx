import { ErrorBoundary, Skeleton } from "@components/common";
import { ScrollReveal } from "@components/effects/ScrollReveal";
import { IdentitySecuritySettings } from "@components/identity";
import { ConnectedAccountsSettings } from "@components/platforms/ConnectedAccountsSettings";
import { AtroposCard } from "@components/ui/AtroposCard";
import { useTheme } from "@theme/useTheme";
import { Bell, Globe, Clock, Moon, Sun, Mail, RefreshCw } from "lucide-react";
import { useSettings, useUpdateSettings } from "../features/core/hooks/useSettings";
import { WorkspacePersonalizationPanel } from "../features/personalization";
import { useAuth } from "../hooks/useAuth";

function GlassToggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-hover)]"}`}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      type="button"
    >
      <span className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

function SettingRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[var(--spacing-3)]">
        <div className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-glass)] text-[var(--color-fg-muted)]">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span className="text-[var(--font-size-sm)]">{label}</span>
      </div>
      <span className="text-[var(--font-size-xs)] text-[var(--color-fg-muted)]">{value}</span>
    </div>
  );
}

function ToggleSettingRow({ icon: Icon, label, enabled, onChange }: { icon: React.ComponentType<{ className?: string }>; label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[var(--spacing-3)]">
        <div className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-glass)] text-[var(--color-fg-muted)]">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span className="text-[var(--font-size-sm)]">{label}</span>
      </div>
      <GlassToggle enabled={enabled} onChange={onChange} label={label} />
    </div>
  );
}

function SettingsContent() {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const settings = settingsQuery.data;
  const isLoading = settingsQuery.isLoading;
  const { resolved, toggle: toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="space-y-[var(--spacing-6)] max-w-2xl">
        <div>
          <Skeleton variant="text" className="!w-32 !h-8" />
          <Skeleton variant="text" className="!w-56 !h-4 mt-[var(--spacing-2)]" />
        </div>
        <div className="bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-[var(--radius-xl)] p-[var(--spacing-5)] space-y-[var(--spacing-5)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-[var(--spacing-3)]">
                <Skeleton variant="circle" className="!size-8" />
                <Skeleton className="!w-24 !h-4" />
              </div>
              <Skeleton className="!w-32 !h-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-6)] max-w-5xl">
      <div>
        <h1 className="text-[var(--font-size-2xl)] md:text-[var(--font-size-3xl)] font-[var(--font-weight-bold)] tracking-[var(--letter-spacing-tight)]">
          Settings
        </h1>
        <p className="text-[var(--color-fg-muted)] text-[var(--font-size-sm)] mt-[var(--spacing-1)]">
          Manage your application preferences
        </p>
      </div>

      <AtroposCard className="!p-[var(--spacing-5)] space-y-[var(--spacing-5)] bg-white/5 border border-white/10 rounded-[var(--radius-2xl)] shadow-2xl backdrop-blur-xl transition-all duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[var(--spacing-3)]">
            <div className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-glass)] text-[var(--color-fg-muted)]">
              {resolved === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </div>
            <span className="text-[var(--font-size-sm)]">Theme</span>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-glass)] border border-[var(--color-glass-border)] text-xs font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-glass-hover)] transition-all active:scale-95"
            type="button"
            aria-label="Toggle theme"
          >
            {resolved === "dark" ? (
              <><Sun className="size-3.5" /> Light</>
            ) : (
              <><Moon className="size-3.5" /> Dark</>
            )}
          </button>
        </div>
        <ToggleSettingRow icon={Bell} label="Notifications" enabled={settings?.notifications ?? false} onChange={(v) => updateSettings.mutate({ notifications: v })} />
        <SettingRow icon={Globe} label="Language" value={settings?.language === "en" ? "English" : settings?.language ?? "en"} />
        <SettingRow icon={Clock} label="Timezone" value={settings?.timezone ?? "America/New_York"} />
        <ToggleSettingRow icon={Mail} label="Email Reports" enabled={settings?.emailReports ?? false} onChange={(v) => updateSettings.mutate({ emailReports: v })} />
        <ToggleSettingRow icon={RefreshCw} label="Auto Sync" enabled={settings?.autoSync ?? false} onChange={(v) => updateSettings.mutate({ autoSync: v })} />
      </AtroposCard>

      <WorkspacePersonalizationPanel />

      {(settingsQuery.error || updateSettings.error) && (
        <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">
          {((settingsQuery.error || updateSettings.error) as Error).message}
        </div>
      )}

      <ConnectedAccountsSettings />
      <IdentitySecuritySettings />
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  if (user?.mfa.enrollmentRequired) {
    return (
      <ErrorBoundary>
        <div className="max-w-2xl space-y-[var(--spacing-6)]">
          <div><h1 className="text-[var(--font-size-2xl)] font-[var(--font-weight-bold)]">Secure your account</h1><p className="mt-1 text-sm text-[var(--color-fg-muted)]">Your workspace requires multi-factor authentication before other features can be used.</p></div>
          <IdentitySecuritySettings />
        </div>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <ScrollReveal>
        <SettingsContent />
      </ScrollReveal>
    </ErrorBoundary>
  );
}
