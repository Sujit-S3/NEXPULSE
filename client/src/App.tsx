import { lazy, Suspense } from "react";
import { LoadingOverlay } from "@components/common/LoadingOverlay";
import { LandingPage } from "@pages/Landing";
import { ThemeProvider } from "@theme";

const AuthenticatedApplication = lazy(() => import("./AuthenticatedApplication"));

export function App() {
  const isDirectLanding = window.location.pathname === "/";
  return (
    <ThemeProvider>
      {isDirectLanding ? (
        <LandingPage />
      ) : (
        <Suspense fallback={<LoadingOverlay label="Preparing your workspace…" />}>
          <AuthenticatedApplication />
        </Suspense>
      )}
    </ThemeProvider>
  );
}
