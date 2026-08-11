import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../errors/AuthorizationError.js';
import { config } from '../config/env.js';
import type { Permission } from '../modules/identity/permissions.js';
import { recordSecurityEvent } from '../modules/identity/securityEvents.js';

const featureForPermission: Partial<Record<Permission, keyof typeof config.features>> = {
  'ai.use': 'ai',
  'analytics.read': 'analytics',
  'analytics.export': 'analytics',
  'platform.read': 'platformSync',
  'platform.connect': 'platformSync',
  'platform.disconnect': 'platformSync',
};

export function requirePermission(...required: Permission[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AuthorizationError('Authentication required'));
    const denied = required.find((permission) => !req.user?.permissions.includes(permission));
    const disabled = required.find((permission) => {
      const feature = featureForPermission[permission];
      return feature ? !config.features[feature] : false;
    });
    if (!denied && !disabled) return next();

    try {
      await recordSecurityEvent({
        workspaceId: req.user.workspaceId,
        organizationId: req.user.organizationId,
        userId: req.user.actorType === 'user' ? req.user.id : undefined,
        actorType: req.user.actorType,
        actorId: req.user.id,
        sessionId: req.user.sessionId,
        type: disabled ? 'authorization.feature_disabled' : 'authorization.permission_denied',
        outcome: 'denied',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
        metadata: { required, denied, disabled },
      });
    } catch {
      // Authorization remains denied even when audit persistence is unavailable.
    }
    next(new AuthorizationError(disabled ? 'Feature is disabled' : `Missing permission: ${denied}`));
  };
}

export function requireInteractiveSession(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.actorType === 'user' && req.user.sessionId) return next();
  next(new AuthorizationError('An interactive user session is required'));
}

export function requireWorkspaceScope(
  resolveWorkspaceId: (req: Request) => string | undefined,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const requestedWorkspaceId = resolveWorkspaceId(req);
    if (
      req.user && requestedWorkspaceId &&
      (req.user.workspaceId === requestedWorkspaceId || req.user.role === 'super_admin')
    ) return next();
    next(new AuthorizationError('Resource is outside the active workspace'));
  };
}

export function requireOrganizationScope(
  resolveOrganizationId: (req: Request) => string | undefined,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const requestedOrganizationId = resolveOrganizationId(req);
    if (
      req.user && requestedOrganizationId &&
      (req.user.organizationId === requestedOrganizationId || req.user.role === 'super_admin')
    ) return next();
    next(new AuthorizationError('Resource is outside the active organization'));
  };
}

export function requireOwnership(
  resolveOwnerId: (req: Request) => string | undefined | Promise<string | undefined>,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AuthorizationError('Authentication required'));
    const ownerId = await resolveOwnerId(req);
    if (ownerId && (ownerId === req.user.id || req.user.role === 'super_admin')) return next();
    next(new AuthorizationError('Resource ownership is required'));
  };
}
