import { useCallback, useEffect, useState } from "react";
import { BrandLogo, ThemeToggle } from "@components/common";
import { Bell, CheckCheck, Menu, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppShell } from "./AppShell";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown } from "./ProfileDropdown";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../../features/core/hooks/useNotifications";

const pageBreadcrumbs: Record<string, { label: string; parent?: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/analytics": { label: "Analytics", parent: "Insights" },
  "/platforms": { label: "Platforms", parent: "Connections" },
  "/reports": { label: "Reports", parent: "Analytics" },
  "/ai": { label: "AI Insights", parent: "Intelligence" },
  "/team": { label: "Team", parent: "Management" },
  "/settings": { label: "Settings", parent: "Configuration" },
  "/notifications": { label: "Notifications", parent: "Activity" },
  "/billing": { label: "Billing", parent: "Account" },
  "/developer": { label: "Developer", parent: "Integrations" },
  "/security": { label: "Security", parent: "Governance" },
  "/profile": { label: "Profile", parent: "Account" },
};

export function Navbar() {
  const { toggleSidebar, toggleCommandPalette, setFloatingDockOffset } = useAppShell();
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumb = pageBreadcrumbs[location.pathname];
  const [open, setOpen] = useState(false);
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setFloatingDockOffset(open ? 420 : 32), [open, setFloatingDockOffset]);

  return (
    <header className="nexpulse-topbar sticky top-0 z-[var(--z-sticky)] flex h-[72px] w-full items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-glass)]/70 px-[var(--spacing-4)] backdrop-blur-[48px] lg:px-[var(--spacing-6)]">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-fg-muted)] lg:hidden" aria-label="Toggle navigation sidebar" type="button"><Menu className="size-[18px]" /></button>
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-[var(--color-fg-subtle)]" type="button"><BrandLogo size="sm" showText={false} /><span className="text-xs font-semibold">NEXPULSE</span></button>
          {breadcrumb?.parent && <><span className="text-[var(--color-fg-subtle)]">/</span><span className="text-xs text-[var(--color-fg-subtle)]">{breadcrumb.parent}</span></>}
          <span className="text-[var(--color-fg-subtle)]">/</span><span className="text-xs font-semibold">{breadcrumb?.label ?? location.pathname.slice(1)}</span>
        </div>
        <h1 className="text-sm font-semibold sm:hidden">{breadcrumb?.label ?? "NEXPULSE"}</h1>
      </div>

      <div className="ml-auto hidden items-center md:flex">
        <button onClick={toggleCommandPalette} type="button" className="mr-2 flex w-52 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-1.5 text-xs text-[var(--color-fg-subtle)]" aria-label="Open command palette"><Search className="size-3.5" />Search commands...</button>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <div className="relative">
          <button onClick={() => setOpen((value) => !value)} className="relative flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-fg-muted)]" aria-label="Notifications" aria-expanded={open} type="button">
            <Bell className="size-[18px]" />
            {(notifications.data?.unread ?? 0) > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[var(--color-error)] text-[9px] font-bold text-white">{Math.min(9, notifications.data?.unread ?? 0)}{(notifications.data?.unread ?? 0) > 9 ? "+" : ""}</span>}
          </button>
          <NotificationDropdown open={open} onClose={close} title="Notifications" badge={notifications.data?.unread ?? 0}>
            <div className="flex items-center justify-between px-4 py-2"><span className="text-xs text-[var(--color-fg-subtle)]">{notifications.data?.unread ?? 0} unread</span>{(notifications.data?.unread ?? 0) > 0 && <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1 text-xs text-[var(--color-accent)]" type="button"><CheckCheck className="size-3" />Mark all read</button>}</div>
            <div className="divide-y divide-[var(--color-border)]">
              {notifications.data?.items.slice(0, 5).map((notification) => <button key={notification.id} onClick={() => { if (!notification.read) markRead.mutate(notification.id); if (notification.actionPath) navigate(notification.actionPath); else navigate("/notifications"); close(); }} type="button" className="w-full px-4 py-3 text-left hover:bg-[var(--color-glass-hover)]"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold">{notification.title}</p>{!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />}</div><p className="mt-1 line-clamp-2 text-[10px] text-[var(--color-fg-muted)]">{notification.message}</p></button>)}
              {!notifications.isLoading && notifications.data?.items.length === 0 && <p className="px-4 py-8 text-center text-xs text-[var(--color-fg-muted)]">No notifications.</p>}
            </div>
            <button type="button" onClick={() => { navigate("/notifications"); close(); }} className="w-full border-t border-[var(--color-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-accent)]">View all notifications</button>
          </NotificationDropdown>
        </div>
        <ProfileDropdown onOpenChange={(profileOpen) => setFloatingDockOffset(profileOpen ? 300 : open ? 420 : 32)} />
      </div>
    </header>
  );
}
