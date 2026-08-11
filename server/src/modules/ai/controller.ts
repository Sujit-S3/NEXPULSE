import type { Request, Response } from 'express';
import { NotFoundError } from '../../errors/index.js';
import { AppError } from '../../errors/AppError.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { logger } from '../../logger/index.js';
import { aiService } from './aiService.js';
import { buildAIContext } from './contextService.js';
import type { AIRequest } from './types.js';

function getUser(req: Request) {
  if (!req.user) throw new Error('User not authenticated');
  return req.user;
}

async function requestPayload(req: Request): Promise<AIRequest> {
  const currentUser = getUser(req);
  return {
    connectionId: req.body.connectionId,
    conversationId: req.body.conversationId,
    message: req.body.message,
    settings: req.body.settings,
    tools: req.body.tools,
    workspaceId: currentUser.workspaceId,
    userId: currentUser.id,
    context: await buildAIContext({
      workspaceId: currentUser.workspaceId,
      userId: currentUser.id,
      role: currentUser.role,
      connectionId: req.body.connectionId,
      from: req.body.from,
      to: req.body.to,
    }),
  };
}

export const aiController = {
  async status(_req: Request, res: Response): Promise<void> {
    res.status(200).json(apiResponse(aiService.status()));
  },

  async chat(req: Request, res: Response): Promise<void> {
    const result = await aiService.chat(await requestPayload(req));
    res.status(200).json(apiResponse(result));
  },

  async chatStream(req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const stream = aiService.chatStream(await requestPayload(req));
      for await (const event of stream) {
        if (res.destroyed) {
          const current = getUser(req);
          await aiService.abortStream(
            req.body.conversationId ?? '',
            current.workspaceId,
            current.id,
          );
          break;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      const err = error as Error;
      const safeMessage = err instanceof AppError && err.isOperational
        ? err.message
        : 'An unexpected error occurred';
      if (!(err instanceof AppError) || !err.isOperational) {
        logger.error('AI stream error', { error: err.message, stack: err.stack, requestId: req.id });
      }
      res.write(`data: ${JSON.stringify({ type: 'error', message: safeMessage })}\n\n`);
      res.end();
    }
  },

  async abortStream(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'] as string;
    if (!conversationId) throw new NotFoundError('Conversation not found');
    const current = getUser(req);
    await aiService.abortStream(conversationId, current.workspaceId, current.id);
    res.status(200).json(apiResponse(null, 'Stream aborted'));
  },

  async createConversation(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const conversation = await aiService.createConversation(user.workspaceId, user.id, req.body.model);
    res.status(201).json(apiResponse(conversation, 'Conversation created'));
  },

  async getConversations(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const current = getUser(req);
    const result = await aiService.getConversations(current.workspaceId, current.id, page, limit);
    res.status(200).json(apiResponse(result));
  },

  async getConversation(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'] as string;
    if (!conversationId) throw new NotFoundError('Conversation not found');
    const current = getUser(req);
    const conversation = await aiService.getConversation(conversationId, current.workspaceId, current.id);
    if (!conversation) throw new NotFoundError('Conversation not found');
    res.status(200).json(apiResponse(conversation));
  },

  async updateConversation(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'] as string;
    if (!conversationId) throw new NotFoundError('Conversation not found');
    const current = getUser(req);
    const conversation = await aiService.updateConversation(
      conversationId,
      current.workspaceId,
      current.id,
      req.body,
    );
    res.status(200).json(apiResponse(conversation, 'Conversation updated'));
  },

  async deleteConversation(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'] as string;
    if (!conversationId) throw new NotFoundError('Conversation not found');
    const current = getUser(req);
    await aiService.deleteConversation(conversationId, current.workspaceId, current.id);
    res.status(200).json(apiResponse(null, 'Conversation deleted'));
  },

  async getMemories(req: Request, res: Response): Promise<void> {
    const type = req.query['type'] as string | undefined;
    const memories = await aiService.getMemories(getUser(req).workspaceId, type);
    res.status(200).json(apiResponse(memories));
  },

  async setMemory(req: Request, res: Response): Promise<void> {
    const memory = await aiService.setMemory(
      getUser(req).workspaceId,
      req.body.key,
      req.body.value,
      req.body.type,
      req.body.ttl,
    );
    res.status(201).json(apiResponse(memory, 'Memory saved'));
  },
};
