import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { SettingsPage } from "@pages/Settings";

vi.mock("../../features/core/hooks/useSettings", () => ({
  useSettings: () => ({
      data: {
        theme: "dark",
        notifications: true,
        language: "en",
        timezone: "America/New_York",
        emailReports: false,
        digestFrequency: "weekly",
        autoSync: true,
        syncInterval: 30,
      },
      isLoading: false,
      error: null,
  }),
  useUpdateSettings: () => ({ mutate: vi.fn(), error: null, isPending: false }),
}));

vi.mock("../../components/identity", () => ({
  IdentitySecuritySettings: () => <div>Identity &amp; Security</div>,
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { mfa: { enrollmentRequired: false } } }),
}));

vi.mock("../../theme/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    resolved: "dark",
    setTheme: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock("../../features/core/hooks/usePlatforms", () => ({
  useOAuthProviders: () => ({ data: [], isLoading: false }),
  usePlatformConnections: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useStartPlatformOAuth: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePendingOAuthAccounts: () => ({ data: undefined, isLoading: false, error: null }),
  useSelectOAuthAccounts: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useSetPrimaryPlatformAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDisconnectPlatformAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("SettingsPage", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders settings rows", () => {
    renderPage();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  it("does not expose unimplemented destructive actions", () => {
    renderPage();
    expect(screen.queryByText("Export All Data")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete Workspace")).not.toBeInTheDocument();
    expect(screen.getByText("Connected Accounts")).toBeInTheDocument();
  });
});
