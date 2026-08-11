import { Router } from 'express';
import { requireInteractiveSession, requirePermission } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { tokenLimiter } from '../../middleware/rateLimiter.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { queueDashboard } from '../../jobs/index.js';
import { developerController } from './controller.js';
import {
  approvePluginSchema,
  authorizeSchema,
  createApplicationSchema,
  createWebhookSchema,
  installPluginSchema,
  pluginStatusSchema,
  quotaSchema,
  reviewPluginSchema,
  revokeTokenSchema,
  submitPluginSchema,
  tokenSchema,
  updateWebhookSchema,
} from './validator.js';

const oauthRouter = Router();
oauthRouter.get(
  '/authorize',
  requireAuth,
  requireInteractiveSession,
  asyncHandler(developerController.consent),
);
oauthRouter.post(
  '/authorize',
  requireAuth,
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(authorizeSchema),
  asyncHandler(developerController.authorize),
);
oauthRouter.post('/token', tokenLimiter, validate(tokenSchema), asyncHandler(developerController.token));
oauthRouter.post('/revoke', tokenLimiter, validate(revokeTokenSchema), asyncHandler(developerController.revokeToken));

const router = Router();
router.use(requireAuth);

router.use('/queues', requirePermission('operations.queues.manage'), queueDashboard);

router.get('/catalog', asyncHandler(developerController.lifecycle));

router.get('/applications', requirePermission('developer.applications.manage'), asyncHandler(developerController.applications));
router.post(
  '/applications',
  requirePermission('developer.applications.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(createApplicationSchema),
  asyncHandler(developerController.createApplication),
);
router.post(
  '/applications/:applicationId/rotate-secret',
  tokenLimiter,
  requirePermission('developer.applications.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  asyncHandler(developerController.rotateApplicationSecret),
);
router.delete(
  '/applications/:applicationId',
  requirePermission('developer.applications.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  asyncHandler(developerController.revokeApplication),
);

router.get('/webhooks', requirePermission('developer.webhooks.manage'), asyncHandler(developerController.webhooks));
router.post(
  '/webhooks',
  requirePermission('developer.webhooks.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(createWebhookSchema),
  asyncHandler(developerController.createWebhook),
);
router.patch(
  '/webhooks/:endpointId',
  requirePermission('developer.webhooks.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(updateWebhookSchema),
  asyncHandler(developerController.updateWebhook),
);
router.post(
  '/webhooks/:endpointId/rotate-secret',
  tokenLimiter,
  requirePermission('developer.webhooks.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  asyncHandler(developerController.rotateWebhookSecret),
);
router.post(
  '/webhooks/:endpointId/test',
  requirePermission('developer.webhooks.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  asyncHandler(developerController.testWebhook),
);
router.delete(
  '/webhooks/:endpointId',
  requirePermission('developer.webhooks.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  asyncHandler(developerController.deleteWebhook),
);
router.get(
  '/webhook-deliveries',
  requirePermission('developer.webhooks.manage'),
  asyncHandler(developerController.deliveries),
);
router.post(
  '/webhook-deliveries/:deliveryId/replay',
  requirePermission('developer.webhooks.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  asyncHandler(developerController.replayDelivery),
);

router.get('/marketplace', requirePermission('developer.plugins.manage'), asyncHandler(developerController.marketplace));
router.get('/plugins/submissions', requirePermission('developer.plugins.manage'), asyncHandler(developerController.pluginSubmissions));
router.post(
  '/plugins/submissions',
  requirePermission('developer.plugins.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(submitPluginSchema),
  asyncHandler(developerController.submitPlugin),
);
router.patch(
  '/plugins/:pluginId/approval',
  requirePermission('developer.plugins.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(approvePluginSchema),
  asyncHandler(developerController.approvePlugin),
);
router.post(
  '/plugins/install',
  requirePermission('developer.plugins.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(installPluginSchema),
  asyncHandler(developerController.installPlugin),
);
router.get('/plugin-installations', requirePermission('developer.plugins.manage'), asyncHandler(developerController.installations));
router.patch(
  '/plugin-installations/:installationId',
  requirePermission('developer.plugins.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(pluginStatusSchema),
  asyncHandler(developerController.updateInstallation),
);
router.put(
  '/plugins/:pluginId/review',
  requirePermission('developer.plugins.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(reviewPluginSchema),
  asyncHandler(developerController.reviewPlugin),
);

router.get('/usage', requirePermission('developer.analytics.read'), asyncHandler(developerController.usage));
router.get('/quota', requirePermission('developer.analytics.read'), asyncHandler(developerController.quota));
router.put(
  '/quota',
  requirePermission('developer.analytics.read'),
  requireInteractiveSession,
  requireTrustedOrigin,
  validate(quotaSchema),
  asyncHandler(developerController.updateQuota),
);

export { oauthRouter as developerOAuthRoutes, router as developerRoutes };
