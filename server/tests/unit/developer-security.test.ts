import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  opaqueCredential,
  parseOpaqueCredential,
  pkceChallenge,
  verifyPkce,
  verifyWebhookSignature,
  webhookSignature,
} from "../../src/modules/developer/security.js";

describe("developer platform security primitives", () => {
  it("creates opaque credentials that expose only a lookup prefix", () => {
    const credential = opaqueCredential("nxo");
    const parsed = parseOpaqueCredential(credential.raw, "nxo");
    expect(parsed).toEqual({ prefix: credential.prefix, secret: credential.secret });
    expect(parseOpaqueCredential(credential.raw, "nxr")).toBeNull();
  });

  it("enforces OAuth PKCE S256 challenges", () => {
    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = pkceChallenge(verifier);
    expect(verifyPkce(verifier, challenge)).toBe(true);
    expect(verifyPkce(`${verifier}a`, challenge)).toBe(false);
  });

  it("verifies signed webhook payloads within the replay window", () => {
    const timestamp = 1_800_000_000;
    const body = JSON.stringify({ id: "evt_1", type: "webhook.test" });
    const signature = webhookSignature("whsec_test", timestamp, body);
    expect(verifyWebhookSignature("whsec_test", signature, body, timestamp)).toBe(true);
    expect(verifyWebhookSignature("whsec_test", signature, body, timestamp + 301)).toBe(false);
    expect(verifyWebhookSignature("whsec_other", signature, body, timestamp)).toBe(false);
  });
});
