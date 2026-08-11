import { NexpulseError } from "./errors.js";
import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  NexpulseClientOptions,
  Organization,
  RequestOptions,
  User,
  Workspace,
} from "./types.js";

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

function queryString(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export class NexpulseClient {
  readonly organizations = {
    current: () => this.get<Organization>("/organizations/current"),
    update: (input: { name?: string; slug?: string }) => this.patch<Organization>("/organizations/current", { body: input }),
  };
  readonly users = {
    list: () => this.get<User[]>("/users"),
    retrieve: (id: string) => this.get<User>(`/users/${encodeURIComponent(id)}`),
  };
  readonly workspaces = {
    list: () => this.get<Workspace[]>("/workspaces"),
    current: () => this.get<Workspace>("/workspaces/current"),
  };
  readonly analytics = {
    retrieve: (input: { connectionId: string; from: string; to: string; cursor?: string; limit?: number }) =>
      this.get<unknown>("/analytics", { query: input }),
  };
  readonly reports = {
    list: (connectionId: string) => this.get<unknown>("/reports", { query: { connectionId } }),
    generate: (input: { connectionId: string; title: string; from: string; to: string }, idempotencyKey?: string) =>
      this.post<unknown>("/reports", { body: input, idempotencyKey }),
  };
  readonly dashboards = {
    retrieve: (input: { connectionId: string; from: string; to: string }) => this.get<unknown>("/dashboard", { query: input }),
  };
  readonly notifications = {
    list: (input: { status?: string; page?: number; limit?: number } = {}) => this.get<unknown>("/notifications", { query: input }),
  };
  readonly connections = {
    list: () => this.get<unknown>("/platforms/connections"),
  };
  readonly ai = {
    chat: (input: { connectionId: string; conversationId: string; message: string }) => this.post<unknown>("/ai/chat", { body: input }),
  };
  readonly developer = {
    catalog: () => this.get<unknown>("/developer/catalog"),
    usage: (days = 30) => this.get<unknown>("/developer/usage", { query: { days } }),
    webhooks: () => this.get<unknown>("/developer/webhooks"),
    deliveries: (limit = 50) => this.get<unknown>("/developer/webhook-deliveries", { query: { limit } }),
    marketplace: () => this.get<unknown>("/developer/marketplace"),
  };

  private readonly fetcher: typeof globalThis.fetch;
  private readonly baseUrl: string;
  private readonly credential: { header: string; value: string };
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly sdkHeader: string;

  constructor(options: NexpulseClientOptions) {
    if (!options.apiKey && !options.accessToken) throw new Error("apiKey or accessToken is required");
    if (options.apiKey && options.accessToken) throw new Error("Provide only one authentication credential");
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new Error("A Fetch API implementation is required");
    this.baseUrl = (options.baseUrl ?? "https://api.nexpulse.ai/api/v1").replace(/\/$/, "");
    this.credential = options.apiKey
      ? { header: "X-API-Key", value: options.apiKey }
      : { header: "Authorization", value: `Bearer ${options.accessToken ?? ""}` };
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.sdkHeader = `typescript/1.0.0${options.userAgentSuffix ? ` ${options.userAgentSuffix}` : ""}`;
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> { return this.request<T>("GET", path, options); }
  post<T>(path: string, options: RequestOptions = {}): Promise<T> { return this.request<T>("POST", path, options); }
  patch<T>(path: string, options: RequestOptions = {}): Promise<T> { return this.request<T>("PATCH", path, options); }
  delete<T>(path: string, options: RequestOptions = {}): Promise<T> { return this.request<T>("DELETE", path, options); }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}${queryString(options.query)}`;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const timeout = AbortSignal.timeout(this.timeoutMs);
      const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
      const response = await this.fetcher(url, {
        method,
        signal,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          [this.credential.header]: this.credential.value,
          "X-NEXPULSE-SDK": this.sdkHeader,
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
          ...options.headers,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (response.ok) {
        if (response.status === 204) return undefined as T;
        const payload = await response.json() as ApiEnvelope<T>;
        return payload.data;
      }
      if (attempt < this.maxRetries && RETRYABLE_STATUS.has(response.status)) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * (2 ** attempt), options.signal);
        continue;
      }
      const payload = await response.json().catch(() => null) as ApiErrorEnvelope | null;
      throw new NexpulseError({
        message: payload?.error.message ?? `NEXPULSE API returned HTTP ${response.status}`,
        status: response.status,
        code: payload?.error.code ?? "HTTP_ERROR",
        requestId: response.headers.get("x-request-id") ?? undefined,
        details: payload?.error.errors,
      });
    }
    throw new Error("Unreachable retry state");
  }
}

export function createCliClient(input: { token: string; baseUrl?: string }): NexpulseClient {
  return new NexpulseClient({ accessToken: input.token, baseUrl: input.baseUrl, userAgentSuffix: "cli" });
}
