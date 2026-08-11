import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton, KPISkeleton, ChartSkeleton, TableSkeleton } from "@components/common/skeleton";

describe("Skeleton", () => {
  it("renders with default variant", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("animate-pulse");
    expect(el).toHaveClass("h-4");
    expect(el).toHaveClass("w-full");
  });

  it("renders with card variant", () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("h-32");
    expect(el).toHaveClass("w-full");
  });

  it("renders with circle variant", () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("rounded-full");
    expect(el).toHaveClass("size-10");
  });

  it("renders with chart variant", () => {
    const { container } = render(<Skeleton variant="chart" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("h-48");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="!w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("!w-32");
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("KPISkeleton", () => {
  it("renders correct number of items", () => {
    const { container } = render(<KPISkeleton count={4} />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(4 * 4);
  });

  it("renders default count of 6", () => {
    const { container } = render(<KPISkeleton />);
    const items = container.querySelectorAll(".animate-pulse");
    expect(items.length).toBe(6 * 4);
  });
});

describe("ChartSkeleton", () => {
  it("renders chart skeleton", () => {
    const { container } = render(<ChartSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
  });
});

describe("TableSkeleton", () => {
  it("renders default 5 rows", () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll(":scope > div > div");
    // header row + 5 data rows = 6 rows with child divs
    expect(rows.length).toBeGreaterThan(5);
  });
});
