import { ErrorBoundary } from "@components/common/error/ErrorBoundary";
import { AppShell } from "@components/layout/AppShell";
import { AnimatePresence } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { RouteTransition } from "../../../motion";

export function AILayout() {
  const location = useLocation();
  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <RouteTransition key={location.pathname} routeKey={location.pathname}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </RouteTransition>
      </AnimatePresence>
    </AppShell>
  );
}
