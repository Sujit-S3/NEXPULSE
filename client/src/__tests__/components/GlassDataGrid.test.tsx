import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlassDataGrid, type GlassDataColumn } from "../../components/enterprise";

interface Row {
  id: string;
  label: string;
}

const rows: Row[] = Array.from({ length: 100 }, (_, index) => ({
  id: String(index),
  label: `Provider ${index}`,
}));

const columns: GlassDataColumn<Row>[] = [
  {
    id: "label",
    label: "Provider",
    value: (row) => row.label,
    sortValue: (row) => row.label,
  },
];

describe("GlassDataGrid virtualization", () => {
  it("windows large datasets and exposes the complete accessible row count", () => {
    render(
      <GlassDataGrid
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        ariaLabel="Provider telemetry"
        maxHeight={200}
        estimatedRowHeight={40}
        overscan={1}
      />,
    );

    const viewport = screen.getByRole("region", { name: "Provider telemetry" });
    expect(viewport).toHaveAttribute("data-virtualized", "true");
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "101");
    expect(screen.getByText("Provider 0")).toBeInTheDocument();
    expect(screen.queryByText("Provider 99")).not.toBeInTheDocument();

    fireEvent.scroll(viewport, { target: { scrollTop: 3800 } });

    expect(screen.getByText("Provider 99")).toBeInTheDocument();
    expect(screen.queryByText("Provider 0")).not.toBeInTheDocument();
  });
});
