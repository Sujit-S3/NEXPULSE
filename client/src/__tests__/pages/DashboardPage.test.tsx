import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@pages/Dashboard";

vi.mock("../../features/core/hooks/usePlatforms", () => ({
  usePlatformConnections: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    error: null,
  }),
  useProviderHealth: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

vi.mock("../../features/core/hooks/useDashboard", () => ({
  useDashboard: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { firstName: "Surya" },
  }),
}));

describe("DashboardPage", () => {
  it("opens the command center and presents connection onboarding", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /surya/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connect your first source of truth" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /connect a platform/i })).toHaveAttribute("href", "/platforms");
  });
});
