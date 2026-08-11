import { v4 as uuid } from 'uuid';
import { config } from '../../config/env.js';
import { AppError, NotFoundError } from '../../errors/index.js';
import { conversationRepository, memoryRepository } from './repository.js';
import { getProvider } from './providerAdapter.js';
import { getPromptTemplate, buildSystemPrompt, buildUserPrompt } from './promptEngine.js';
import { getTool } from './toolRegistry.js';
import { getContextSummary } from './promptEngine.js';
import type {
  AICitation, AIRequest, AIResponse, AIStreamEventPayload,
  AISettings, AIModuleType, AIModelType, AIToolType, MemoryEntry,
} from './types.js';

const DEFAULT_SETTINGS: Omit<AISettings, 'model'> = {
  temperature: 0.7,
  creativity: 0.65,
  tone: 'Professional',
  responseLength: 'Balanced',
  language: 'English',
  outputFormat: 'markdown',
};

function defaultModel(): AIModelType {
  const requested = config.ai.defaultProvider;
  if (requested === 'openai' && config.ai.openaiApiKey) return 'gpt-4o';
  if (requested === 'anthropic' && config.ai.anthropicApiKey) return 'claude-3.5';
  if (requested === 'gemini' && config.ai.geminiApiKey) return 'gemini-2.0';
  if (requested !== 'auto') {
    throw new AppError(`The configured ${requested} AI provider has no API key.`, 503, 'AI_NOT_CONFIGURED');
  }
  if (config.ai.openaiApiKey) return 'gpt-4o';
  if (config.ai.anthropicApiKey) return 'claude-3.5';
  if (config.ai.geminiApiKey) return 'gemini-2.0';
  throw new AppError('No AI provider is configured.', 503, 'AI_NOT_CONFIGURED');
}

function modelConfigured(model: AIModelType): boolean {
  if (model === 'gpt-4o') return Boolean(config.ai.openaiApiKey);
  if (model === 'claude-3.5') return Boolean(config.ai.anthropicApiKey);
  return Boolean(config.ai.geminiApiKey);
}

function resolveSettings(
  requested: Partial<AISettings> | undefined,
  conversationModel?: AIModelType,
): AISettings {
  return {
    ...DEFAULT_SETTINGS,
    ...requested,
    model: requested?.model ?? conversationModel ?? defaultModel(),
  };
}

const activeStreams = new Map<string, { abort: () => void }>();

function citationsFor(req: AIRequest): AICitation[] {
  const connection = req.context.platforms.find((item) => item.id === req.connectionId)
    ?? req.context.platforms[0];
  const citations: AICitation[] = [];
  if (connection) {
    citations.push({
      id: `provider-${connection.id}`,
      title: connection.name,
      detail: `${connection.type} provider account · ${connection.status}`,
      kind: 'provider',
      path: '/platforms',
    });
  }
  citations.push({
    id: `analytics-${req.connectionId}`,
    title: `${req.context.timeRange} analytics`,
    detail: `${req.context.analytics.unavailable.length} unavailable fields are explicitly excluded`,
    kind: 'analytics',
    path: '/analytics',
  });
  if (req.context.recentPosts.length > 0) {
    citations.push({
      id: `content-${req.context.recentPosts[0]?.id ?? req.connectionId}`,
      title: 'Recent provider content',
      detail: `${req.context.recentPosts.length} synchronized posts were available to this answer`,
      kind: 'content',
      path: '/analytics',
    });
  }
  if (req.context.reports[0]) {
    citations.push({
      id: `report-${req.context.reports[0].id}`,
      title: req.context.reports[0].title,
      detail: `Persisted report · ${req.context.reports[0].status}`,
      kind: 'report',
      path: '/reports',
    });
  }
  return citations;
}

function followUpsFor(req: AIRequest): string[] {
  const suggestions = [
    'Compare this signal with the previous period',
    'Turn this analysis into an executive brief',
  ];
  if (req.context.recentPosts.length > 0) {
    suggestions.unshift('Show the content pattern behind this result');
  }
  if (req.context.analytics.unavailable.length > 0) {
    suggestions.push('Which provider fields are currently unavailable?');
  }
  return suggestions.slice(0, 3);
}

