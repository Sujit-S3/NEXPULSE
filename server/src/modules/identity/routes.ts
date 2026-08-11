import { Router } from 'express';
import { requireInteractiveSession, requirePermission } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { invitationLimiter, otpLimiter, tokenLimiter } from '../../middleware/rateLimiter.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { identityController } from './controller.js';
import {
  confirmTotpSchema,
  createCredentialSchema,
  createInvitationSchema,
  createServiceAccountSchema,
  disableMfaSchema,
  invitationResponseSchema,
  passwordConfirmationSchema,
  recoveryCodeSchema,
  updateIdentityPolicySchema,
  updateMemberRoleSchema,
} from './validator.js';

const router = Router();
router.use(requireAuth);

router.get('/info', asyncHandler(identityController.info));
router.post('/invitations/respond', invitationLimiter, requireInteractiveSession, requireTrustedOrigin, validate(invitationResponseSchema), asyncHandler(identityController.respondInvitation));

router.get('/sessions', requirePermission('identity.sessions.manage'), requireInteractiveSession, asyncHandler(identityController.sessions));
router.delete('/sessions/:sessionId', requirePermission('identity.sessions.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.revokeSession));
router.post('/sessions/revoke-others', requirePermission('identity.sessions.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.revokeOtherSessions));

router.get('/mfa', requirePermission('identity.mfa.manage'), requireInteractiveSession, asyncHandler(identityController.mfaStatus));
router.post('/mfa/totp/setup', otpLimiter, requirePermission('identity.mfa.manage'), requireInteractiveSession, requireTrustedOrigin, validate(passwordConfirmationSchema), asyncHandler(identityController.beginTotp));
router.post('/mfa/totp/confirm', otpLimiter, requirePermission('identity.mfa.manage'), requireInteractiveSession, requireTrustedOrigin, validate(confirmTotpSchema), asyncHandler(identityController.confirmTotp));
router.post('/mfa/email/enable', otpLimiter, requirePermission('identity.mfa.manage'), requireInteractiveSession, requireTrustedOrigin, validate(passwordConfirmationSchema), asyncHandler(identityController.enableEmailOtp));
router.post('/mfa/recovery/regenerate', otpLimiter, requirePermission('identity.mfa.manage'), requireInteractiveSession, requireTrustedOrigin, validate(recoveryCodeSchema), asyncHandler(identityController.regenerateRecoveryCodes));
router.delete('/mfa/trusted-devices/:deviceId', requirePermission('identity.mfa.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.removeTrustedDevice));
router.delete('/mfa', otpLimiter, requirePermission('identity.mfa.manage'), requireInteractiveSession, requireTrustedOrigin, validate(disableMfaSchema), asyncHandler(identityController.disableMfa));

router.get('/credentials', requirePermission('identity.api_keys.manage'), requireInteractiveSession, asyncHandler(identityController.credentials));
router.post('/credentials', tokenLimiter, requirePermission('identity.api_keys.manage'), requireInteractiveSession, requireTrustedOrigin, validate(createCredentialSchema), asyncHandler(identityController.createCredential));
router.post('/credentials/:credentialId/rotate', tokenLimiter, requirePermission('identity.api_keys.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.rotateCredential));
router.delete('/credentials/:credentialId', requirePermission('identity.api_keys.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.revokeCredential));

router.get('/service-accounts', requirePermission('identity.service_accounts.manage'), requireInteractiveSession, asyncHandler(identityController.serviceAccounts));
router.post('/service-accounts', tokenLimiter, requirePermission('identity.service_accounts.manage'), requireInteractiveSession, requireTrustedOrigin, validate(createServiceAccountSchema), asyncHandler(identityController.createServiceAccount));
router.post('/service-accounts/:serviceAccountId/rotate', tokenLimiter, requirePermission('identity.service_accounts.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.rotateServiceToken));
router.delete('/service-accounts/:serviceAccountId', requirePermission('identity.service_accounts.manage'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.disableServiceAccount));

router.get('/invitations', requirePermission('team.read'), asyncHandler(identityController.invitations));
router.get('/members', requirePermission('team.read'), asyncHandler(identityController.members));
router.patch('/members/:memberId/role', requirePermission('team.manage'), requireInteractiveSession, requireTrustedOrigin, validate(updateMemberRoleSchema), asyncHandler(identityController.updateMemberRole));
router.delete('/members/:memberId', requirePermission('team.remove'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.removeMember));
router.post('/invitations', invitationLimiter, requirePermission('team.invite'), requireInteractiveSession, requireTrustedOrigin, validate(createInvitationSchema), asyncHandler(identityController.createInvitation));
router.post('/invitations/:invitationId/resend', invitationLimiter, requirePermission('team.invite'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.resendInvitation));
router.delete('/invitations/:invitationId', requirePermission('team.invite'), requireInteractiveSession, requireTrustedOrigin, asyncHandler(identityController.revokeInvitation));

router.get('/security-events', requireInteractiveSession, asyncHandler(identityController.mySecurityEvents));
router.get('/audit', requirePermission('identity.audit.read'), asyncHandler(identityController.workspaceAudit));
router.get('/policies', requirePermission('settings.read'), asyncHandler(identityController.policies));
router.patch('/policies', requirePermission('settings.manage'), requireInteractiveSession, requireTrustedOrigin, validate(updateIdentityPolicySchema), asyncHandler(identityController.updatePolicies));
router.get('/sso/readiness', requirePermission('settings.read'), asyncHandler(identityController.ssoReadiness));

export { router as identityRoutes };
