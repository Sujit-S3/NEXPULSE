export const QUERY_KEYS = {
  dashboard: {
    all: ["dashboard"] as const,
    metrics: ["dashboard", "metrics"] as const,
    charts: ["dashboard", "charts"] as const,
    posts: ["dashboard", "posts"] as const,
    insights: ["dashboard", "insights"] as const,
    schedule: ["dashboard", "schedule"] as const,
    activity: ["dashboard", "activity"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    overview: ["analytics", "overview"] as const,
    audience: ["analytics", "audience"] as const,
    content: ["analytics", "content"] as const,
    platforms: ["analytics", "platforms"] as const,
    forecast: ["analytics", "forecast"] as const,
  },
  platforms: {
    all: ["platforms"] as const,
    connections: ["platforms", "connections"] as const,
    accounts: ["platforms", "accounts"] as const,
    profile: (platform: string, accountId: string) =>
      ["platforms", "profile", platform, accountId] as const,
    analytics: (platform: string, accountId: string) =>
      ["platforms", "analytics", platform, accountId] as const,
    posts: (platform: string, accountId: string) =>
      ["platforms", "posts", platform, accountId] as const,
    audience: (platform: string, accountId: string) =>
      ["platforms", "audience", platform, accountId] as const,
    growth: (platform: string, accountId: string) =>
      ["platforms", "growth", platform, accountId] as const,
    bestTimes: (platform: string, accountId: string) =>
      ["platforms", "bestTimes", platform, accountId] as const,
  },
  workspace: {
    all: ["workspace"] as const,
    current: ["workspace", "current"] as const,
  },
  ai: {
    all: ["ai"] as const,
    insights: ["ai", "insights"] as const,
    context: ["ai", "context"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unread: ["notifications", "unread"] as const,
  },
  settings: {
    all: ["settings"] as const,
  },
} as const;

export const DEFAULT_TIMEZONE = "UTC";
export const DEFAULT_LANGUAGE = "en";
