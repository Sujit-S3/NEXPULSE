export interface Workspace {
  id: string;
  name: string;
  slug: string;
  members: number;
  plan: "free" | "starter" | "professional" | "enterprise";
  logo?: string;
  settings?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  type:
    | "sync"
    | "connection"
    | "alert"
    | "insight"
    | "report"
    | "system"
    | "mention"
    | "approval"
    | "task"
    | "health";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable?: boolean;
  actionLabel?: string;
  actionPath?: string;
  archived?: boolean;
}

export interface NotificationStreamEvent {
  kind: "created" | "updated";
  notification?: Notification;
}

export interface MetricPoint {
  date: string;
  followers?: number;
  following?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  views?: number;
  posts?: number;
}

export interface ProviderPost {
  id: string;
  content?: string;
  publishedAt?: string;
  url?: string;
  thumbnail?: string;
  metrics: {
    reach?: number;
    impressions?: number;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    engagement?: number;
  };
}

export interface NormalizedMetrics {
  followers: number | null;
  following: number | null;
  reach: number | null;
  impressions: number | null;
  posts: number | null;
  engagement: number | null;
  engagementRate: number | null;
  views: number | null;
}

export interface NormalizedAnalyticsData {
  connectionId: string;
  workspaceId: string;
  provider: string;
  providerAccountId: string;
  displayName: string;
  collectedAt: string;
  range: { from: string; to: string };
  metrics: NormalizedMetrics;
  history: MetricPoint[];
  posts: ProviderPost[];
  audience: {
    countries?: { name: string; value: number }[];
    cities?: { name: string; value: number }[];
    age?: { name: string; value: number }[];
    gender?: { name: string; value: number }[];
    languages?: { name: string; value: number }[];
  } | null;
  unavailable: string[];
  nextCursor?: string;
}

export interface RealDashboardData {
  connectionId: string;
  provider: string;
  providerAccountId: string;
  displayName: string;
  collectedAt: string;
  metrics: NormalizedMetrics;
  history: MetricPoint[];
  recentPosts: ProviderPost[];
  unavailable: string[];
}

export interface ReportRecord {
  id: string;
  connectionId: string;
  title: string;
  provider: string;
  providerAccountId: string;
  range: { from: string; to: string };
  collectedAt: string;
  metrics: NormalizedMetrics;
  unavailable: string[];
  status: "ready" | "failed";
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  unread: number;
  meta: { page: number; limit: number; total: number; hasNext: boolean; hasPrevious: boolean };
}

export interface SettingsData {
  theme: "dark" | "light" | "system";
  notifications: boolean;
  timezone: string;
  language: string;
  emailReports: boolean;
  digestFrequency: "daily" | "weekly" | "monthly";
  autoSync: boolean;
  syncInterval: number;
  workspace: WorkspacePersonalization;
}

export interface WorkspacePersonalization {
  density: "compact" | "comfortable" | "spacious";
  accentColor: "blue" | "cyan" | "green" | "orange";
  motionIntensity: "reduced" | "balanced" | "full";
  glassTransparency: number;
  sidebarWidth: number;
  dashboardWidgetOrder: string[];
  presets: WorkspacePreset[];
}

export interface WorkspacePreset extends Omit<WorkspacePersonalization, "presets"> {
  id: string;
  name: string;
  createdAt: string;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
}

export { type PlatformConnection, type PlatformType } from "../../../types";
