import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../lib/axios", () => ({
  default: { get: mocks.get },
}));

import { analyticsApi } from "../../features/core/services/api";

describe("connection-scoped analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { data: { connectionId: "connection-1" } } });
  });

  it("sends the backend refresh flag, cursor, range, and connection identifier", async () => {
    const from = new Date("2026-06-01T00:00:00.000Z");
    const to = new Date("2026-06-30T23:59:59.000Z");

    await analyticsApi.getAnalytics({
      connectionId: "connection-1",
      from,
      to,
      forceRefresh: true,
      cursor: "provider-cursor",
      limit: 25,
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/analytics", {
      params: {
        connectionId: "connection-1",
        from: from.toISOString(),
        to: to.toISOString(),
        refresh: "true",
        cursor: "provider-cursor",
        limit: 25,
      },
    });
  });
});
