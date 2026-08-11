import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { platformController } from './controller.js';
import { selectAccountsSchema, startOAuthSchema } from './validator.js';

const router = Router();

// Provider redirects cannot include NEXPULSE's in-memory access token. OAuth
// state binds this public callback to a short-lived server-side session.
router.get('/oauth/:provider/callback', asyncHandler(platformController.oauthCallback));
router.get('/providers', asyncHandler(platformController.getProviders));
router.get('/provider-status', asyncHandler(platformController.getProviderStatus));

router.use(requireAuth);

router.get('/connections', requirePermission('platform.read'), asyncHandler(platformController.getConnections));
router.get('/health', requirePermission('platform.read'), asyncHandler(platformController.getHealth));
router.post(
  '/oauth/:provider/start',
  requirePermission('platform.connect'),
  requireTrustedOrigin,
  validate(startOAuthSchema),
  asyncHandler(platformController.startOAuth),
);
router.get(
  '/oauth/sessions/:sessionId/accounts',
  requirePermission('platform.connect'),
  asyncHandler(platformController.getPendingAccounts),
);
router.post(
  '/oauth/sessions/:sessionId/select',
  requirePermission('platform.connect'),
  requireTrustedOrigin,
  validate(selectAccountsSchema),
  asyncHandler(platformController.saveSelection),
);
router.patch(
  '/connections/:connectionId/primary',
  requirePermission('platform.connect'),
  requireTrustedOrigin,
  asyncHandler(platformController.setPrimary),
);
router.delete(
  '/connections/:connectionId',
  requirePermission('platform.disconnect'),
  requireTrustedOrigin,
  asyncHandler(platformController.disconnect),
);

export { router as platformRoutes };
