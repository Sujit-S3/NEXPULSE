import { Router } from 'express';
import { requireInteractiveSession, requirePermission } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { apiLimiter, billingLimiter, webhookLimiter } from '../../middleware/rateLimiter.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { billingController } from './controller.js';
import {
  cancelSubscriptionSchema,
  confirmSubscriptionSchema,
  createSubscriptionSchema,
} from './validator.js';

const router = Router();

router.get('/plans', apiLimiter, billingController.plans);
router.post('/webhook', webhookLimiter, asyncHandler(billingController.webhook));

router.use(requireAuth);
router.use(requirePermission('billing.manage'));
router.use(requireInteractiveSession);
router.get('/subscription', asyncHandler(billingController.current));
router.post(
  '/subscriptions',
  billingLimiter,
  requireTrustedOrigin,
  validate(createSubscriptionSchema),
  asyncHandler(billingController.create),
);
router.post(
  '/subscriptions/confirm',
  billingLimiter,
  requireTrustedOrigin,
  validate(confirmSubscriptionSchema),
  asyncHandler(billingController.confirm),
);
router.post(
  '/subscription/cancel',
  billingLimiter,
  requireTrustedOrigin,
  validate(cancelSubscriptionSchema),
  asyncHandler(billingController.cancel),
);

export { router as billingRoutes };
