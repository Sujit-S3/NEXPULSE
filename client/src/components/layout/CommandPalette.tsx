import { useState, useEffect, useRef, useCallback } from "react";
import { AILogo } from "@components/common";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, BarChart3, Share2, FileText,
  Users, Settings, Bell, Plus, TrendingUp,
  Command, ArrowRight, Hash, Zap, Code2, Shield,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../utils";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  iconColor: string;
  iconBg: string;
  group: string;
  action: () => void;
  shortcut?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allCommands: CommandItem[] = [
    {
      id: "nav-dashboard",
      label: "Go to Dashboard",
      description: "Your analytics command center",
      icon: LayoutDashboard,
      iconColor: "var(--color-accent)",
      iconBg: "var(--color-accent-muted)",
      group: "Navigate",
      action: () => { navigate("/dashboard"); onClose(); },
    },
    {
      id: "nav-analytics",
      label: "Go to Analytics",
      description: "Performance insights and charts",
      icon: BarChart3,
      iconColor: "var(--color-blue)",
      iconBg: "var(--color-blue-muted)",
      group: "Navigate",
      action: () => { navigate("/analytics"); onClose(); },
    },
    {
      id: "nav-platforms",
      label: "Go to Platforms",
      description: "Connected social accounts",
      icon: Share2,
      iconColor: "var(--color-success)",
      iconBg: "var(--color-success-muted)",
      group: "Navigate",
      action: () => { navigate("/platforms"); onClose(); },
    },
    {
      id: "nav-reports",
      label: "Go to Reports",
      description: "Detailed performance reports",
      icon: FileText,
      iconColor: "var(--color-warning)",
      iconBg: "var(--color-warning-muted)",
      group: "Navigate",
      action: () => { navigate("/reports"); onClose(); },
    },
    {
      id: "nav-ai",
      label: "Go to AI Insights",
      description: "AI Command Center",
      icon: AILogo,
      iconColor: "var(--color-accent)",
      iconBg: "var(--color-accent-muted)",
      group: "Navigate",
      action: () => { navigate("/ai"); onClose(); },

    },
    {
      id: "nav-team",
      label: "Go to Team",
      description: "Manage team members",
      icon: Users,
      iconColor: "var(--color-cyan)",
      iconBg: "var(--color-cyan-muted)",
      group: "Navigate",
      action: () => { navigate("/team"); onClose(); },
    },
    {
      id: "nav-developer",
      label: "Go to Developer Platform",
      description: "APIs, OAuth apps, webhooks, plugins, and usage",
      icon: Code2,
      iconColor: "var(--color-accent)",
      iconBg: "var(--color-accent-muted)",
      group: "Navigate",
      action: () => { navigate("/developer"); onClose(); },
    },
    {
      id: "nav-security",
      label: "Go to Security Admin Center",
      description: "Policies, secrets, governance, threats, incidents, and compliance",
      icon: Shield,
      iconColor: "var(--color-success)",
      iconBg: "var(--color-success-muted)",
      group: "Navigate",
      action: () => { navigate("/security"); onClose(); },
    },
    {
      id: "nav-billing",
      label: "Go to Billing",
      description: "Manage the Razorpay subscription",
      icon: CreditCard,
      iconColor: "var(--color-success)",
      iconBg: "var(--color-success-muted)",
      group: "Navigate",
      action: () => { navigate("/billing"); onClose(); },
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      description: "Account and workspace settings",
      icon: Settings,
      iconColor: "var(--color-fg-muted)",
      iconBg: "var(--color-glass)",
      group: "Navigate",
      action: () => { navigate("/settings"); onClose(); },
    },
    {
      id: "nav-notifications",
      label: "Go to Notifications",
      description: "Activity and alerts",
      icon: Bell,
      iconColor: "var(--color-error)",
      iconBg: "var(--color-error-muted)",
      group: "Navigate",
      action: () => { navigate("/notifications"); onClose(); },
    },
    {
      id: "action-connect",
      label: "Connect a Platform",
      description: "Add a new social media account",
      icon: Plus,
      iconColor: "var(--color-success)",
      iconBg: "var(--color-success-muted)",
      group: "Actions",
      action: () => { navigate("/platforms"); onClose(); },
    },
    {
      id: "action-report",
      label: "Generate Report",
      description: "Create a new analytics report",
      icon: TrendingUp,
      iconColor: "var(--color-blue)",
      iconBg: "var(--color-blue-muted)",
      group: "Actions",
      action: () => { navigate("/reports"); onClose(); },
    },
    {
      id: "action-ai-chat",
      label: "Start AI Conversation",
      description: "Ask the AI anything",
      icon: Zap,
      iconColor: "var(--color-accent)",
      iconBg: "var(--color-accent-muted)",
      group: "Actions",
      action: () => { navigate("/ai"); onClose(); },
    },
    {
      id: "action-tag",
      label: "Browse by Tag",
      description: "Filter content by topic",
      icon: Hash,
      iconColor: "var(--color-warning)",
      iconBg: "var(--color-warning-muted)",
      group: "Actions",
      action: () => { navigate("/analytics"); onClose(); },
    },
  ];

  const filtered = query.trim()
    ? allCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
        cmd.group.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Group filtered commands
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
        flatFiltered[selectedIndex].action();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [flatFiltered, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector("[data-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  let flatIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Command Palette"
            aria-modal="true"
            className="enterprise-glass-overlay fixed left-1/2 top-[12%] -translate-x-1/2 z-[201] w-full max-w-lg mx-4 rounded-[var(--radius-2xl)] overflow-hidden"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
              <Search className="size-4 text-[var(--color-fg-subtle)] shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions…"
                className="flex-1 bg-transparent text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] outline-none"
                aria-label="Search command palette"
                aria-autocomplete="list"
                aria-controls="command-list"
                aria-activedescendant={flatFiltered[selectedIndex] ? `cmd-${flatFiltered[selectedIndex].id}` : undefined}
                role="combobox"
                aria-expanded={true}
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[var(--color-fg-subtle)] bg-[var(--color-glass)] border border-[var(--color-border)] rounded px-1.5 py-0.5 shrink-0">
                esc
              </kbd>
            </div>

            {/* Results */}
            <ul
              ref={listRef}
              id="command-list"
              role="listbox"
              aria-label="Commands"
              className="max-h-[380px] overflow-y-auto py-2"
            >
              {flatFiltered.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[var(--color-fg-subtle)]">
                  No results for &ldquo;{query}&rdquo;
                </li>
              )}

              {Object.entries(grouped).map(([group, items]) => (
                <li key={group} role="presentation">
                  <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                    {group}
                  </p>
                  <ul role="group" aria-label={group}>
                    {items.map((cmd) => {
                      const isSelected = flatIndex === selectedIndex;
                      const currentIndex = flatIndex;
                      flatIndex++;
                      const Icon = cmd.icon;

                      return (
                        <li key={cmd.id} role="presentation">
                          <button
                            id={`cmd-${cmd.id}`}
                            role="option"
                            aria-selected={isSelected}
                            data-selected={isSelected}
                            onClick={cmd.action}
                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              isSelected
                                ? "bg-[var(--color-accent-muted)]"
                                : "hover:bg-[var(--color-glass-hover)]",
                            )}
                            type="button"
                          >
                            <div
                              className="shrink-0 size-8 rounded-[var(--radius-md)] flex items-center justify-center"
                              style={{
                                backgroundColor: cmd.iconBg,
                                color: cmd.iconColor,
                              }}
                            >
                              <Icon className="size-4" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-[var(--font-weight-medium)] text-[var(--color-fg)] truncate">
                                {cmd.label}
                              </p>
                              {cmd.description && (
                                <p className="text-xs text-[var(--color-fg-subtle)] truncate">
                                  {cmd.description}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <ArrowRight className="shrink-0 size-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-glass)]">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-fg-subtle)]">
                <Command className="size-3" aria-hidden="true" />
                <span>NEXPULSE Command Palette</span>
              </div>
              <div className="ml-auto flex items-center gap-3 text-[10px] text-[var(--color-fg-subtle)]">
                <span className="flex items-center gap-1">
                  <kbd className="bg-[var(--color-glass)] border border-[var(--color-border)] rounded px-1 py-0.5 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-[var(--color-glass)] border border-[var(--color-border)] rounded px-1 py-0.5 font-mono">↵</kbd>
                  select
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
