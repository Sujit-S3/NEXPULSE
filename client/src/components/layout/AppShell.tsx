import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { MotionSystem } from "@components/effects";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useNotificationStream } from "../../features/core/hooks/useNotifications";
import { PersonalizationProvider } from "../../features/personalization";
import { MotionV2Provider } from "../../motion";

const CommandPalette = lazy(() => import("./CommandPalette").then((module) => ({ default: module.CommandPalette })));

interface AppShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  floatingDockOffset: number;
  setFloatingDockOffset: (offset: number) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const context = useContext(AppShellContext);
  if (!context) throw new Error("useAppShell must be used within an <AppShell /> provider.");
  return context;
}

export function AppShell({ children }: { children: ReactNode }) {
  useNotificationStream();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [floatingDockOffset, setFloatingDockOffset] = useState(32);
  const toggleSidebar = useCallback(() => setSidebarOpen((value) => !value), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapse = useCallback(() => setSidebarCollapsed((value) => !value), []);
  const toggleCommandPalette = useCallback(() => setCommandPaletteOpen((value) => !value), []);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCommandPalette]);

  return (
    <AppShellContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar, closeSidebar, sidebarCollapsed, setSidebarCollapsed, toggleCollapse, commandPaletteOpen, toggleCommandPalette, openCommandPalette, closeCommandPalette, floatingDockOffset, setFloatingDockOffset }}>
      <PersonalizationProvider>
        <MotionV2Provider>
          <div className="premium-dashboard-shell relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
            <MotionSystem />
            <div className="relative z-10 flex min-h-0 flex-1">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Navbar />
                <main className="nexpulse-main flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
              </div>
            </div>
            <Suspense fallback={null}><CommandPalette open={commandPaletteOpen} onClose={closeCommandPalette} /></Suspense>
          </div>
        </MotionV2Provider>
      </PersonalizationProvider>
    </AppShellContext.Provider>
  );
}
