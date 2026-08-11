import { Router } from 'express';
import { requirePermission } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { reportController } from './controller.js';
import { createReportSchema } from './validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('reports.read'), asyncHandler(reportController.list));
router.post(
  '/',
  requirePermission('reports.generate'),
  validate(createReportSchema),
  asyncHandler(reportController.create),
);
router.get('/:reportId/export', requirePermission('reports.read', 'analytics.export'), asyncHandler(reportController.export));

export { router as reportRoutes };
