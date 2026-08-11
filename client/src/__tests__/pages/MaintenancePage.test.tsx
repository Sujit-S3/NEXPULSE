import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MaintenancePage } from "@pages/MaintenancePage";

describe("MaintenancePage", () => {
  it("renders maintenance message", () => {
    render(<MaintenancePage />);
    expect(screen.getByText("Under Maintenance")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<MaintenancePage />);
    expect(screen.getByText(/scheduled maintenance/i)).toBeInTheDocument();
  });

  it("renders auto-refreshing indicator", () => {
    render(<MaintenancePage />);
    expect(screen.getByText("Auto-refreshing...")).toBeInTheDocument();
  });
});
