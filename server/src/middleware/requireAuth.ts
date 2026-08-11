import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AuthenticationError } from '../errors/AuthenticationError.js';
import type { JwtPayload } from '../modules/auth/types.js';
import { identityRequestContext } from '../modules/identity/requestContext.js';
import { identitySessionService } from '../modules/identity/sessionService.js';
import { recordSecurityEvent } from '../modules/identity/securityEvents.js';
import { developerOAuthService } from '../modules/developer/oauthService.js';
import { enforceGatewayQuotas } from '../modules/developer/usageService.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const context = identityRequestContext(req);
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const candidate = typeof apiKeyHeader === 'string'
      ? apiKeyHeader
      : authHeader?.startsWith('ApiKey ')
        ? authHeader.slice(7)
        : authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : undefined;
    if (!candidate) throw new AuthenticationError('No authentication credential provided');

    req.user = candidate.startsWith('nxo_')
      ? await developerOAuthService.authenticateAccessToken(candidate, context)
      : candidate.startsWith('nx')
        ? await identitySessionService.authenticateCredential(candidate, context)
        : await identitySessionService.authenticate(verifyAccessToken(candidate) as JwtPayload, context);
  } catch (error) {
    try {
      await recordSecurityEvent({
        actorType: 'anonymous',
        type: 'authentication.denied',
        outcome: 'denied',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        metadata: { reason: error instanceof Error ? error.message : 'Unknown authentication failure' },
      });
    } catch {
      // Preserve the authentication failure when audit storage is unavailable.
    }
    next(error instanceof AuthenticationError ? error : new AuthenticationError('Invalid or expired credential'));
    return;
  }
  try {
    await enforceGatewayQuotas(req, res);
    next();
  } catch (error) {
    next(error);
  }
}
