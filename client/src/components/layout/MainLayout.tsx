import { AnimatePresence } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { AppShell } from "./AppShell";
import { PageContainer } from "./PageContainer";
import { RouteTransition } from "../../motion";
import { ErrorBoundary } from "../common/error/ErrorBoundary";

export function MainLayout() {
  const location = useLocation();
  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        {/* Keying on pathname remounts this subtree on navigation, which also
            resets the ErrorBoundary below without any extra reset wiring. */}
        <RouteTransition key={location.pathname} routeKey={location.pathname}>
          <PageContainer>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </PageContainer>
        </RouteTransition>
      </AnimatePresence>
    </AppShell>
  );
}
