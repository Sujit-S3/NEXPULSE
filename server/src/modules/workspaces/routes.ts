import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireInteractiveSession, requirePermission } from '../../middleware/authorize.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { workspaceController } from './controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('workspace.read'), asyncHandler(workspaceController.list));
router.get('/current', requirePermission('workspace.read'), asyncHandler(workspaceController.current));
router.post('/:workspaceId/switch', requirePermission('workspace.switch'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(workspaceController.switch));

export { router as workspaceRoutes };
