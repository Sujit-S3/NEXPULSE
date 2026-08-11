import { useState, type ComponentType } from "react";
import { BrandLogo, AILogo, SidebarLogo } from "@components/common";
import { GlassAvatar } from "@components/glass";
import { glassBase } from "@components/glass/utils";
import { cn } from "@utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Share2,
  FileText,
  Users,
  Settings,
  Bell,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Shield,
  CheckCircle,
  Code2,
  CreditCard,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppShell } from "./AppShell";
import { useNotifications } from "../../features/core/hooks/useNotifications";
import { useCurrentWorkspace, useSwitchWorkspace, useWorkspaces } from "../../features/core/hooks/useWorkspace";
import { useAuth } from "../../hooks/useAuth";

interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string; size?: number | string; [key: string]: unknown }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Command Center",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      { label: "AI Insights", path: "/ai", icon: AILogo },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Platforms", path: "/platforms", icon: Share2 },
      { label: "Reports", path: "/reports", icon: FileText },
      { label: "Team", path: "/team", icon: Users },
      { label: "Billing", path: "/billing", icon: CreditCard },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Developer", path: "/developer", icon: Code2 },
      { label: "Security", path: "/security", icon: Shield },
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Notifications", path: "/notifications", icon: Bell },
    ],
  },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleCollapse } = useAppShell();
  const { user } = useAuth();
  const location = useLocation();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaces = useWorkspaces({ enabled: true });
  const currentWorkspace = useCurrentWorkspace();
  const switchWorkspace = useSwitchWorkspace();
  const notifications = useNotifications();
  const activeWorkspace = currentWorkspace.data ?? workspaces.data?.[0] ?? null;

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Loading…";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "…";
  const email = user?.email ?? "";
  const role = user?.role ?? "";

  return (
    <>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          tabIndex={-1}
          type="button"
        />
      )}

      <aside
        className={cn(
          "nexpulse-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-glass)]/60 backdrop-blur-[48px] transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-expo)] lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          sidebarCollapsed ? "w-[72px]" : "w-[var(--sidebar-width,260px)]",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-[var(--color-border)] shrink-0",
            sidebarCollapsed ? "justify-center h-[72px]" : "justify-between px-[var(--spacing-4)] h-[72px]",
          )}
        >
          {sidebarCollapsed ? (
            <SidebarLogo size={36} />
          ) : (
            <>
              <BrandLogo size="sm" showText />
              <button
                className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)] transition-colors lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                type="button"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="relative px-[var(--spacing-3)] pt-[var(--spacing-3)] shrink-0">
            <button
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className="flex w-full items-center gap-[var(--spacing-2)] rounded-[var(--radius-md)] px-[var(--spacing-2)] py-[var(--spacing-2)] text-left transition-colors hover:bg-[var(--color-glass-hover)] border border-[var(--color-glass-border)]"
              type="button"
              aria-expanded={workspaceOpen}
              aria-haspopup="listbox"
            >
              <div className="flex size-7 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-blue)] text-white text-[10px] font-bold shrink-0 shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                {activeWorkspace?.name.charAt(0) ?? "N"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{activeWorkspace?.name ?? "Workspace"}</p>
                <p className="text-[9px] text-[var(--color-success)] font-medium flex items-center gap-1 mt-0.5">
                  <Shield className="size-2" /> {activeWorkspace ? `${activeWorkspace.plan} plan` : "Loading workspace"}
                </p>
              </div>
              <ChevronDown
                className={cn("size-3 text-[var(--color-fg-muted)] transition-transform duration-200", workspaceOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence>
              {workspaceOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-[var(--spacing-3)] right-[var(--spacing-3)] top-full mt-[var(--spacing-1)] z-50"
                  style={{ transformOrigin: "top" }}
                >
                  <div className={cn(glassBase(), "p-[var(--spacing-2)] shadow-[var(--shadow-lg)] border-[var(--color-border-strong)]")}>
                    {(workspaces.data ?? []).map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          if (ws.id !== activeWorkspace?.id) switchWorkspace.mutate(ws);
                          setWorkspaceOpen(false);
                        }}
                        disabled={switchWorkspace.isPending}
                        className={cn("flex w-full items-center gap-[var(--spacing-2)] rounded-[var(--radius-md)] px-[var(--spacing-2)] py-[var(--spacing-2)] text-left transition-colors disabled:opacity-60", activeWorkspace?.id === ws.id ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]" : "hover:bg-[var(--color-glass-hover)]")}
                        type="button"
                        role="option"
                        aria-selected={activeWorkspace?.id === ws.id}
                      >
                        <div className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[10px] font-bold">{ws.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{ws.name}</p>
                          <p className="text-[10px] text-[var(--color-fg-subtle)]">{ws.plan} · {ws.members} members</p>
                        </div>
                        {activeWorkspace?.id === ws.id && <CheckCircle className="size-3 text-[var(--color-accent)]" />}
                      </button>
                    ))}
                    {!workspaces.isLoading && (workspaces.data?.length ?? 0) === 0 && (
                      <p className="px-2 py-3 text-center text-[10px] text-[var(--color-fg-subtle)]">No workspace available</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <nav
          className="flex-1 overflow-y-auto p-[var(--spacing-3)] space-y-[var(--spacing-4)] mt-[var(--spacing-2)]"
          aria-label="Main navigation"
        >
          {navSections.map((section) => (
            <div key={section.title} className="space-y-[var(--spacing-0-5)]">
              {!sidebarCollapsed && (
                <div className="px-[var(--spacing-2)] py-[var(--spacing-1)] text-[9px] font-bold text-[var(--color-fg-subtle)] tracking-wider uppercase opacity-70">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "relative flex items-center rounded-[var(--radius-md)] text-xs font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] overflow-hidden group",
                      sidebarCollapsed ? "justify-center size-9 mx-auto" : "gap-[var(--spacing-2)] px-[var(--spacing-2)] py-[var(--spacing-2)]",
                      isActive ? "text-[var(--color-accent)] font-semibold" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-glass-hover)]",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-accent-muted)] to-transparent border border-[var(--color-accent)]/20 shadow-[0_0_12px_rgba(59,130,246,0.12)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {isActive && !sidebarCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    )}
                    <span className="relative z-10 flex items-center justify-center">
                      <Icon className={cn(sidebarCollapsed ? "size-5" : "size-[16px]")} aria-hidden="true" />
                    </span>
                    {!sidebarCollapsed && (
                      <span className="relative z-10 flex-1">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.path === "/notifications" && (notifications.data?.unread ?? 0) > 0 && (
                      <span className="relative z-10 ml-auto flex size-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-[8px] font-bold">
                        {Math.min(9, notifications.data?.unread ?? 0)}
                      </span>
                    )}
                    {sidebarCollapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xs text-[var(--color-fg)] shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-[var(--color-border)] shrink-0", sidebarCollapsed ? "p-[var(--spacing-2)]" : "p-[var(--spacing-3)]")}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleCollapse}
                className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)] transition-colors"
                aria-label="Expand sidebar"
                type="button"
              >
                <PanelLeft className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex-1 flex items-center gap-[var(--spacing-2)] min-w-0 p-[var(--spacing-2)] rounded-[var(--radius-lg)] bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
                <div className="relative shrink-0">
                  <GlassAvatar src={user?.avatar} fallback={initials} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--color-bg-elevated)]" title="Online" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{displayName}</p>
                  <p className="text-[9px] text-[var(--color-fg-subtle)] truncate leading-tight mt-0.5">{email}</p>
                </div>
                {role && (
                  <span className="px-1 py-px rounded text-[8px] bg-[var(--color-accent-muted)] text-[var(--color-accent)] uppercase font-bold tracking-wide shrink-0">{role}</span>
                )}
              </div>

              <button
                onClick={toggleCollapse}
                className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-fg-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-fg)] transition-colors border border-transparent hover:border-[var(--color-border)]"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                type="button"
              >
                <PanelLeftClose className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
