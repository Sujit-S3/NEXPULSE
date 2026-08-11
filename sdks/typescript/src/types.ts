export interface NexpulseClientOptions {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
  userAgentSuffix?: string;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    cursor?: string;
    nextCursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
  organizationId?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  ownerId: string;
  memberCount: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  status: string;
  createdAt: string;
}

export interface WebhookEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: string;
  apiVersion: "v1";
  createdAt: string;
  workspaceId: string;
  organizationId?: string;
  actorId?: string;
  data: T;
}
