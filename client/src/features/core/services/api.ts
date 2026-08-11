import api, { authorizedFetch } from "../../../lib/axios";
import type {
  ApiResponse,
  OAuthAccountSelectionSession,
  OAuthProvider,
  OAuthProviderStatus,
  PlatformConnection,
  ProviderHealth,
  PlatformType,
} from "../../../types";
import type {
  Notification,
  NotificationList,
  NotificationStreamEvent,
  NormalizedAnalyticsData,
  RealDashboardData,
  ReportRecord,
  SettingsData,
  Workspace,
} from "../types";

export async function readEventStream<T>(
  body: ReadableStream<Uint8Array>,
  onData: (event: T) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        onData(JSON.parse(data) as T);
      }
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
}

function analyticsParams(input: {
  connectionId: string;
  from: Date;
  to: Date;
  forceRefresh?: boolean;
  cursor?: string;
  limit?: number;
}) {
  return {
    connectionId: input.connectionId,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    refresh: input.forceRefresh ? "true" : "false",
    cursor: input.cursor,
    limit: input.limit,
  };
}

export const dashboardApi = {
  async getDashboard(input: {
    connectionId: string;
    from: Date;
    to: Date;
    forceRefresh?: boolean;
  }): Promise<RealDashboardData> {
    const response = await api.get<ApiResponse<RealDashboardData>>("/api/v1/dashboard", {
      params: analyticsParams(input),
    });
    return response.data.data;
  },
};

