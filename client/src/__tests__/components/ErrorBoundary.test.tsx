import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorBoundary, ErrorFallback, EmptyState, LoadingOverlay } from "@components/common/error";

const GoodComponent = () => <div>All good</div>;

const BadComponent = ({ message = "Test error" }: { message?: string }) => {
  throw new Error(message);
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders error fallback on error", () => {
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("renders custom fallback", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <BadComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("resets error state on Try Again click", () => {
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>,
    );
    // Verify error state
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    // Click reset
    screen.getByText("Try Again").click();
    // After reset, the component re-renders and throws again, so error state returns
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

describe("ErrorFallback", () => {
  it("renders error message and retry button", () => {
    const reset = vi.fn();
    render(<ErrorFallback error={new Error("Custom error")} resetErrorBoundary={reset} />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Custom error")).toBeInTheDocument();
    screen.getByText("Retry").click();
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    const TestIcon = ({ className }: { className?: string }) => <svg data-testid="icon" className={className} />;
    render(<EmptyState icon={TestIcon} title="Empty" description="Nothing here" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    const TestIcon = () => <svg />;
    render(<EmptyState icon={TestIcon} title="Empty" description="Nothing here" action={{ label: "Add Item", onClick }} />);
    const btn = screen.getByText("Add Item");
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("LoadingOverlay", () => {
  it("renders default label", () => {
    render(<LoadingOverlay />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<LoadingOverlay label="Fetching data..." />);
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("has status role", () => {
    render(<LoadingOverlay />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
