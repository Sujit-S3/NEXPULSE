export interface DeveloperApplication {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: ("authorization_code" | "client_credentials")[];
  status: "active" | "suspended" | "revoked";
  lastUsedAt?: string;
  createdAt: string;
}

export interface OAuthConsent {
  application: DeveloperApplication;
  requestedScopes: string[];
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export interface ApiCredential {
  id: string;
  type: "api_key" | "personal_access_token";
  name: string;
  prefix: string;
  permissions: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  description?: string;
  events: string[];
  status: "active" | "paused" | "disabled";
  consecutiveFailures: number;
  lastDeliveredAt?: string;
  lastFailedAt?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  status: "pending" | "delivering" | "retrying" | "succeeded" | "dead_letter";
  attemptCount: number;
  nextAttemptAt: string;
  deliveredAt?: string;
  responseStatus?: number;
  lastError?: string;
  createdAt: string;
}

export interface EventDefinition {
  type: string;
  category: string;
  description: string;
  schemaVersion: string;
}

export interface DeveloperCatalog {
  lifecycle: {
    current: string;
    supported: string[];
    sunsetNoticeDays: number;
    compatibility: string;
    migration: string;
  };
  scopes: Record<string, string[]>;
  events: EventDefinition[];
}

export interface ApiUsageSummary {
  periodDays: number;
  totals: {
    requests: number;
    errors: number;
    errorRate: number;
    rateLimited: number;
    averageLatencyMs: number;
    maxLatencyMs: number;
  };
  endpoints: {
    endpoint: string;
    method: string;
    requests: number;
    errors: number;
    averageLatencyMs: number;
  }[];
  sdkUsage: { sdk: string; requests: number }[];
  quota: {
    requestsPerMinute: number;
    burstPerTenSeconds: number;
    requestsPerMonth: number;
    endpointOverrides: Record<string, number>;
  };
}

export interface MarketplacePlugin {
  id: string;
  slug: string;
  name: string;
  description: string;
  publisher: string;
  capabilities: string[];
  requiredPermissions: string[];
  status: string;
  versions: { version: string; runtimeApiVersion: string; releasedAt?: string }[];
  averageRating: number;
  reviewCount: number;
}

export interface PluginInstallation {
  id: string;
  plugin: MarketplacePlugin;
  version: string;
  grantedPermissions: string[];
  status: "active" | "disabled" | "uninstalled";
  installedAt: string;
}
