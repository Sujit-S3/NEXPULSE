import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportsPage } from "@pages/Reports";

vi.mock("../../features/core/hooks/usePlatforms", () => ({
  usePlatformConnections: () => ({ data: [], isLoading: false, error: null }),
}));

describe("ReportsPage", () => {
  const renderPage = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
  };

  it("renders page title", () => {
    renderPage();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("renders real date-range report choices", () => {
    renderPage();
    expect(screen.getByText("Weekly performance")).toBeInTheDocument();
    expect(screen.getByText("Monthly performance")).toBeInTheDocument();
    expect(screen.getByText("Quarterly performance")).toBeInTheDocument();
  });

  it("requires an account before report generation", () => {
    renderPage();
    for (const button of screen.getAllByRole("button", { name: "Generate" })) {
      expect(button).toBeDisabled();
    }
  });
});
