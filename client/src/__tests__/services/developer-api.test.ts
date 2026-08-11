import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() }));

vi.mock("../../lib/axios", () => ({ default: mocks }));

import { developerApi } from "../../features/developer";

describe("developer platform API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { success: true, data: [] } });
    mocks.post.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it("registers an OAuth application with explicit grants, redirects, and scopes", async () => {
    const input = {
      name: "Reporting portal",
      redirectUris: ["https://client.example/callback"],
      scopes: ["analytics.read"],
      grantTypes: ["authorization_code" as const],
    };
    await developerApi.createApplication(input);
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/developer/applications", input);
  });

  it("requests bounded delivery history for the active workspace", async () => {
    await developerApi.deliveries();
    expect(mocks.get).toHaveBeenCalledWith("/api/v1/developer/webhook-deliveries", {
      params: { limit: 50 },
    });
  });
});
