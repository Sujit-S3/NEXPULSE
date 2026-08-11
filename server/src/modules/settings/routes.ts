import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { settingsController } from './controller.js';
import { updateSettingsSchema } from './validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('settings.read'), asyncHandler(settingsController.get));
router.patch('/', requirePermission('settings.manage'), requireTrustedOrigin, validate(updateSettingsSchema), asyncHandler(settingsController.update));

export { router as settingsRoutes };
