import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import { aiController } from './controller.js';
import './geminiProvider.js';
import './openaiProvider.js';
import './anthropicProvider.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  aiChatSchema,
  aiStreamSchema,
  aiCreateConversationSchema,
  aiConversationUpdateSchema,
  aiConversationsQuerySchema,
  aiConversationParamsSchema,
  aiMemorySchema,
} from './validator.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission('ai.use'));

router.get('/status', asyncHandler(aiController.status));
router.post('/chat', validate(aiChatSchema), asyncHandler(aiController.chat));
router.post('/stream', validate(aiStreamSchema), asyncHandler(aiController.chatStream));
router.post('/stream/:conversationId/abort', validateParams(aiConversationParamsSchema), asyncHandler(aiController.abortStream));
router.post('/conversations', validate(aiCreateConversationSchema), asyncHandler(aiController.createConversation));
router.get('/conversations', validateQuery(aiConversationsQuerySchema), asyncHandler(aiController.getConversations));
router.get('/conversations/:conversationId', validateParams(aiConversationParamsSchema), asyncHandler(aiController.getConversation));
router.patch('/conversations/:conversationId', validateParams(aiConversationParamsSchema), validate(aiConversationUpdateSchema), asyncHandler(aiController.updateConversation));
router.delete('/conversations/:conversationId', validateParams(aiConversationParamsSchema), asyncHandler(aiController.deleteConversation));
router.get('/memory', asyncHandler(aiController.getMemories));
router.post('/memory', validate(aiMemorySchema), asyncHandler(aiController.setMemory));

export { router as aiRoutes };
