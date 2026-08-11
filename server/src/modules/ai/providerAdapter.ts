import type { ProviderAdapter, AIModelType, ProviderChatOptions } from './types.js';

const registeredProviders = new Map<AIModelType, ProviderAdapter>();

export function registerProvider(adapter: ProviderAdapter): void {
  registeredProviders.set(adapter.model, adapter);
}

export function getProvider(model: AIModelType): ProviderAdapter {
  const provider = registeredProviders.get(model);
  if (!provider) {
    throw new Error(`No provider registered for model: ${model}`);
  }
  return provider;
}

export function getAvailableModels(): AIModelType[] {
  return Array.from(registeredProviders.keys());
}

export { type ProviderAdapter, type ProviderChatOptions };
