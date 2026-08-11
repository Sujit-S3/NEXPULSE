import Anthropic from '@anthropic-ai/sdk';
import { registerProvider } from './providerAdapter.js';
import { config } from '../../config/env.js';
import { logger } from '../../logger/index.js';
import type { ProviderAdapter, AIProviderStreamEventPayload, ProviderChatOptions } from './types.js';

const PROVIDER_TIMEOUT = 30_000;
const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';

export const anthropicProvider: ProviderAdapter = {
  name: 'Anthropic',
  model: 'claude-3.5',

  async *chat(options: ProviderChatOptions): AsyncGenerator<AIProviderStreamEventPayload> {
    if (!config.ai.anthropicApiKey) {
      yield { type: 'error', code: 'CONFIGURATION_ERROR', message: 'Anthropic API key is not configured. Set ANTHROPIC_API_KEY environment variable.', recoverable: true };
      return;
    }

    const startTime = Date.now();
    const anthropic = new Anthropic({ apiKey: config.ai.anthropicApiKey });

    const systemPrompt = options.messages.find((m) => m.role === 'system')?.content ?? '';
    const conversationMessages = options.messages.filter((m) => m.role !== 'system');

    const anthropicMessages = conversationMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    if (anthropicMessages.length === 0 || anthropicMessages[0]?.role !== 'user') {
      anthropicMessages.unshift({ role: 'user', content: 'Continue' });
    }

    const timeoutSignal = AbortSignal.timeout(PROVIDER_TIMEOUT);
    const signals: AbortSignal[] = [timeoutSignal];
    if (options.signal) signals.push(options.signal);
    const combinedSignal = options.signal ? AbortSignal.any(signals) : timeoutSignal;

    try {
      const stream = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        system: systemPrompt || undefined,
        messages: anthropicMessages,
        max_tokens: 4096,
        temperature: options.settings.temperature,
        stream: true,
      }, { signal: combinedSignal });

      let fullText = '';
      let chunkIndex = 0;

      for await (const chunk of stream) {
        if (combinedSignal.aborted) break;

        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          const text = chunk.delta.text;
          if (text) {
            fullText += text;
            yield { type: 'chunk', content: text, index: chunkIndex++, timestamp: Date.now() };
          }
        }
      }

      const latency = Date.now() - startTime;
      logger.info('AI provider response', { provider: 'anthropic', latency, charCount: fullText.length });

      if (!combinedSignal.aborted) {
        yield {
          type: 'done',
          usage: { tokens: Math.ceil(fullText.length / 4), latency },
          conversationId: `anthropic-${Date.now()}`,
        };
      }
    } catch (error: unknown) {
      const err = error as Error;

      if (timeoutSignal.aborted || err.message?.includes('timed out')) {
        logger.warn('AI provider timeout', { provider: 'anthropic', latency: Date.now() - startTime });
        yield { type: 'error', code: 'TIMEOUT', message: 'Anthropic provider timed out. Please try again.', recoverable: true };
        return;
      }

      if (combinedSignal.aborted && err.name === 'AbortError') {
        yield { type: 'error', code: 'CANCELLED', message: 'Request was cancelled', recoverable: true };
        return;
      }

      logger.error('AI provider error', { provider: 'anthropic', error: err.message, latency: Date.now() - startTime });
      yield { type: 'error', code: 'PROVIDER_ERROR', message: 'An error occurred while processing your request.', recoverable: true };
    }
  },

  abort(): void {
    // No-op — cancellation handled via AbortSignal
  },
};

registerProvider(anthropicProvider);
