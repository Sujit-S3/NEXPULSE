import { Router } from 'express';
import { requireInteractiveSession, requirePermission } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { securityController } from './controller.js';
import { enforceZeroTrust } from './policyEngine.js';
import {
  containIncidentSchema,
  createDataAssetSchema,
  createIncidentSchema,
  createPolicySchema,
  createSecretSchema,
  dlpInspectionSchema,
  rotateSecretSchema,
  transitionIncidentSchema,
  updatePolicySchema,
  updateThreatSchema,
} from './validator.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/dashboard',
  requirePermission('security.dashboard.read'),
  enforceZeroTrust({ target: 'workspace', action: 'security.dashboard.read' }),
  asyncHandler(securityController.dashboard),
);

router.get(
  '/policies',
  requirePermission('security.policies.manage'),
  enforceZeroTrust({ target: 'access', action: 'security.policy.read' }),
  asyncHandler(securityController.policies),
);
router.post(
  '/policies',
  requirePermission('security.policies.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'access', action: 'security.policy.create' }),
  validate(createPolicySchema),
  asyncHandler(securityController.createPolicy),
);
router.patch(
  '/policies/:policyId',
  requirePermission('security.policies.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'access', action: 'security.policy.update' }),
  validate(updatePolicySchema),
  asyncHandler(securityController.updatePolicy),
);

router.get(
  '/secrets',
  requirePermission('security.secrets.manage'),
  enforceZeroTrust({ target: 'resource', action: 'security.secret.metadata.read' }),
  asyncHandler(securityController.secrets),
);
router.post(
  '/secrets',
  requirePermission('security.secrets.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'resource', action: 'security.secret.create' }),
  validate(createSecretSchema),
  asyncHandler(securityController.createSecret),
);
router.post(
  '/secrets/:secretId/rotate',
  requirePermission('security.secrets.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'resource', action: 'security.secret.rotate' }),
  validate(rotateSecretSchema),
  asyncHandler(securityController.rotateSecret),
);
router.delete(
  '/secrets/:secretId',
  requirePermission('security.secrets.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'resource', action: 'security.secret.revoke' }),
  asyncHandler(securityController.revokeSecret),
);

router.get(
  '/governance/assets',
  requirePermission('security.governance.manage'),
  enforceZeroTrust({ target: 'resource', action: 'governance.asset.read' }),
  asyncHandler(securityController.dataAssets),
);
router.post(
  '/governance/assets',
  requirePermission('security.governance.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'resource', action: 'governance.asset.create' }),
  validate(createDataAssetSchema),
  asyncHandler(securityController.createDataAsset),
);
router.post(
  '/governance/assets/:assetId/deletion',
  requirePermission('security.governance.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'resource', action: 'governance.asset.delete' }),
  asyncHandler(securityController.queueAssetDeletion),
);
router.post(
  '/dlp/inspect',
  requirePermission('security.governance.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'resource', action: 'security.dlp.inspect' }),
  validate(dlpInspectionSchema),
  securityController.inspectDlp,
);

router.get(
  '/compliance',
  requirePermission('security.compliance.read'),
  enforceZeroTrust({ target: 'organization', action: 'compliance.evidence.read' }),
  asyncHandler(securityController.compliance),
);
router.post(
  '/compliance/collect',
  requirePermission('security.compliance.read'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'organization', action: 'compliance.evidence.collect' }),
  asyncHandler(securityController.collectCompliance),
);

router.get(
  '/threats',
  requirePermission('security.threats.manage'),
  enforceZeroTrust({ target: 'workspace', action: 'security.threat.read' }),
  asyncHandler(securityController.threats),
);
router.post(
  '/threats/evaluate',
  requirePermission('security.threats.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'workspace', action: 'security.threat.evaluate' }),
  asyncHandler(securityController.evaluateThreats),
);
router.patch(
  '/threats/:signalId',
  requirePermission('security.threats.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'workspace', action: 'security.threat.update' }),
  validate(updateThreatSchema),
  asyncHandler(securityController.updateThreat),
);

router.get(
  '/incidents',
  requirePermission('security.incidents.manage'),
  enforceZeroTrust({ target: 'workspace', action: 'security.incident.read' }),
  asyncHandler(securityController.incidents),
);
router.post(
  '/incidents',
  requirePermission('security.incidents.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'workspace', action: 'security.incident.create' }),
  validate(createIncidentSchema),
  asyncHandler(securityController.createIncident),
);
router.patch(
  '/incidents/:incidentId',
  requirePermission('security.incidents.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'workspace', action: 'security.incident.transition' }),
  validate(transitionIncidentSchema),
  asyncHandler(securityController.transitionIncident),
);
router.post(
  '/incidents/:incidentId/contain',
  requirePermission('security.incidents.manage'),
  requireInteractiveSession,
  requireTrustedOrigin,
  enforceZeroTrust({ target: 'workspace', action: 'security.incident.contain' }),
  validate(containIncidentSchema),
  asyncHandler(securityController.containIncident),
);

export { router as securityRoutes };
