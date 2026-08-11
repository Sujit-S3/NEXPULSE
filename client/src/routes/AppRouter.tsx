import { lazy, Suspense } from "react";
import { LoadingOverlay } from "@components/common/LoadingOverlay";
import { ProtectedRoute } from "@components/common/ProtectedRoute";
import { Route, Routes } from "react-router-dom";

const MainLayout = lazy(() => import("@components/layout/MainLayout").then((m) => ({ default: m.MainLayout })));
const AILayout = lazy(() => import("../features/ai").then((m) => ({ default: m.AILayout })));
const AnalyticsPage = lazy(() => import("@pages/Analytics").then((m) => ({ default: m.AnalyticsPage })));
const AIPage = lazy(() => import("@pages/AI").then((m) => ({ default: m.AIPage })));
const BillingPage = lazy(() => import("@pages/Billing").then((m) => ({ default: m.BillingPage })));
const DashboardPage = lazy(() => import("@pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const DeveloperPage = lazy(() => import("@pages/Developer").then((m) => ({ default: m.DeveloperPage })));
const SecurityPage = lazy(() => import("@pages/Security").then((m) => ({ default: m.SecurityPage })));
const ForgotPasswordPage = lazy(() => import("@pages/ForgotPassword").then((m) => ({ default: m.ForgotPasswordPage })));
const GetStartedPage = lazy(() => import("@pages/GetStarted").then((m) => ({ default: m.GetStartedPage })));
const LandingPage = lazy(() => import("@pages/Landing").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@pages/Login").then((m) => ({ default: m.LoginPage })));
const NotificationsPage = lazy(() => import("@pages/Notifications").then((m) => ({ default: m.NotificationsPage })));
const OAuthConsentPage = lazy(() => import("@pages/OAuthConsent").then((m) => ({ default: m.OAuthConsentPage })));
const MaintenancePage = lazy(() => import("@pages/MaintenancePage").then((m) => ({ default: m.MaintenancePage })));
const NotFoundPage = lazy(() => import("@pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const PlatformsPage = lazy(() => import("@pages/Platforms").then((m) => ({ default: m.PlatformsPage })));
const ProfilePage = lazy(() => import("@pages/Profile").then((m) => ({ default: m.ProfilePage })));
const RegisterPage = lazy(() => import("@pages/Register").then((m) => ({ default: m.RegisterPage })));
const ReportsPage = lazy(() => import("@pages/Reports").then((m) => ({ default: m.ReportsPage })));
const ResetPasswordPage = lazy(() => import("@pages/ResetPassword").then((m) => ({ default: m.ResetPasswordPage })));
const SettingsPage = lazy(() => import("@pages/Settings").then((m) => ({ default: m.SettingsPage })));
const TeamPage = lazy(() => import("@pages/Team").then((m) => ({ default: m.TeamPage })));
const VerifyEmailPage = lazy(() => import("@pages/VerifyEmail").then((m) => ({ default: m.VerifyEmailPage })));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingOverlay />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
        <Route path="/" element={<Lazy><LandingPage /></Lazy>} />
        <Route path="/get-started" element={<Lazy><GetStartedPage /></Lazy>} />
        <Route path="/login" element={<Lazy><LoginPage /></Lazy>} />
        <Route path="/register" element={<Lazy><RegisterPage /></Lazy>} />
        <Route path="/forgot-password" element={<Lazy><ForgotPasswordPage /></Lazy>} />
        <Route path="/reset-password" element={<Lazy><ResetPasswordPage /></Lazy>} />
        <Route path="/verify-email" element={<Lazy><VerifyEmailPage /></Lazy>} />
        <Route path="/oauth/authorize" element={<ProtectedRoute><Lazy><OAuthConsentPage /></Lazy></ProtectedRoute>} />

        <Route element={<ProtectedRoute><Lazy><MainLayout /></Lazy></ProtectedRoute>}>
          <Route path="/dashboard" element={<Lazy><DashboardPage /></Lazy>} />
          <Route path="/analytics" element={<Lazy><AnalyticsPage /></Lazy>} />
          <Route path="/platforms" element={<Lazy><PlatformsPage /></Lazy>} />
          <Route path="/reports" element={<Lazy><ReportsPage /></Lazy>} />
          <Route path="/team" element={<Lazy><TeamPage /></Lazy>} />
          <Route path="/billing" element={<Lazy><BillingPage /></Lazy>} />
          <Route path="/settings" element={<Lazy><SettingsPage /></Lazy>} />
          <Route path="/notifications" element={<Lazy><NotificationsPage /></Lazy>} />
          <Route path="/profile" element={<Lazy><ProfilePage /></Lazy>} />
          <Route path="/developer" element={<Lazy><DeveloperPage /></Lazy>} />
          <Route path="/security" element={<Lazy><SecurityPage /></Lazy>} />
        </Route>

        <Route element={<ProtectedRoute><Lazy><AILayout /></Lazy></ProtectedRoute>}>
          <Route path="/ai" element={<Lazy><AIPage /></Lazy>} />
        </Route>

        <Route path="/maintenance" element={<Lazy><MaintenancePage /></Lazy>} />
        <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
    </Routes>
  );
}
