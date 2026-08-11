import { describe, expect, it } from 'vitest';
import {
  canAssignRole,
  effectivePermissions,
  permissionsForRole,
  ROLE_PERMISSIONS,
} from '../../src/modules/identity/permissions.js';

describe('enterprise identity role and permission matrix', () => {
  it('normalizes legacy roles without preserving their old authority model', () => {
    expect(permissionsForRole('owner')).toEqual(permissionsForRole('workspace_owner'));
    expect(permissionsForRole('admin')).toEqual(permissionsForRole('workspace_admin'));
  });

  it('keeps each human role at least as restrictive as the role above it', () => {
    const hierarchy = ['guest', 'viewer', 'analyst', 'manager', 'workspace_admin', 'workspace_owner'] as const;
    for (let index = 1; index < hierarchy.length; index += 1) {
      const lower = new Set(ROLE_PERMISSIONS[hierarchy[index - 1] as keyof typeof ROLE_PERMISSIONS]);
      const higher = new Set(ROLE_PERMISSIONS[hierarchy[index] as keyof typeof ROLE_PERMISSIONS]);
      expect([...lower].every((permission) => higher.has(permission))).toBe(true);
    }
  });

  it('prevents same-level and upward role assignment', () => {
    expect(canAssignRole('workspace_admin', 'manager')).toBe(true);
    expect(canAssignRole('workspace_admin', 'workspace_admin')).toBe(false);
    expect(canAssignRole('workspace_admin', 'workspace_owner')).toBe(false);
    expect(canAssignRole('manager', 'organization_owner')).toBe(false);
  });

  it('intersects personal access token scopes with the live role', () => {
    expect(effectivePermissions('analyst', ['analytics.read', 'billing.manage']))
      .toEqual(['analytics.read']);
  });

  it('lets every interactive role manage its own MFA and sessions', () => {
    for (const role of ['organization_owner', 'workspace_owner', 'workspace_admin', 'manager', 'editor', 'analyst', 'viewer', 'guest']) {
      expect(permissionsForRole(role)).toEqual(expect.arrayContaining([
        'identity.mfa.manage',
        'identity.sessions.manage',
      ]));
    }
  });
});