export const analyticsApi = {
  async getAnalytics(input: {
    connectionId: string;
    from: Date;
    to: Date;
    forceRefresh?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<NormalizedAnalyticsData> {
    const response = await api.get<ApiResponse<NormalizedAnalyticsData>>("/api/v1/analytics", {
      params: analyticsParams(input),
    });
    return response.data.data;
  },
};

export const platformApi = {
  async getProviders(): Promise<OAuthProvider[]> {
    const response = await api.get<ApiResponse<OAuthProvider[]>>("/api/v1/platforms/providers");
    return response.data.data;
  },

  async getProviderStatus(): Promise<OAuthProviderStatus[]> {
    const response = await api.get<ApiResponse<OAuthProviderStatus[]>>("/api/v1/platforms/provider-status");
    return response.data.data;
  },

  async getConnections(): Promise<PlatformConnection[]> {
    const response = await api.get<ApiResponse<PlatformConnection[]>>("/api/v1/platforms/connections");
    return response.data.data;
  },

  async getHealth(): Promise<ProviderHealth[]> {
    const response = await api.get<ApiResponse<ProviderHealth[]>>("/api/v1/platforms/health");
    return response.data.data;
  },

  async startOAuth(
    provider: PlatformType,
    options?: { returnTo?: "/platforms" | "/settings"; forceConsent?: boolean },
  ): Promise<{ authorizationUrl: string }> {
    const response = await api.post<ApiResponse<{ authorizationUrl: string }>>(
      `/api/v1/platforms/oauth/${provider}/start`,
      { returnTo: options?.returnTo ?? "/platforms", forceConsent: options?.forceConsent ?? false },
    );
    return response.data.data;
  },

  async getPendingAccounts(sessionId: string): Promise<OAuthAccountSelectionSession> {
    const response = await api.get<ApiResponse<OAuthAccountSelectionSession>>(
      `/api/v1/platforms/oauth/sessions/${encodeURIComponent(sessionId)}/accounts`,
    );
    return response.data.data;
  },

  async selectAccounts(
    sessionId: string,
    selection: { accountIds: string[]; primaryAccountId: string },
  ): Promise<PlatformConnection[]> {
    const response = await api.post<ApiResponse<PlatformConnection[]>>(
      `/api/v1/platforms/oauth/sessions/${encodeURIComponent(sessionId)}/select`,
      selection,
    );
    return response.data.data;
  },

  async setPrimary(connectionId: string): Promise<PlatformConnection> {
    const response = await api.patch<ApiResponse<PlatformConnection>>(
      `/api/v1/platforms/connections/${encodeURIComponent(connectionId)}/primary`,
    );
    return response.data.data;
  },

  async disconnect(connectionId: string): Promise<void> {
    await api.delete(`/api/v1/platforms/connections/${encodeURIComponent(connectionId)}`);
  },
};

export const workspaceApi = {
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await api.get<ApiResponse<Workspace[]>>("/api/v1/workspaces");
    return response.data.data;
  },

  async getCurrent(): Promise<Workspace> {
    const response = await api.get<ApiResponse<Workspace>>("/api/v1/workspaces/current");
    return response.data.data;
  },

  async switchWorkspace(workspaceId: string): Promise<{ workspace: Workspace; accessToken: string }> {
    const response = await api.post<ApiResponse<{ workspace: Workspace; accessToken: string }>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/switch`,
    );
    return response.data.data;
  },
};

export const notificationApi = {
  async getNotifications(input: {
    status?: "all" | "read" | "unread" | "archived";
    type?: Notification["type"];
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<NotificationList> {
    const response = await api.get<ApiResponse<NotificationList>>("/api/v1/notifications", { params: input });
    return response.data.data;
  },

  async markRead(id: string): Promise<Notification> {
    const response = await api.patch<ApiResponse<Notification>>(
      `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    );
    return response.data.data;
  },

  async markAllRead(): Promise<void> {
    await api.patch("/api/v1/notifications/read-all");
  },

  async archive(id: string): Promise<Notification> {
    const response = await api.patch<ApiResponse<Notification>>(
      `/api/v1/notifications/${encodeURIComponent(id)}/archive`,
    );
    return response.data.data;
  },

  async stream(
    onEvent: (event: NotificationStreamEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await authorizedFetch("/api/v1/notifications/stream", { signal });
    if (!response.ok) throw new Error(`Notification stream failed with status ${response.status}`);
    if (!response.body) throw new Error("Notification streaming is unavailable in this browser.");
    await readEventStream<NotificationStreamEvent | { connected: true }>(response.body, (parsed) => {
      if ("kind" in parsed) onEvent(parsed);
    });
  },
};

export const settingsApi = {
  async getSettings(): Promise<SettingsData> {
    const response = await api.get<ApiResponse<SettingsData>>("/api/v1/settings");
    return response.data.data;
  },

  async updateSettings(settings: Partial<SettingsData>): Promise<SettingsData> {
    const response = await api.patch<ApiResponse<SettingsData>>("/api/v1/settings", settings);
    return response.data.data;
  },
};

export const reportApi = {
  async list(connectionId: string): Promise<{ items: ReportRecord[]; meta: NotificationList["meta"] }> {
    const response = await api.get<ApiResponse<{ items: ReportRecord[]; meta: NotificationList["meta"] }>>(
      "/api/v1/reports",
      { params: { connectionId } },
    );
    return response.data.data;
  },

  async create(input: { connectionId: string; title: string; from: Date; to: Date }): Promise<ReportRecord> {
    const response = await api.post<ApiResponse<ReportRecord>>("/api/v1/reports", {
      ...input,
      from: input.from.toISOString(),
      to: input.to.toISOString(),
    });
    return response.data.data;
  },

  async export(reportId: string, format: "csv" | "pdf"): Promise<Blob> {
    const response = await api.get(`/api/v1/reports/${encodeURIComponent(reportId)}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data as Blob;
  },
};

export interface AIConversation {
  id: string;
  title: string;
  model: "gpt-4o" | "claude-3.5" | "gemini-2.0";
  messages: AIConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AICitation {
  id: string;
  title: string;
  detail: string;
  kind: "provider" | "analytics" | "content" | "report";
  path: string;
}

export interface AIConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCalls?: { tool: string; args: Record<string, unknown>; result: unknown }[];
  thinking?: { step: string; content: string }[];
  citations?: AICitation[];
  followUps?: string[];
  usage?: { tokens: number; latency: number };
  status?: "complete" | "cancelled" | "error";
}

export type AIStreamEvent =
  | { type: "chunk"; content: string; index: number; timestamp: number }
  | { type: "thinking"; content: string; step: string; duration: number }
  | { type: "tool_call"; tool: string; args: Record<string, unknown>; callId: string }
  | { type: "tool_result"; tool: string; callId: string; result: unknown; duration: number }
  | {
      type: "done";
      usage: { tokens: number; latency: number };
      conversationId: string;
      messageId: string;
      citations: AICitation[];
      followUps: string[];
    }
  | { type: "error"; code?: string; message: string; recoverable?: boolean };

export interface AIStatus {
  enabled: boolean;
  ready: boolean;
  defaultModel: AIConversation["model"] | null;
  models: {
    id: AIConversation["model"];
    provider: string;
    label: string;
    configured: boolean;
  }[];
}

export const aiApi = {
  async status(): Promise<AIStatus> {
    const response = await api.get<ApiResponse<AIStatus>>("/api/v1/ai/status");
    return response.data.data;
  },

  async conversations(): Promise<{ conversations: AIConversation[]; total: number }> {
    const response = await api.get<ApiResponse<{ conversations: AIConversation[]; total: number }>>(
      "/api/v1/ai/conversations",
    );
    return response.data.data;
  },

  async createConversation(model?: AIConversation["model"]): Promise<AIConversation> {
    const response = await api.post<ApiResponse<AIConversation>>("/api/v1/ai/conversations", { model });
    return response.data.data;
  },

  async sendMessage(input: {
    connectionId: string;
    conversationId: string;
    message: string;
    model?: AIConversation["model"];
  }): Promise<{ conversationId: string; messageId: string; content: string }> {
    const response = await api.post<ApiResponse<{ conversationId: string; messageId: string; content: string }>>(
      "/api/v1/ai/chat",
      {
        connectionId: input.connectionId,
        conversationId: input.conversationId,
        message: input.message,
        settings: input.model ? { model: input.model } : undefined,
      },
    );
    return response.data.data;
  },

  async streamMessage(
    input: {
      connectionId: string;
      conversationId: string;
      message: string;
      model?: AIConversation["model"];
    },
    onEvent: (event: AIStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await authorizedFetch("/api/v1/ai/stream", {
      method: "POST",
      signal,
      body: JSON.stringify({
        connectionId: input.connectionId,
        conversationId: input.conversationId,
        message: input.message,
        settings: input.model ? { model: input.model } : undefined,
        tools: [
          "generate-report",
          "analyze-platform",
          "analyze-audience",
          "generate-caption",
          "suggest-hashtags",
          "predict-growth",
          "find-best-posting-time",
          "summarize-analytics",
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI stream failed with status ${response.status}`);
    if (!response.body) throw new Error("AI streaming is unavailable in this browser.");

      await readEventStream<AIStreamEvent>(response.body, onEvent);
  },

  async abortStream(conversationId: string): Promise<void> {
    await api.post(`/api/v1/ai/stream/${encodeURIComponent(conversationId)}/abort`);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/api/v1/ai/conversations/${encodeURIComponent(conversationId)}`);
  },
};
