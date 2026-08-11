import { useEffect, useMemo, useRef, useState, type ReactNode, type UIEvent } from "react";
import { cn } from "@utils";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface GlassDataColumn<T> {
  id: string;
  label: string;
  value: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
}

export function GlassDataGrid<T>({
  rows,
  columns,
  rowKey,
  ariaLabel,
  virtualizeAbove = 60,
  estimatedRowHeight = 52,
  maxHeight = 560,
  overscan = 6,
}: {
  rows: T[];
  columns: GlassDataColumn<T>[];
  rowKey: (row: T) => string;
  ariaLabel: string;
  virtualizeAbove?: number;
  estimatedRowHeight?: number;
  maxHeight?: number;
  overscan?: number;
}) {
  const [sort, setSort] = useState<{ id: string; direction: "asc" | "desc" } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = column.sortValue?.(a) ?? "";
      const bv = column.sortValue?.(b) ?? "";
      const result = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, rows, sort]);

  const isVirtualized = sortedRows.length >= virtualizeAbove;
  const visibleRange = useMemo(() => {
    if (!isVirtualized) {
      return { start: 0, end: sortedRows.length, top: 0, bottom: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / estimatedRowHeight) - overscan);
    const visibleCount = Math.ceil(maxHeight / estimatedRowHeight) + overscan * 2;
    const end = Math.min(sortedRows.length, start + visibleCount);

    return {
      start,
      end,
      top: start * estimatedRowHeight,
      bottom: Math.max(0, (sortedRows.length - end) * estimatedRowHeight),
    };
  }, [
    estimatedRowHeight,
    isVirtualized,
    maxHeight,
    overscan,
    scrollTop,
    sortedRows.length,
  ]);
  const visibleRows = isVirtualized
    ? sortedRows.slice(visibleRange.start, visibleRange.end)
    : sortedRows;

  useEffect(() => {
    setScrollTop(0);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [sort]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (isVirtualized) setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div
      ref={viewportRef}
      className="glass-data-grid"
      role="region"
      aria-label={ariaLabel}
      data-virtualized={isVirtualized ? "true" : "false"}
      onScroll={handleScroll}
      style={isVirtualized ? { maxHeight } : undefined}
    >
      <table aria-rowcount={sortedRows.length + 1}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} className={column.align === "right" ? "text-right" : undefined}>
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => setSort((current) => ({
                      id: column.id,
                      direction: current?.id === column.id && current.direction === "asc" ? "desc" : "asc",
                    }))}
                  >
                    {column.label}
                    {sort?.id === column.id && (sort.direction === "asc" ? <ChevronUp /> : <ChevronDown />)}
                  </button>
                ) : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRange.top > 0 && (
            <tr className="glass-data-grid-spacer" aria-hidden="true">
              <td colSpan={columns.length} style={{ height: visibleRange.top }} />
            </tr>
          )}
          {visibleRows.map((row, index) => (
            <tr
              key={rowKey(row)}
              aria-rowindex={visibleRange.start + index + 2}
              style={isVirtualized ? { height: estimatedRowHeight } : undefined}
            >
              {columns.map((column) => (
                <td key={column.id} className={column.align === "right" ? "text-right" : undefined}>
                  {column.value(row)}
                </td>
              ))}
            </tr>
          ))}
          {visibleRange.bottom > 0 && (
            <tr className="glass-data-grid-spacer" aria-hidden="true">
              <td colSpan={columns.length} style={{ height: visibleRange.bottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface TimelineItem {
  id: string;
  title: string;
  detail?: string;
  meta?: string;
  status?: "pending" | "active" | "complete" | "error";
  icon?: ReactNode;
}

export function GlassTimeline({ items, ariaLabel }: { items: TimelineItem[]; ariaLabel: string }) {
  return (
    <ol className="glass-timeline" aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.id} className={cn("glass-timeline-item", `is-${item.status ?? "complete"}`)}>
          <span className="glass-timeline-node">{item.icon}</span>
          <div>
            <strong>{item.title}</strong>
            {item.detail && <p>{item.detail}</p>}
            {item.meta && <small>{item.meta}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function GlassActivityFeed({ items, ariaLabel }: { items: TimelineItem[]; ariaLabel: string }) {
  return (
    <div className="glass-activity-feed" aria-label={ariaLabel}>
      {items.map((item) => (
        <article key={item.id}>
          <span>{item.icon}</span>
          <div><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}</div>
          {item.meta && <time>{item.meta}</time>}
        </article>
      ))}
    </div>
  );
}

export function GlassNotificationCenter({
  children,
  title,
  unread,
  actions,
}: {
  children: ReactNode;
  title: string;
  unread: number;
  actions?: ReactNode;
}) {
  return (
    <section className="glass-notification-center">
      <header>
        <div><p>Enterprise activity hub</p><h2>{title}</h2><span>{unread} unread</span></div>
        {actions}
      </header>
      <div>{children}</div>
    </section>
  );
}
