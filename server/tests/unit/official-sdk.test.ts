import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { NexpulseClient, verifyWebhook } from "../../../sdks/typescript/src/index.js";

describe("official TypeScript and JavaScript SDK", () => {
  it("authenticates, identifies the SDK, and unwraps standard envelopes", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: [{ id: "workspace-a", name: "A" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new NexpulseClient({
      apiKey: "nxk_public.secret-value-that-is-long-enough", // secret-scan:allow synthetic SDK fixture
      baseUrl: "https://example.test/api/v1",
      fetch: fetcher,
    });
    await expect(client.workspaces.list()).resolves.toEqual([{ id: "workspace-a", name: "A" }]);
    const init = fetcher.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("x-api-key")).toContain("nxk_public");
    expect(new Headers(init?.headers).get("x-nexpulse-sdk")).toBe("typescript/1.0.0");
  });

  it("retries a quota response and succeeds", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "API_QUOTA_EXCEEDED", message: "Slow down" } }), { status: 429, headers: { "retry-after": "0.001" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    const client = new NexpulseClient({ accessToken: "nxo_public.secret", fetch: fetcher, maxRetries: 1 });
    await expect(client.users.list()).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("verifies webhook signatures and parses the event", async () => {
    const timestamp = 1_800_000_000;
    const secret = "whsec_test";
    const payload = JSON.stringify({ id: "evt_1", type: "webhook.test", apiVersion: "v1", createdAt: "2026-01-01T00:00:00Z", workspaceId: "workspace-a", data: {} });
    const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    await expect(verifyWebhook({
      payload,
      signature: `t=${timestamp},v1=${digest}`,
      secret,
      nowSeconds: timestamp,
    })).resolves.toMatchObject({ id: "evt_1", type: "webhook.test" });
  });
});
