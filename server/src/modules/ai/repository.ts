import mongoose from 'mongoose';
import { Conversation, Memory } from './model.js';
import type { ConversationRecord, MemoryEntry } from './types.js';
import type { IConversation } from './model.js';

function toConversationRecord(doc: IConversation): ConversationRecord {
  return {
    id: doc._id.toString(),
    workspaceId: doc.workspaceId.toString(),
    userId: doc.userId.toString(),
    title: doc.title,
    model: doc.aiModel,
    messages: doc.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      toolCalls: m.toolCalls,
      thinking: m.thinking,
      citations: m.citations,
      followUps: m.followUps,
      usage: m.usage,
      status: m.status,
    })),
    metadata: doc.metadata,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const conversationRepository = {
  async create(data: {
    workspaceId: string;
    userId: string;
    title?: string;
    model?: string;
  }): Promise<ConversationRecord> {
    const doc = await Conversation.create({
      workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
      userId: new mongoose.Types.ObjectId(data.userId),
      title: data.title ?? 'New Conversation',
      aiModel: data.model ?? 'gpt-4o',
      messages: [],
      metadata: {},
    });
    return toConversationRecord(doc);
  },

  async findById(id: string): Promise<ConversationRecord | null> {
    const doc = await Conversation.findById(id);
    return doc ? toConversationRecord(doc) : null;
  },

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<ConversationRecord | null> {
    const doc = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    });
    return doc ? toConversationRecord(doc) : null;
  },

  async findByIdAndOwner(
    id: string,
    workspaceId: string,
    userId: string,
  ): Promise<ConversationRecord | null> {
    const doc = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return doc ? toConversationRecord(doc) : null;
  },

  async findByWorkspace(
    workspaceId: string,
    page = 1,
    limit = 20,
  ): Promise<{ conversations: ConversationRecord[]; total: number }> {
    const filter = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };
    const [docs, total] = await Promise.all([
      Conversation.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
      Conversation.countDocuments(filter),
    ]);
    return { conversations: docs.map(toConversationRecord), total };
  },

  async findByOwner(
    workspaceId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ conversations: ConversationRecord[]; total: number }> {
    const filter = {
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(userId),
    };
    const [docs, total] = await Promise.all([
      Conversation.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
      Conversation.countDocuments(filter),
    ]);
    return { conversations: docs.map(toConversationRecord), total };
  },

  async addMessage(
    conversationId: string,
    message: ConversationRecord['messages'][0],
  ): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      $push: { messages: message as Record<string, unknown> },
      $set: { updatedAt: new Date() },
    });
  },

  async updateTitle(conversationId: string, title: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, { title, updatedAt: new Date() });
  },

  async delete(conversationId: string): Promise<void> {
    await Conversation.findByIdAndDelete(conversationId);
  },

  async deleteByIdAndWorkspace(id: string, workspaceId: string): Promise<void> {
    await Conversation.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    });
  },

  async deleteByOwner(id: string, workspaceId: string, userId: string): Promise<void> {
    await Conversation.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  },

  async updateByIdAndWorkspace(
    id: string,
    workspaceId: string,
    data: { title?: string; model?: string },
  ): Promise<ConversationRecord | null> {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) update['title'] = data.title;
    if (data.model !== undefined) update['aiModel'] = data.model as string;
    const doc = await Conversation.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), workspaceId: new mongoose.Types.ObjectId(workspaceId) },
      { $set: update },
      { new: true },
    );
    return doc ? toConversationRecord(doc) : null;
  },

  async updateByOwner(
    id: string,
    workspaceId: string,
    userId: string,
    data: { title?: string; model?: string },
  ): Promise<ConversationRecord | null> {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) update['title'] = data.title;
    if (data.model !== undefined) update['aiModel'] = data.model;
    const doc = await Conversation.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: update },
      { new: true },
    );
    return doc ? toConversationRecord(doc) : null;
  },
};

export const memoryRepository = {
  async set(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'expiresAt'>): Promise<MemoryEntry> {
    const doc = await Memory.findOneAndUpdate(
      { workspaceId: new mongoose.Types.ObjectId(entry.workspaceId), key: entry.key },
      {
        $set: {
          type: entry.type,
          value: entry.value,
          metadata: entry.metadata,
          ttl: entry.ttl,
          expiresAt: new Date(Date.now() + entry.ttl * 1000),
        },
      },
      { upsert: true, new: true },
    );
    return {
      id: doc._id.toString(),
      workspaceId: doc.workspaceId.toString(),
      type: doc.type as MemoryEntry['type'],
      key: doc.key,
      value: doc.value,
      metadata: doc.metadata,
      ttl: doc.ttl,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
    };
  },

  async get(workspaceId: string, key: string): Promise<MemoryEntry | null> {
    const doc = await Memory.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      key,
      expiresAt: { $gt: new Date() },
    });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      workspaceId: doc.workspaceId.toString(),
      type: doc.type as MemoryEntry['type'],
      key: doc.key,
      value: doc.value,
      metadata: doc.metadata,
      ttl: doc.ttl,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
    };
  },

  async findByWorkspace(
    workspaceId: string,
    type?: MemoryEntry['type'],
  ): Promise<MemoryEntry[]> {
    const filter: Record<string, unknown> = {
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      expiresAt: { $gt: new Date() },
    };
    if (type) filter['type'] = type;
    const docs = await Memory.find(filter).sort({ createdAt: -1 }).limit(50);
    return docs.map((doc) => ({
      id: doc._id.toString(),
      workspaceId: doc.workspaceId.toString(),
      type: doc.type as MemoryEntry['type'],
      key: doc.key,
      value: doc.value,
      metadata: doc.metadata,
      ttl: doc.ttl,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
    }));
  },

  async delete(workspaceId: string, key: string): Promise<void> {
    await Memory.deleteOne({ workspaceId: new mongoose.Types.ObjectId(workspaceId), key });
  },

  async clearWorkspace(workspaceId: string): Promise<void> {
    await Memory.deleteMany({ workspaceId: new mongoose.Types.ObjectId(workspaceId) });
  },
};
