import { logger } from '../../logger/index.js';
import { securityEventRepository } from './repository.js';

const forbiddenMetadataKeys = /token|secret|password|code|authorization|cookie/i;

function sanitizeMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !forbiddenMetadataKeys.test(key))
      .map(([key, value]) => {
        if (typeof value === 'string') return [key, value.slice(0, 500)];
        if (typeof value === 'number' || typeof value === 'boolean' || value === null) return [key, value];
        return [key, JSON.stringify(value).slice(0, 500)];
      }),
  );
}

export async function recordSecurityEvent(input: {
  workspaceId?: string;
  organizationId?: string;
  userId?: string;
  actorType: 'user' | 'service_account' | 'system' | 'anonymous';
  actorId?: string;
  sessionId?: string;
  type: string;
  outcome: 'success' | 'failure' | 'denied';
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await securityEventRepository.create({
      ...input,
      metadata: sanitizeMetadata(input.metadata),
    });
  } catch (error) {
    logger.error('Security event persistence failed', {
      eventType: input.type,
      outcome: input.outcome,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
