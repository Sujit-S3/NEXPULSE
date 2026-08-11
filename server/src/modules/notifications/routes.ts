import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notificationController } from './controller.js';

const router = Router();
router.use(requireAuth);
router.get('/stream', requirePermission('notifications.read'), asyncHandler(notificationController.stream));
router.get('/', requirePermission('notifications.read'), asyncHandler(notificationController.list));
router.patch('/read-all', requirePermission('notifications.manage'), asyncHandler(notificationController.markAllRead));
router.patch('/:notificationId/read', requirePermission('notifications.manage'), asyncHandler(notificationController.markRead));
router.patch('/:notificationId/archive', requirePermission('notifications.manage'), asyncHandler(notificationController.archive));

export { router as notificationRoutes };
