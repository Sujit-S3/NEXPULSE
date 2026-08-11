import type {
  ApiCredential,
  ApiUsageSummary,
  DeveloperApplication,
  DeveloperCatalog,
  MarketplacePlugin,
  OAuthConsent,
  PluginInstallation,
  WebhookDelivery,
  WebhookEndpoint,
} from "./types";
import api from "../../lib/axios";
import type { ApiResponse } from "../../types";

async function data<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  return (await request).data.data;
}

export const developerApi = {
  catalog: () => data<DeveloperCatalog>(api.get("/api/v1/developer/catalog")),
  usage: (days = 30) => data<ApiUsageSummary>(api.get("/api/v1/developer/usage", { params: { days } })),
  oauthConsent: (params: Record<string, string>) => data<OAuthConsent>(
    api.get("/api/v1/oauth/authorize", { params }),
  ),
  authorize: (input: {
    clientId: string;
    redirectUri: string;
    scopes: string[];
    state: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
    approved: true;
  }) => data<{ code: string; state: string; redirectTo: string; expiresIn: number }>(
    api.post("/api/v1/oauth/authorize", input),
  ),

  applications: () => data<DeveloperApplication[]>(api.get("/api/v1/developer/applications")),
  createApplication: (input: {
    name: string;
    description?: string;
    redirectUris: string[];
    scopes: string[];
    grantTypes: ("authorization_code" | "client_credentials")[];
  }) => data<{ application: DeveloperApplication; clientSecret: string }>(
    api.post("/api/v1/developer/applications", input),
  ),
  rotateApplicationSecret: (id: string) => data<{ application: DeveloperApplication; clientSecret: string }>(
    api.post(`/api/v1/developer/applications/${encodeURIComponent(id)}/rotate-secret`),
  ),
  revokeApplication: (id: string) => api.delete(`/api/v1/developer/applications/${encodeURIComponent(id)}`),

  credentials: () => data<ApiCredential[]>(api.get("/api/v1/identity/credentials")),
  createCredential: (input: {
    type: "api_key" | "personal_access_token";
    name: string;
    permissions: string[];
    expiresAt?: string;
  }) => data<{ credential: ApiCredential; token: string }>(api.post("/api/v1/identity/credentials", input)),
  rotateCredential: (id: string) => data<{ credential: ApiCredential; token: string }>(
    api.post(`/api/v1/identity/credentials/${encodeURIComponent(id)}/rotate`),
  ),
  revokeCredential: (id: string) => api.delete(`/api/v1/identity/credentials/${encodeURIComponent(id)}`),

  webhooks: () => data<WebhookEndpoint[]>(api.get("/api/v1/developer/webhooks")),
  createWebhook: (input: { name: string; url: string; description?: string; events: string[] }) =>
    data<{ endpoint: WebhookEndpoint; signingSecret: string }>(api.post("/api/v1/developer/webhooks", input)),
  testWebhook: (id: string) => data<WebhookDelivery>(
    api.post(`/api/v1/developer/webhooks/${encodeURIComponent(id)}/test`),
  ),
  deleteWebhook: (id: string) => api.delete(`/api/v1/developer/webhooks/${encodeURIComponent(id)}`),
  deliveries: () => data<WebhookDelivery[]>(api.get("/api/v1/developer/webhook-deliveries", { params: { limit: 50 } })),
  replayDelivery: (id: string) => data<WebhookDelivery>(
    api.post(`/api/v1/developer/webhook-deliveries/${encodeURIComponent(id)}/replay`),
  ),

  marketplace: () => data<MarketplacePlugin[]>(api.get("/api/v1/developer/marketplace")),
  installations: () => data<PluginInstallation[]>(api.get("/api/v1/developer/plugin-installations")),
  installPlugin: (plugin: MarketplacePlugin) => {
    const version = plugin.versions.find((candidate) => candidate.releasedAt)?.version;
    if (!version) throw new Error("This plugin has no released version");
    return data<PluginInstallation>(api.post("/api/v1/developer/plugins/install", {
      pluginId: plugin.id,
      version,
      grantedPermissions: plugin.requiredPermissions,
    }));
  },
  setInstallationStatus: (id: string, status: "active" | "disabled" | "uninstalled") =>
    api.patch(`/api/v1/developer/plugin-installations/${encodeURIComponent(id)}`, { status }),
};
