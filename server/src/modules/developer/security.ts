import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { config } from '../../config/env.js';
import { ValidationError } from '../../errors/index.js';
import { hashSecret, randomSecret } from '../identity/crypto.js';

export interface OpaqueCredential {
  prefix: string;
  secret: string;
  raw: string;
}

export function opaqueCredential(marker: string): OpaqueCredential {
  const prefix = `${marker}_${randomSecret(12)}`;
  const secret = randomSecret(32);
  return { prefix, secret, raw: `${prefix}.${secret}` };
}

export function parseOpaqueCredential(value: string, marker: string): { prefix: string; secret: string } | null {
  const expression = new RegExp(`^(${marker}_[A-Za-z0-9_-]{8,64})\\.([A-Za-z0-9_-]{20,})$`);
  const match = value.match(expression);
  return match?.[1] && match[2] ? { prefix: match[1], secret: match[2] } : null;
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  const actual = Buffer.from(pkceChallenge(verifier), 'utf8');
  const expected = Buffer.from(challenge, 'utf8');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function webhookSignature(secret: string, timestamp: number, body: string): string {
  const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

export function verifyWebhookSignature(
  secret: string,
  signature: string,
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): boolean {
  const values = Object.fromEntries(signature.split(',').map((part) => part.split('=', 2)));
  const timestamp = Number(values['t']);
  const supplied = values['v1'];
  if (!Number.isFinite(timestamp) || !supplied || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
  const expected = webhookSignature(secret, timestamp, body).split('v1=')[1];
  if (!expected) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a = 0, b = 0] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc')
      || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9')
      || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return true;
}

export async function assertWebhookUrlSafe(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ValidationError({ url: ['Enter a valid webhook URL'] });
  }
  const allowedProtocol = url.protocol === 'https:'
    || (config.env !== 'production' && url.protocol === 'http:');
  if (!allowedProtocol || url.username || url.password || url.port && !['80', '443'].includes(url.port)) {
    throw new ValidationError({ url: ['Webhook URL must use HTTPS without credentials or a non-standard port'] });
  }
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) {
    throw new ValidationError({ url: ['Webhook URL cannot target a local network'] });
  }
  const resolved = await dns.lookup(url.hostname, { all: true, verbatim: true }).catch(() => []);
  if (resolved.length === 0 || resolved.some(({ address }) => isPrivateAddress(address))) {
    throw new ValidationError({ url: ['Webhook URL must resolve only to public network addresses'] });
  }
  return url;
}

export function sha256(value: string): string {
  return hashSecret(value);
}
