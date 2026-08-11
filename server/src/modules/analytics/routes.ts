import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { analyticsController } from './controller.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('analytics.read'));
router.get('/', asyncHandler(analyticsController.get));
router.get('/audience', asyncHandler(analyticsController.getAudience));
router.get('/growth', asyncHandler(analyticsController.getGrowth));

export { router as analyticsRoutes };