function toolsFor(message: string, requested: AIToolType[] | undefined): AIToolType[] {
  const allowed = new Set(requested ?? []);
  const candidates: AIToolType[] = [];
  const normalized = message.toLowerCase();
  if (/audience|demographic|country|device/.test(normalized)) candidates.push('analyze-audience');
  if (/hashtag/.test(normalized)) candidates.push('suggest-hashtags');
  if (/posting|best time|schedule/.test(normalized)) candidates.push('find-best-posting-time');
  if (/growth|forecast|project/.test(normalized)) candidates.push('predict-growth');
  if (/caption|copy|post idea/.test(normalized)) candidates.push('generate-caption');
  if (/report|brief|executive/.test(normalized)) candidates.push('generate-report');
  candidates.push('summarize-analytics');
  return [...new Set(candidates)].filter((tool) => allowed.size === 0 || allowed.has(tool)).slice(0, 2);
}

async function ownedConversation(req: AIRequest) {
  if (!req.conversationId) return null;
  if (req.userId) {
    return conversationRepository.findByIdAndOwner(
      req.conversationId,
      req.workspaceId ?? '',
      req.userId,
    );
  }
  return conversationRepository.findByIdAndWorkspace(req.conversationId, req.workspaceId ?? '');
}

export const aiService = {
  status() {
    const models = [
      { id: 'gpt-4o' as const, provider: 'OpenAI', label: 'GPT-4o', configured: modelConfigured('gpt-4o') },
      { id: 'claude-3.5' as const, provider: 'Anthropic', label: 'Claude 3.5', configured: modelConfigured('claude-3.5') },
      { id: 'gemini-2.0' as const, provider: 'Google', label: 'Gemini 2.0', configured: modelConfigured('gemini-2.0') },
    ];
    let defaultModelId: AIModelType | null = null;
    try {
      defaultModelId = defaultModel();
    } catch {
      defaultModelId = null;
    }
    return {
      enabled: config.features.ai,
      ready: config.features.ai && models.some((model) => model.configured),
      defaultModel: defaultModelId,
      models,
    };
  },

  async chat(req: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const conversation = await ownedConversation(req);
    const settings = resolveSettings(req.settings, conversation?.model);

    const provider = getProvider(settings.model);
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    const moduleType = req.message.match(/^(analyze|generate|create|plan|compare|forecast)/i)?.[0]?.toLowerCase();

    let usedTemplate = null;
    if (moduleType) {
      const moduleMap: Record<string, AIModuleType> = {
        analyze: 'competitor-analysis',
        generate: 'content-generator',
        create: 'content-generator',
        plan: 'campaign-planner',
        compare: 'competitor-analysis',
        forecast: 'growth-forecast',
      };
      const mappedModule = moduleMap[moduleType] ?? 'report-generator';
      usedTemplate = getPromptTemplate(mappedModule);
    }

    if (usedTemplate) {
      messages.push({ role: 'system', content: buildSystemPrompt(usedTemplate, req.context, settings) });
      messages.push({ role: 'user', content: buildUserPrompt(usedTemplate, req.context, req.message) });
    } else {
      const contextSummary = getContextSummary(req.context);
      messages.push({
        role: 'system',
        content: [
          `You are an AI social media analytics assistant for ${req.context.workspace.name}.`,
          `Current context: ${contextSummary}`,
          `Tone: ${settings.tone}. Language: ${settings.language}.`,
          `Respond in ${settings.outputFormat} format. Keep responses ${settings.responseLength.toLowerCase()}.`,
        ].join('\n'),
      });
      if (conversation?.messages) {
        for (const msg of conversation.messages.slice(-10)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
      messages.push({ role: 'user', content: req.message });
    }

    const toolDefs = req.tools?.map((t) => getTool(t)).filter((t): t is NonNullable<typeof t> => t != null) ?? [];
    const stream = provider.chat({
      messages,
      settings,
      tools: toolDefs.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: Object.fromEntries(
          Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }]),
        ),
      })),
    });

    let fullContent = '';
    const toolCalls: AIResponse['toolCalls'] = [];
    const thinkingSteps: AIResponse['thinking'] = [];

    for await (const event of stream) {
      switch (event.type) {
        case 'chunk':
          fullContent += event.content;
          break;
        case 'thinking':
          thinkingSteps.push({ step: event.step, content: event.content, duration: event.duration });
          break;
        case 'tool_call': {
          const toolDef = getTool(event.tool);
          if (toolDef) {
            const result = await toolDef.execute(event.args, req.context);
            toolCalls.push({ tool: event.tool, args: event.args, result });
          }
          break;
        }
        case 'error':
          throw new AppError(event.message, 503, event.code);
      }
    }

    const messageId = uuid();
    const citations = citationsFor(req);
    const followUps = followUpsFor(req);
    const usage = { tokens: Math.ceil(fullContent.length / 4), latency: Date.now() - startTime };
    const messageRecord = {
      id: messageId,
      role: 'assistant' as const,
      content: fullContent,
      timestamp: new Date(),
      toolCalls: toolCalls.length > 0 ? toolCalls.map((tc) => ({ tool: tc.tool, args: tc.args, result: tc.result })) : undefined,
      thinking: thinkingSteps.length > 0 ? thinkingSteps.map((ts) => ({ step: ts.step, content: ts.content })) : undefined,
      citations,
      followUps,
      usage,
      status: 'complete' as const,
    };

    if (conversation && req.conversationId) {
      await conversationRepository.addMessage(req.conversationId, {
        id: uuid(),
        role: 'user',
        content: req.message,
        timestamp: new Date(),
      });
      await conversationRepository.addMessage(req.conversationId, messageRecord);
      if (conversation.title === 'New Conversation' || conversation.messages.length <= 2) {
        const title = req.message.slice(0, 60) + (req.message.length > 60 ? '...' : '');
        await conversationRepository.updateTitle(req.conversationId, title);
      }
    }

    await memoryRepository.set({
      workspaceId: req.workspaceId ?? 'default',
      type: 'response',
      key: `last-response-${Date.now()}`,
      value: fullContent.slice(0, 500),
      metadata: { conversationId: req.conversationId, messageId },
      ttl: 86400,
    });

    return {
      conversationId: req.conversationId ?? '',
      messageId,
      content: fullContent,
      usage,
      toolCalls,
      thinking: thinkingSteps,
      citations,
      followUps,
    };
  },

  async *chatStream(req: AIRequest): AsyncGenerator<AIStreamEventPayload> {
    const startTime = Date.now();
    const conversation = await ownedConversation(req);
    if (!conversation || !req.conversationId) {
      throw new NotFoundError('Conversation not found');
    }
    const settings = resolveSettings(req.settings, conversation?.model);

    const provider = getProvider(settings.model);
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    const contextSummary = getContextSummary(req.context);
    messages.push({
      role: 'system',
      content: [
        `You are an AI social media analytics assistant for ${req.context.workspace.name}.`,
        `Current context: ${contextSummary}`,
        `Tone: ${settings.tone}. Language: ${settings.language}.`,
        `Respond in ${settings.outputFormat} format. Keep responses ${settings.responseLength.toLowerCase()}.`,
      ].join('\n'),
    });

    if (conversation?.messages) {
      for (const msg of conversation.messages.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: req.message });

    await conversationRepository.addMessage(req.conversationId, {
      id: uuid(),
      role: 'user',
      content: req.message,
      timestamp: new Date(),
      status: 'complete',
    });
    if (conversation.title === 'New Conversation' || conversation.messages.length <= 2) {
      const title = req.message.slice(0, 60) + (req.message.length > 60 ? '...' : '');
      await conversationRepository.updateTitle(req.conversationId, title);
    }

    const abortController = new AbortController();
    const streamId = req.conversationId;
    activeStreams.set(streamId, { abort: () => abortController.abort() });

    let fullContent = '';
    const toolCalls: AIResponse['toolCalls'] = [];
    const thinkingSteps: AIResponse['thinking'] = [];
    let streamFailed = false;

    try {
      const contextThinking = {
        type: 'thinking' as const,
        step: 'grounding',
        content: 'Grounding this command in synchronized provider data',
        duration: 0,
      };
      thinkingSteps.push(contextThinking);
      yield contextThinking;

      const selectedTools = toolsFor(req.message, req.tools);
      const verifiedToolOutputs: { tool: AIToolType; result: unknown }[] = [];
      for (const toolType of selectedTools) {
        const toolDef = getTool(toolType);
        if (!toolDef) continue;
        const callId = uuid();
        yield { type: 'tool_call', tool: toolType, args: {}, callId };
        const toolStart = Date.now();
        const result = await toolDef.execute({}, req.context);
        const duration = Date.now() - toolStart;
        toolCalls.push({ tool: toolType, args: {}, result });
        verifiedToolOutputs.push({ tool: toolType, result });
        yield { type: 'tool_result', tool: toolType, callId, result, duration };
      }

      if (verifiedToolOutputs.length > 0) {
        messages.splice(1, 0, {
          role: 'system',
          content: `Verified NEXPULSE tool output. Treat these values as authoritative and do not invent missing fields:\n${JSON.stringify(verifiedToolOutputs)}`,
        });
      }

      const synthesisThinking = {
        type: 'thinking' as const,
        step: 'synthesis',
        content: 'Synthesizing the verified signal into an actionable response',
        duration: Date.now() - startTime,
      };
      thinkingSteps.push(synthesisThinking);
      yield synthesisThinking;

      const toolDefs = selectedTools.map((t) => getTool(t)).filter((t): t is NonNullable<typeof t> => t != null);
      const stream = provider.chat({
        messages,
        settings,
        signal: abortController.signal,
        tools: toolDefs.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: Object.fromEntries(
            Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }]),
          ),
        })),
      });

      for await (const event of stream) {
        if (abortController.signal.aborted) break;

        switch (event.type) {
          case 'chunk':
            fullContent += event.content;
            yield event;
            break;
          case 'thinking':
            thinkingSteps.push({ step: event.step, content: event.content, duration: event.duration });
            yield event;
            break;
          case 'tool_call': {
            const toolDef = getTool(event.tool);
            if (toolDef) {
              const result = await toolDef.execute(event.args, req.context);
              toolCalls.push({ tool: event.tool, args: event.args, result });
              yield { ...event, type: 'tool_result', result, callId: event.callId, duration: 0 };
            }
            break;
          }
          case 'tool_result':
            yield event;
            break;
          case 'done':
            break;
          case 'error':
            streamFailed = true;
            yield event;
            break;
        }
      }

      const usage = { tokens: Math.ceil(fullContent.length / 4), latency: Date.now() - startTime };
      const citations = citationsFor(req);
      const followUps = followUpsFor(req);
      const messageId = uuid();

      if (fullContent.length > 0) {
        await conversationRepository.addMessage(req.conversationId, {
          id: messageId,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          thinking: thinkingSteps.map((item) => ({ step: item.step, content: item.content })),
          citations,
          followUps,
          usage,
          status: abortController.signal.aborted ? 'cancelled' : streamFailed ? 'error' : 'complete',
        });
      }

      if (!abortController.signal.aborted && !streamFailed) {
        yield {
          type: 'done',
          usage,
          conversationId: streamId,
          messageId,
          citations,
          followUps,
        };
      }
    } finally {
      activeStreams.delete(streamId);
    }
  },

  async abortStream(conversationId: string, workspaceId: string, userId: string): Promise<void> {
    const conversation = await conversationRepository.findByIdAndOwner(conversationId, workspaceId, userId);
    if (!conversation) throw new NotFoundError('Conversation not found');
    const stream = activeStreams.get(conversationId);
    if (stream) {
      stream.abort();
      activeStreams.delete(conversationId);
    }
  },

  async createConversation(workspaceId: string, userId: string, model?: AIModelType) {
    return conversationRepository.create({
      workspaceId,
      userId,
      model: model ?? defaultModel(),
    });
  },

  async getConversations(workspaceId: string, userId: string, page = 1, limit = 20) {
    return conversationRepository.findByOwner(workspaceId, userId, page, limit);
  },

  async getConversation(id: string, workspaceId: string, userId: string) {
    return conversationRepository.findByIdAndOwner(id, workspaceId, userId);
  },

  async deleteConversation(id: string, workspaceId: string, userId: string) {
    const conversation = await conversationRepository.findByIdAndOwner(id, workspaceId, userId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }
    await conversationRepository.deleteByOwner(id, workspaceId, userId);
  },

  async updateConversation(id: string, workspaceId: string, userId: string, data: { title?: string; model?: string }) {
    const conversation = await conversationRepository.updateByOwner(id, workspaceId, userId, data);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }
    return conversation;
  },

  async getMemories(workspaceId: string, type?: string) {
    return memoryRepository.findByWorkspace(workspaceId, type as MemoryEntry['type']);
  },

  async setMemory(workspaceId: string, key: string, value: string, type: string, ttl = 86400) {
    return memoryRepository.set({ workspaceId, key, value, type: type as MemoryEntry['type'], metadata: {}, ttl });
  },
};
