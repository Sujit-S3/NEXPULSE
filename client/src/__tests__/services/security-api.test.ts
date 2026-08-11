import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() }));

vi.mock("../../lib/axios", () => ({ default: mocks }));

import { securityApi } from "../../features/security";

describe("security control-plane API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { success: true, data: [] } });
    mocks.post.mockResolvedValue({ data: { success: true, data: {} } });
    mocks.patch.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it("creates policies in the active workspace boundary", async () => {
    const input = {
      name: "Require MFA",
      target: "access" as const,
      actionPattern: "security.*",
      resourcePattern: "*",
      effect: "allow" as const,
      conditions: { requireMfa: true, maxRiskScore: 60 },
      priority: 100,
      status: "draft" as const,
    };
    await securityApi.createPolicy(input);
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/security/policies", input);
  });

  it("uses optimistic versions when changing enforcement state", async () => {
    const policy = {
      id: "policy-1",
      name: "Risk guard",
      target: "access" as const,
      actionPattern: "*",
      resourcePattern: "*",
      effect: "allow" as const,
      conditions: {},
      priority: 100,
      status: "draft" as const,
      version: 3,
      createdAt: "2026-07-24T00:00:00.000Z",
      updatedAt: "2026-07-24T00:00:00.000Z",
    };
    await securityApi.updatePolicy(policy, { status: "enforced" }, "Validated in audit mode");
    expect(mocks.patch).toHaveBeenCalledWith("/api/v1/security/policies/policy-1", {
      expectedVersion: 3,
      changeReason: "Validated in audit mode",
      changes: { status: "enforced" },
    });
  });
});
