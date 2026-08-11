import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { dashboardController } from './controller.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('analytics.read'));
router.get('/', asyncHandler(dashboardController.get));

export { router as dashboardRoutes };
