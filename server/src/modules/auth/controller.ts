import type { Request, Response } from 'express';
import { authService } from './service.js';
import { apiResponse } from '../../utils/apiResponse.js';
import {
  deviceCookieName,
  getCookieOptions,
  getDeviceCookieOptions,
  refreshCookieName,
} from '../../utils/jwt.js';
import { cloudinaryService } from '../../services/cloudinary/index.js';
import { identityRequestContext } from '../identity/requestContext.js';

function setSessionCookies(res: Response, result: { refreshToken: string; deviceId: string }, rememberMe: boolean) {
  res.cookie(refreshCookieName(), result.refreshToken, getCookieOptions(rememberMe));
  res.cookie(deviceCookieName(), result.deviceId, getDeviceCookieOptions());
}

function refreshToken(req: Request): string | undefined {
  return req.cookies?.[refreshCookieName()] ?? req.cookies?.['refreshToken'];
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body, identityRequestContext(req));
    setSessionCookies(res, result, true);
    res.status(201).json(apiResponse({ user: result.user, accessToken: result.accessToken }, 'Registration successful'));
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body, identityRequestContext(req));
    if ('mfaRequired' in result) {
      res.status(202).json(apiResponse(result, 'Multi-factor authentication required'));
      return;
    }
    setSessionCookies(res, result, req.body.rememberMe);

    res.status(200).json(
      apiResponse(
        { user: result.user, accessToken: result.accessToken },
        'Login successful',
      ),
    );
  },

  async verifyMfaLogin(req: Request, res: Response): Promise<void> {
    const result = await authService.verifyMfaLogin(req.body, identityRequestContext(req));
    setSessionCookies(res, result, true);
    res.status(200).json(apiResponse(
      { user: result.user, accessToken: result.accessToken },
      'Multi-factor authentication successful',
    ));
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(refreshToken(req));
    res.clearCookie(refreshCookieName(), { path: '/api/v1/auth' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.status(200).json(apiResponse(null, 'Logout successful'));
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshTokenValue = refreshToken(req);
    if (!refreshTokenValue) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'No refresh token provided' },
      });
      return;
    }

    const result = await authService.refresh(refreshTokenValue, identityRequestContext(req));
    setSessionCookies(res, result, true);

    res.status(200).json(
      apiResponse(
        { user: result.user, accessToken: result.accessToken },
        'Token refreshed',
      ),
    );
  },

  async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Not authenticated' } });
      return;
    }
    const user = await authService.getCurrentUser(userId);
    res.status(200).json(apiResponse(user));
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Not authenticated' } });
      return;
    }
    const user = await authService.updateProfile(userId, req.body);
    res.status(200).json(apiResponse(user, 'Profile updated'));
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Not authenticated' } });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(userId, currentPassword, newPassword, req.user?.sessionId);
    res.status(200).json(apiResponse(null, 'Password changed successfully'));
  },

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Not authenticated' } });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } });
      return;
    }

    const { buffer, originalname } = req.file;
    const result = await cloudinaryService.uploadBuffer(buffer, originalname, 'avatars');
    const user = await authService.updateProfile(userId, { avatar: result.url });
    res.status(200).json(apiResponse(user, 'Avatar uploaded successfully'));
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const result = await authService.forgotPassword(req.body.email, identityRequestContext(req));
    res.status(200).json(apiResponse(result));
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    await authService.resetPassword(req.body.token, req.body.password, identityRequestContext(req));
    res.status(200).json(apiResponse(null, 'Password has been reset successfully'));
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    await authService.verifyEmail(req.body.token, identityRequestContext(req));
    res.status(200).json(apiResponse(null, 'Email verified successfully'));
  },

  async resendVerification(req: Request, res: Response): Promise<void> {
    const result = await authService.resendVerification(req.body.email, identityRequestContext(req));
    res.status(200).json(apiResponse(result));
  },
};
