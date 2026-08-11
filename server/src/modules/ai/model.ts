import mongoose, { Schema, Document } from 'mongoose';
import { AI_MODELS } from './types.js';
import type { AICitation, AIModelType } from './types.js';

export interface IConversation extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  aiModel: AIModelType;
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

const conversationSchema = new Schema<IConversation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Conversation' },
    aiModel: { type: String, enum: AI_MODELS, default: 'gpt-4o' },
    messages: [{
      id: { type: String, required: true },
      role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      toolCalls: [{ tool: String, args: Schema.Types.Mixed, result: Schema.Types.Mixed }],
      thinking: [{ step: String, content: String }],
      citations: [{
        id: String,
        title: String,
        detail: String,
        kind: { type: String, enum: ['provider', 'analytics', 'content', 'report'] },
        path: String,
      }],
      followUps: [{ type: String }],
      usage: {
        tokens: { type: Number, min: 0 },
        latency: { type: Number, min: 0 },
      },
      status: { type: String, enum: ['complete', 'cancelled', 'error'], default: 'complete' },
    }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

conversationSchema.index({ workspaceId: 1, updatedAt: -1 });
conversationSchema.index({ workspaceId: 1, userId: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export interface IMemory extends Document {
  workspaceId: mongoose.Types.ObjectId;
  type: 'action' | 'context' | 'insight' | 'response' | 'pinned';
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
}

const memorySchema = new Schema<IMemory>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    type: { type: String, enum: ['action', 'context', 'insight', 'response', 'pinned'], required: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ttl: { type: Number, default: 86400 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 86400000) },
  },
  { timestamps: true },
);

memorySchema.index({ workspaceId: 1, type: 1 });
memorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Memory = mongoose.model<IMemory>('Memory', memorySchema);
