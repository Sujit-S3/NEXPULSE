import { Router } from 'express';
import { authController } from './controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { upload } from '../../middleware/upload.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  verifyMfaLoginSchema,
} from './validator.js';
import {
  authLimiter,
  otpLimiter,
  recoveryLimiter,
  tokenLimiter,
} from '../../middleware/rateLimiter.js';
import { requireTrustedOrigin } from '../../middleware/trustedOrigin.js';
import { requireInteractiveSession } from '../../middleware/authorize.js';

const router = Router();

router.post('/register', authLimiter, requireTrustedOrigin, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, requireTrustedOrigin, validate(loginSchema), asyncHandler(authController.login));
router.post('/mfa/verify', otpLimiter, requireTrustedOrigin, validate(verifyMfaLoginSchema), asyncHandler(authController.verifyMfaLogin));
router.post('/logout', requireTrustedOrigin, asyncHandler(authController.logout));
router.post('/refresh', tokenLimiter, requireTrustedOrigin, asyncHandler(authController.refresh));
router.post('/forgot-password', recoveryLimiter, requireTrustedOrigin, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', recoveryLimiter, requireTrustedOrigin, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post('/verify-email', otpLimiter, requireTrustedOrigin, validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
router.post('/resend-verification', recoveryLimiter, requireTrustedOrigin, validate(resendVerificationSchema), asyncHandler(authController.resendVerification));

router.get('/me', requireAuth, requireInteractiveSession, asyncHandler(authController.getMe));
router.patch('/profile', requireAuth, requireInteractiveSession, requireTrustedOrigin, validate(updateProfileSchema), asyncHandler(authController.updateProfile));
router.patch('/password', requireAuth, requireInteractiveSession, requireTrustedOrigin, validate(changePasswordSchema), asyncHandler(authController.changePassword));
router.post('/avatar', requireAuth, requireInteractiveSession, requireTrustedOrigin, upload.single('avatar'), asyncHandler(authController.uploadAvatar));

export { router as authRoutes };
