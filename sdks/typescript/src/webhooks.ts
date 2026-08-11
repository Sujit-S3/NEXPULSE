import type { WebhookEvent } from "./types.js";

function parseSignature(signature: string): { timestamp: number; digest: string } | null {
  const values = Object.fromEntries(signature.split(",").map((part) => part.split("=", 2)));
  const timestamp = Number(values["t"]);
  const digest = values["v1"];
  return Number.isFinite(timestamp) && digest ? { timestamp, digest } : null;
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyWebhook<T extends Record<string, unknown> = Record<string, unknown>>(input: {
  payload: string;
  signature: string;
  secret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): Promise<WebhookEvent<T>> {
  const parsed = parseSignature(input.signature);
  const tolerance = input.toleranceSeconds ?? 300;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!parsed || Math.abs(now - parsed.timestamp) > tolerance) throw new Error("Webhook signature timestamp is invalid");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parsed.timestamp}.${input.payload}`)));
  if (!constantTimeEqual(digest, parsed.digest)) throw new Error("Webhook signature is invalid");
  return JSON.parse(input.payload) as WebhookEvent<T>;
}
