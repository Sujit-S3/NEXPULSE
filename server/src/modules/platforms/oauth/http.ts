import { AppError } from '../../../errors/index.js';

function providerMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const value = body as Record<string, unknown>;
  const nested = value['error'];
  if (nested && typeof nested === 'object') {
    const message = (nested as Record<string, unknown>)['message'];
    if (typeof message === 'string') return message;
  }
  for (const key of ['error_description', 'message', 'detail']) {
    const message = value[key];
    if (typeof message === 'string') return message;
  }
  return fallback;
}

function providerCode(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const value = body as Record<string, unknown>;
  const nested = value['error'];
  if (typeof nested === 'string') return nested.toLowerCase();
  if (nested && typeof nested === 'object') {
    const code = (nested as Record<string, unknown>)['code'];
    if (typeof code === 'string') return code.toLowerCase();
  }
  const code = value['code'];
  return typeof code === 'string' ? code.toLowerCase() : '';
}

function toProviderError(provider: string, status: number, body: unknown): AppError {
  const fallback = `${provider} returned an OAuth error`;
  const message = providerMessage(body, fallback);
  const code = providerCode(body);
  if (['invalid_grant', 'invalid_token', 'token_revoked', 'access_token_invalid'].includes(code)) {
    return new AppError(message, 401, 'OAUTH_TOKEN_REVOKED');
  }
  if (status === 401) {
    return new AppError(message, 401, 'OAUTH_TOKEN_EXPIRED');
  }
  if (status === 403) {
    return new AppError(message, 403, 'OAUTH_PERMISSIONS_MISSING');
  }
  if (status === 429) {
    return new AppError(message, 429, 'OAUTH_RATE_LIMITED');
  }
  return new AppError(message, 502, 'OAUTH_PROVIDER_ERROR');
}

export async function requestProviderJson<T>(
  provider: string,
  url: string | URL,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new AppError(`${provider} is unreachable: ${message}`, 502, 'OAUTH_NETWORK_ERROR');
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text.slice(0, 300) };
    }
  }

  if (!response.ok) {
    throw toProviderError(provider, response.status, body);
  }
  return body as T;
}

export function formBody(values: Record<string, string | undefined>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, value);
  }
  return body;
}

export function basicAuthorization(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}
