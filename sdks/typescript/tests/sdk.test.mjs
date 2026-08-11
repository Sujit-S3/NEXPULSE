import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NexpulseClient } from "../dist/client.js";
import { verifyWebhook } from "../dist/webhooks.js";

function fakeResponse(status, body, headers = {}) {
  const headerMap = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headerMap.get(name.toLowerCase()) ?? null },
    json: async () => body,
  };
}

test("client sends the API key header and unwraps the response envelope", async () => {
  const calls = [];
  const client = new NexpulseClient({
    apiKey: "nxk_test.secret",
    baseUrl: "https://example.test/api/v1",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fakeResponse(200, { success: true, data: [{ id: "ws_1" }] }, { "X-Request-Id": "req_1" });
    },
  });

  const workspaces = await client.workspaces.list();

  assert.deepEqual(workspaces, [{ id: "ws_1" }]);
  assert.equal(calls[0].init.headers["X-API-Key"], "nxk_test.secret");
  assert.equal(calls[0].init.headers["X-NEXPULSE-SDK"], "typescript/1.0.0");
});

test("client builds query strings for endpoints with query parameters", async () => {
  const calls = [];
  const client = new NexpulseClient({
    apiKey: "nxk_test.secret",
    baseUrl: "https://example.test/api/v1",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fakeResponse(200, { success: true, data: {} });
    },
  });

  await client.developer.usage(7);

  assert.match(calls[0].url, /\/developer\/usage\?days=7$/);
});

test("client retries retryable status codes before succeeding", async () => {
  let attempts = 0;
  const client = new NexpulseClient({
    apiKey: "nxk_test.secret",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) return fakeResponse(503, { success: false, error: { code: "UNAVAILABLE", message: "try again" } });
      return fakeResponse(200, { success: true, data: { ok: true } });
    },
  });

  const result = await client.organizations.current();

  assert.equal(attempts, 2);
  assert.deepEqual(result, { ok: true });
});

test("client throws a NexpulseError with the API's error code on non-retryable failures", async () => {
  const client = new NexpulseClient({
    apiKey: "nxk_test.secret",
    baseUrl: "https://example.test/api/v1",
    fetch: async () => fakeResponse(404, { success: false, error: { code: "NOT_FOUND", message: "Workspace not found" } }),
  });

  await assert.rejects(
    () => client.workspaces.current(),
    (error) => {
      assert.equal(error.code, "NOT_FOUND");
      assert.equal(error.status, 404);
      assert.equal(error.message, "Workspace not found");
      return true;
    },
  );
});

test("verifyWebhook accepts a validly signed, in-window payload", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "webhook.test" });
  const secret = "whsec_test";
  const timestamp = 1_800_000_000;
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");

  const event = await verifyWebhook({
    payload,
    signature: `t=${timestamp},v1=${digest}`,
    secret,
    nowSeconds: timestamp,
  });

  assert.equal(event.id, "evt_1");
});

test("verifyWebhook rejects a payload signed outside the replay window", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "webhook.test" });
  const secret = "whsec_test";
  const timestamp = 1_800_000_000;
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");

  await assert.rejects(() =>
    verifyWebhook({
      payload,
      signature: `t=${timestamp},v1=${digest}`,
      secret,
      nowSeconds: timestamp + 301,
    }),
  );
});

test("verifyWebhook rejects a payload with an invalid signature", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "webhook.test" });
  const timestamp = 1_800_000_000;

  await assert.rejects(() =>
    verifyWebhook({
      payload,
      signature: `t=${timestamp},v1=deadbeef`,
      secret: "whsec_test",
      nowSeconds: timestamp,
    }),
  );
});
