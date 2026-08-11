export const AI_MODULES = [
  'content-generator', 'campaign-planner', 'competitor-analysis', 'audience-insights',
  'hashtag-generator', 'trend-analysis', 'growth-forecast', 'report-generator',
  'content-calendar', 'brand-voice',
] as const;
export type AIModuleType = typeof AI_MODULES[number];

export const AI_TOOLS = [
  'generate-report', 'analyze-platform', 'analyze-audience', 'generate-caption',
  'suggest-hashtags', 'predict-growth', 'find-best-posting-time', 'summarize-analytics',
] as const;
export type AIToolType = typeof AI_TOOLS[number];

export const AI_MODELS = ['gpt-4o', 'claude-3.5', 'gemini-2.0'] as const;
export type AIModelType = typeof AI_MODELS[number];

export type AIStreamEvent = 'chunk' | 'tool_call' | 'tool_result' | 'thinking' | 'done' | 'error';

export interface AICitation {
  id: string;
  title: string;
  detail: string;
  kind: 'provider' | 'analytics' | 'content' | 'report';
  path: string;
}

export interface AIStreamChunk {
  type: 'chunk';
  content: string;
  index: number;
  timestamp: number;
}

export interface AIStreamThinking {
  type: 'thinking';
  content: string;
  step: string;
  duration: number;
}

export interface AIStreamToolCall {
  type: 'tool_call';
  tool: AIToolType;
  args: Record<string, unknown>;
  callId: string;
}

export interface AIStreamToolResult {
  type: 'tool_result';
  tool: AIToolType;
  callId: string;
  result: unknown;
  duration: number;
}

export interface AIStreamDone {
  type: 'done';
  usage: { tokens: number; latency: number };
  conversationId: string;
  messageId: string;
  citations: AICitation[];
  followUps: string[];
}

export interface AIStreamError {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}

export type AIStreamEventPayload = AIStreamChunk | AIStreamThinking | AIStreamToolCall | AIStreamToolResult | AIStreamDone | AIStreamError;
export type AIProviderStreamEventPayload =
  | Exclude<AIStreamEventPayload, AIStreamDone>
  | Pick<AIStreamDone, 'type' | 'usage' | 'conversationId'>;

export interface AIRequest {
  workspaceId?: string;
  userId?: string;
  connectionId: string;
  conversationId?: string;
  message: string;
  context: AIContextInput;
  settings?: Partial<AISettings>;
  tools?: AIToolType[];
}

export interface AIResponse {
  conversationId: string;
  messageId: string;
  content: string;
  usage: { tokens: number; latency: number };
  toolCalls: { tool: AIToolType; args: Record<string, unknown>; result: unknown }[];
  thinking: { step: string; content: string; duration: number }[];
  citations: AICitation[];
  followUps: string[];
}

export interface AIContextInput {
  workspace: { id: string; name: string; plan: string };
  platforms: { id: string; name: string; type: string; status: string }[];
  analytics: {
    followers: number | null;
    engagement: number | null;
    reach: number | null;
    growth: number | null;
    impressions: number | null;
    views: number | null;
    timeRange: string;
    history: { date: string; followers?: number; reach?: number; impressions?: number; engagement?: number; views?: number }[];
    unavailable: string[];
  };
  audience: {
    topCountries: string[];
    ageGroups: { group: string; pct: number }[];
    topDevices: string[];
    activeHours: string[];
  };
  recentPosts: { id: string; platform: string; content: string; engagement: number | null; date: string; url?: string }[];
  reports: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    range: { from: string; to: string };
    metrics: Record<string, number | null>;
    unavailable: string[];
  }[];
  campaign?: { name: string; status: string };
  user: { role: string; preferences: { tone?: string; language?: string } };
  timeRange: string;
}

export interface AISettings {
  model: AIModelType;
  temperature: number;
  creativity: number;
  tone: string;
  responseLength: string;
  language: string;
  outputFormat: string;
}

export interface PromptTemplate {
  id: string;
  module: AIModuleType;
  name: string;
  description: string;
  systemPrompt: string;
  userTemplate: string;
  temperature: number;
  maxTokens: number;
}

export interface ConversationRecord {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  model: AIModelType;
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    toolCalls?: { tool: string; args: Record<string, unknown>; result: unknown }[];
    thinking?: { step: string; content: string }[];
    citations?: AICitation[];
    followUps?: string[];
    usage?: { tokens: number; latency: number };
    status?: 'complete' | 'cancelled' | 'error';
  }[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryEntry {
  id: string;
  workspaceId: string;
  type: 'action' | 'context' | 'insight' | 'response' | 'pinned';
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface ToolDefinition {
  type: AIToolType;
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute(args: Record<string, unknown>, context: AIContextInput): Promise<unknown>;
}

export interface ProviderAdapter {
  readonly name: string;
  readonly model: AIModelType;
  chat(options: ProviderChatOptions): AsyncGenerator<AIProviderStreamEventPayload>;
  abort(): void;
}

export interface ProviderChatOptions {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  settings: AISettings;
  tools?: { name: string; description: string; parameters: Record<string, unknown> }[];
  onStream?: (chunk: string) => void;
  signal?: AbortSignal;
}
