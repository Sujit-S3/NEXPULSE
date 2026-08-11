import { z } from 'zod';
import { AI_MODELS, AI_TOOLS, AI_MODULES } from './types.js';

const settingsSchema = z.object({
  model: z.enum(AI_MODELS).optional(),
  temperature: z.number().min(0).max(2).optional(),
  creativity: z.number().min(0).max(2).optional(),
  tone: z.string().max(80).optional(),
  responseLength: z.string().max(80).optional(),
  language: z.string().max(80).optional(),
  outputFormat: z.string().max(80).optional(),
});

export const aiChatSchema = z.object({
  connectionId: z.string().min(1),
  conversationId: z.string().optional(),
  message: z.string().min(1).max(16000),
  settings: settingsSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  tools: z.array(z.enum(AI_TOOLS)).optional(),
  module: z.enum(AI_MODULES).optional(),
});

export const aiStreamSchema = z.object({
  connectionId: z.string().min(1),
  conversationId: z.string().optional(),
  message: z.string().min(1).max(16000),
  settings: settingsSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  tools: z.array(z.enum(AI_TOOLS)).optional(),
});

export const aiConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const aiConversationParamsSchema = z.object({
  conversationId: z.string().min(1),
});

export const aiConversationUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.enum(AI_MODELS).optional(),
});

export const aiSettingsUpdateSchema = z.object({
  model: z.enum(AI_MODELS).optional(),
  temperature: z.number().min(0).max(2).optional(),
  creativity: z.number().min(0).max(2).optional(),
  tone: z.string().optional(),
  responseLength: z.string().optional(),
  language: z.string().optional(),
  outputFormat: z.string().optional(),
});

export const aiCreateConversationSchema = z.object({
  model: z.enum(AI_MODELS).optional(),
});

export const aiMemorySchema = z.object({
  key: z.string().min(1).max(500),
  value: z.string().min(1).max(10000),
  type: z.enum(['action', 'context', 'insight', 'response', 'pinned']),
  ttl: z.number().int().min(60).max(31536000).optional().default(86400),
});
